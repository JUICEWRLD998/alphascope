/**
 * services/birdeye.ts
 *
 * Production-ready Birdeye API service layer.
 *
 * Design decisions:
 * ─────────────────
 * • All fetches run **server-side only** — the API key is never exposed to
 *   the browser.
 * • Next.js `fetch` caching (`next.revalidate` + `next.tags`) is used as the
 *   primary rate-limit defence. Birdeye enforces per-second and per-minute
 *   quotas; by serving cached responses we drastically reduce call volume.
 * • An in-memory rate-limiter enforces a minimum gap between outgoing
 *   requests within a single server process, acting as a second safety layer.
 * • Each public function is fully typed end-to-end — no `any`.
 * • Errors are always returned as `ApiResponse.success = false` so callers
 *   never need try/catch.
 */

import type {
  ApiResponse,
  BirdeyeToken,
  BirdeyeTrendingToken,
  BirdeyeTrendingResponse,
  BirdeyeNewListing,
  BirdeyeNewListingResponse,
  BirdeyeTokenSecurity,
} from '@/lib/types';
import { BIRDEYE_BASE_URL } from '@/lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum milliseconds between outgoing Birdeye requests within this process.
 * Free tier: ~1 req/s. Pro tier: raise this to 0.
 */
const RATE_LIMIT_MS = 150;
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - elapsed),
    );
  }
  lastRequestTime = Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// Error helpers
// ─────────────────────────────────────────────────────────────────────────────

type BirdeyeErrorCode =
  | 'MISSING_API_KEY'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR';

interface ServiceError {
  code: BirdeyeErrorCode;
  message: string;
  statusCode?: number;
}

function makeError(code: BirdeyeErrorCode, message: string, statusCode?: number): ServiceError {
  return { code, message, statusCode };
}

