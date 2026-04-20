import type { ApiResponse, BirdeyeToken, BirdeyeTrendingToken, BirdeyeNewToken } from '@/lib/types';
import { BIRDEYE_BASE_URL } from '@/lib/constants';

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function birdeyeFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  chain = 'solana',
  revalidate = 30,
): Promise<ApiResponse<T>> {
  const apiKey = process.env.BIRDEYE_API_KEY;

  if (!apiKey) {
    return {
      data: null as unknown as T,
      success: false,
      error: 'BIRDEYE_API_KEY is not set. Add it to your .env.local file.',
    };
  }

  const url = new URL(`${BIRDEYE_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': apiKey,
        'x-chain': chain,
        'Content-Type': 'application/json',
      },
      next: { revalidate },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Birdeye ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data: T; success: boolean };
    return { data: json.data, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { data: null as unknown as T, success: false, error: message };
  }
}

// ─── Public API methods ───────────────────────────────────────────────────────

export async function getTrendingTokens(
  chain = 'solana',
  limit = 20,
): Promise<ApiResponse<BirdeyeTrendingToken[]>> {
  return birdeyeFetch<BirdeyeTrendingToken[]>(
    '/defi/token_trending',
    { sort_by: 'rank', sort_type: 'asc', offset: '0', limit: String(limit) },
    chain,
  );
}

export async function getNewTokens(
  chain = 'solana',
  limit = 20,
): Promise<ApiResponse<BirdeyeNewToken[]>> {
  return birdeyeFetch<BirdeyeNewToken[]>(
    '/defi/v2/tokens/new_listing',
    { sort_by: 'creation_time', sort_type: 'desc', type: '6H', limit: String(limit) },
    chain,
  );
}

export async function getTokenOverview(
  address: string,
  chain = 'solana',
): Promise<ApiResponse<BirdeyeToken>> {
  return birdeyeFetch<BirdeyeToken>(
    '/defi/token_overview',
    { address },
    chain,
    60, // cache token overview for 60s
  );
}

export async function getTokenMarketData(
  address: string,
  chain = 'solana',
): Promise<ApiResponse<unknown>> {
  return birdeyeFetch<unknown>(
    '/defi/token_market_data',
    { address },
    chain,
  );
}
