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

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeTrendingToken(token: BirdeyeTrendingToken): BirdeyeTrendingToken {
  return {
    address: normalizeString(token.address),
    symbol: normalizeString(token.symbol, 'N/A'),
    name: normalizeString(token.name, 'Unknown Token'),
    decimals: normalizeNumber(token.decimals),
    logoURI: normalizeString(token.logoURI),
    rank: normalizeNumber(token.rank),
    price: normalizeNumber(token.price),
    priceChange24hPercent: normalizeNumber(token.priceChange24hPercent),
    v24hUSD: normalizeNumber(token.v24hUSD),
    v24hChangePercent: normalizeNumber(token.v24hChangePercent),
    mc: normalizeNumber(token.mc),
    liquidity: normalizeNumber(token.liquidity),
    holder: normalizeNumber(token.holder),
    lastTradeUnixTime: normalizeNumber(token.lastTradeUnixTime),
  };
}

function normalizeNewListing(item: BirdeyeNewListing): BirdeyeNewListing {
  return {
    address: normalizeString(item.address),
    symbol: normalizeString(item.symbol, 'N/A'),
    name: normalizeString(item.name, 'Unknown Token'),
    decimals: normalizeNumber(item.decimals),
    logoURI: normalizeString(item.logoURI),
    liquidityAddedAt: normalizeNumber(item.liquidityAddedAt),
    price: normalizeNumber(item.price),
    liquidity: normalizeNumber(item.liquidity),
    v24hUSD: normalizeNumber(item.v24hUSD),
    mc: normalizeNumber(item.mc),
  };
}

function normalizeTokenOverview(token: BirdeyeToken): BirdeyeToken {
  return {
    address: normalizeString(token.address),
    symbol: normalizeString(token.symbol, 'N/A'),
    name: normalizeString(token.name, 'Unknown Token'),
    decimals: normalizeNumber(token.decimals),
    logoURI: normalizeString(token.logoURI),
    price: normalizeNumber(token.price),
    priceChange24hPercent: normalizeNumber(token.priceChange24hPercent),
    v24hUSD: normalizeNumber(token.v24hUSD),
    v24hChangePercent: normalizeNumber(token.v24hChangePercent),
    mc: normalizeNumber(token.mc),
    liquidity: normalizeNumber(token.liquidity),
    holder: normalizeNumber(token.holder),
    lastTradeUnixTime: normalizeNumber(token.lastTradeUnixTime),
    supply: normalizeNumber(token.supply),
    circulatingSupply: normalizeNumber(token.circulatingSupply),
    realMc: normalizeNumber(token.realMc),
  };
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

  const result = await birdeyeFetch<BirdeyeNewListingResponse>('/defi/v2/tokens/new_listing', {
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

  if (!result.success || !result.data) return result;

  return {
    success: true,
    data: {
      total: normalizeNumber(result.data.total),
      items: Array.isArray(result.data.items)
        ? result.data.items.map(normalizeNewListing)
        : [],
    },
  };
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

  const result = await birdeyeFetch<BirdeyeTrendingResponse>('/defi/token_trending', {
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

  if (!result.success || !result.data) return result;

  return {
    success: true,
    data: {
      updateUnixTime: normalizeNumber(result.data.updateUnixTime),
      updateTime: normalizeString(result.data.updateTime),
      total: normalizeNumber(result.data.total),
      tokens: Array.isArray(result.data.tokens)
        ? result.data.tokens.map(normalizeTrendingToken)
        : [],
    },
  };
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

  const result = await birdeyeFetch<BirdeyeToken>('/defi/token_overview', {
    chain,
    revalidate: 60,
    tags: [`token-${address}`],
    params: { address },
  });

  if (!result.success || !result.data) return result;

  return {
    success: true,
    data: normalizeTokenOverview(result.data),
  };
}

export interface GetTokenSecurityOptions {
  chain?: string;
}

/**
 * Normalise the raw Birdeye security response.
 *
 * Birdeye may return either:
 *   • mintable: boolean | null          (newer API)
 *   • mintAuthority: address | null     (older API — address present = active)
 * Same pattern for freezeable / freezeAuthority and burnedLp / lpLockedPct.
 */
function normalizeTokenSecurity(raw: Record<string, unknown>): BirdeyeTokenSecurity {
  // ── mintable ────────────────────────────────────────────────────────────────
  let mintable: boolean | null = null;
  if (typeof raw.mintable === 'boolean') {
    mintable = raw.mintable;
  } else if ('mintAuthority' in raw) {
    mintable = raw.mintAuthority !== null && raw.mintAuthority !== undefined;
  }

  // ── freezeable ──────────────────────────────────────────────────────────────
  let freezeable: boolean | null = null;
  if (typeof raw.freezeable === 'boolean') {
    freezeable = raw.freezeable;
  } else if ('freezeAuthority' in raw) {
    freezeable = raw.freezeAuthority !== null && raw.freezeAuthority !== undefined;
  }

  // ── burnedLp ────────────────────────────────────────────────────────────────
  let burnedLp: boolean | null = null;
  if (typeof raw.burnedLp === 'boolean') {
    burnedLp = raw.burnedLp;
  } else if (typeof raw.lpLockedPct === 'number') {
    burnedLp = raw.lpLockedPct >= 0.95;
  }

  return {
    address: String(raw.address ?? ''),
    symbol: String(raw.symbol ?? ''),
    ownerAddress: (raw.ownerAddress as string | null) ?? null,
    creatorAddress: (raw.creatorAddress as string | null) ?? null,
    creationTx: (raw.creationTx as string | null) ?? null,
    creationTime: typeof raw.creationTime === 'number' ? raw.creationTime : null,
    top10HolderPercent: typeof raw.top10HolderPercent === 'number' ? raw.top10HolderPercent : null,
    top10UserPercent: typeof raw.top10UserPercent === 'number' ? raw.top10UserPercent : null,
    isMutable: typeof raw.isMutable === 'boolean' ? raw.isMutable : null,
    mintable,
    freezeable,
    burnedLp,
    transferFeeEnable: typeof raw.transferFeeEnable === 'boolean' ? raw.transferFeeEnable : null,
    transferFeeData: (raw.transferFeeData as BirdeyeTokenSecurity['transferFeeData']) ?? null,
    isToken2022: Boolean(raw.isToken2022),
    nonTransferable: typeof raw.nonTransferable === 'boolean' ? raw.nonTransferable : null,
  };
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

  const result = await birdeyeFetch<Record<string, unknown>>('/defi/token_security', {
    chain,
    revalidate: 300,
    tags: [`token-security-${address}`],
    params: { address },
  });

  if (!result.success || !result.data) {
    return result as unknown as ApiResponse<BirdeyeTokenSecurity>;
  }

  return { success: true, data: normalizeTokenSecurity(result.data) };
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
  revalidateTag(`token-${address}`);
  revalidateTag(`token-security-${address}`);
}

export function invalidateTrending(chain = 'solana'): void {
  revalidateTag(`trending-${chain}`);
  revalidateTag(`new-listings-${chain}`);
}