function errorResponse<T>(err: ServiceError): ApiResponse<T> {
  return {
    data: null as unknown as T,
    success: false,
    error: `[${err.code}] ${err.message}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

interface FetchOptions {
  /** Chain identifier passed in the x-chain header */
  chain?: string;
  /** Seconds until the Next.js data cache considers this stale (ISR) */
  revalidate?: number;
  /** Cache tags for on-demand revalidation via revalidateTag() */
  tags?: string[];
  /** Extra URL query parameters */
  params?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function birdeyeFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const apiKey = process.env.BIRDEYE_API_KEY;

  if (!apiKey) {
    return errorResponse<T>(
      makeError('MISSING_API_KEY', 'Add BIRDEYE_API_KEY to your .env.local file.'),
    );
  }

  const {
    chain = 'solana',
    revalidate = 30,
    tags = [],
    params = {},
  } = options;

  const url = new URL(`${BIRDEYE_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  await rateLimit();

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'X-API-KEY': apiKey,
        'x-chain': chain,
      },
      next: {
        revalidate,
        tags: ['birdeye', ...tags],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return errorResponse<T>(makeError('NETWORK_ERROR', message));
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }

    const code: BirdeyeErrorCode =
      res.status === 429 ? 'RATE_LIMITED' :
      res.status === 401 ? 'UNAUTHORIZED' :
      res.status === 404 ? 'NOT_FOUND' :
      'SERVER_ERROR';

    return errorResponse<T>(
      makeError(code, body || res.statusText, res.status),
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JSON parse error';
    return errorResponse<T>(makeError('PARSE_ERROR', message));
  }

  // Birdeye wraps all responses in { success, data }
  const envelope = json as { success: boolean; data: T };
  if (!envelope.success) {
    return errorResponse<T>(makeError('SERVER_ERROR', 'Birdeye reported success: false'));
  }

  return { data: envelope.data, success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — function signatures match the step-2 spec exactly
// ─────────────────────────────────────────────────────────────────────────────

export interface GetNewListingsOptions {
  chain?: string;
  /** Time window: '30m' | '1h' | '2h' | '6h' | '24h' */
  window?: '30m' | '1h' | '2h' | '6h' | '24h';
  limit?: number;
}

/**
 * Fetch tokens that have been newly listed on DEXes within the given window.
 * Endpoint: /defi/v2/tokens/new_listing
 * Cache: revalidates every 15 s (new tokens move fast).
 */
export async function getNewListings(
  options: GetNewListingsOptions = {},
): Promise<ApiResponse<BirdeyeNewListingResponse>> {
  const { chain = 'solana', window = '6h', limit = 20 } = options;

  return birdeyeFetch<BirdeyeNewListingResponse>('/defi/v2/tokens/new_listing', {
    chain,
    revalidate: 15,
    tags: [`new-listings-${chain}`],
    params: {
      sort_by: 'liquidity_added_at',
      sort_type: 'desc',
      type: window,
      limit: String(Math.min(limit, 50)),
    },
  });
}

export interface GetTrendingTokensOptions {
  chain?: string;
  limit?: number;
}

/**
 * Fetch the top trending tokens by volume and rank.
 * Endpoint: /defi/token_trending
 * Cache: revalidates every 30 s.
 */
export async function getTrendingTokens(
  options: GetTrendingTokensOptions = {},
): Promise<ApiResponse<BirdeyeTrendingResponse>> {
  const { chain = 'solana', limit = 20 } = options;

  return birdeyeFetch<BirdeyeTrendingResponse>('/defi/token_trending', {
    chain,
    revalidate: 30,
    tags: [`trending-${chain}`],
    params: {
      sort_by: 'rank',
      sort_type: 'asc',
      offset: '0',
      limit: String(Math.min(limit, 50)),
    },
  });
}

export interface GetTokenOverviewOptions {
  chain?: string;
}

/**
 * Fetch price, volume, market cap, and holder data for a single token.
 * Endpoint: /defi/token_overview
 * Cache: revalidates every 60 s (price changes frequently but not sub-minute).
 */
export async function getTokenOverview(
  address: string,
  options: GetTokenOverviewOptions = {},
): Promise<ApiResponse<BirdeyeToken>> {
  const { chain = 'solana' } = options;

  return birdeyeFetch<BirdeyeToken>('/defi/token_overview', {
    chain,
    revalidate: 60,
    tags: [`token-${address}`],
    params: { address },
  });
}

export interface GetTokenSecurityOptions {
  chain?: string;
}

/**
 * Fetch security flags for a token: mutable metadata, freeze authority,
 * LP burn status, concentration of top holders, and Token-2022 transfer fees.
 * Endpoint: /defi/token_security
 * Cache: revalidates every 5 min — security posture rarely changes rapidly.
 */
export async function getTokenSecurity(
  address: string,
  options: GetTokenSecurityOptions = {},
): Promise<ApiResponse<BirdeyeTokenSecurity>> {
  const { chain = 'solana' } = options;

  return birdeyeFetch<BirdeyeTokenSecurity>('/defi/token_security', {
    chain,
    revalidate: 300,
    tags: [`token-security-${address}`],
    params: { address },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache invalidation helpers (call from API routes or server actions)
// ─────────────────────────────────────────────────────────────────────────────

import { revalidateTag } from 'next/cache';

/**
 * Purge all cached data for a specific token address.
 * Call from a Server Action or Route Handler after user-triggered refreshes.
 *
 * Usage:
 *   import { invalidateToken } from '@/services/birdeye';
 *   invalidateToken('So111...');
 */
export function invalidateToken(address: string): void {
  // Empty object satisfies the CacheLifeConfig (Next.js 16) without setting expiry.
  revalidateTag(`token-${address}`, {});
  revalidateTag(`token-security-${address}`, {});
}

export function invalidateTrending(chain = 'solana'): void {
  revalidateTag(`trending-${chain}`, {});
  revalidateTag(`new-listings-${chain}`, {});
}
