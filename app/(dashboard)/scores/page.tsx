import type { Metadata } from 'next';
import { getTrendingTokens, getTokenSecurity } from '@/services/birdeye';
import { scoreToken, buildScoringInput } from '@/lib/scoring';
import type { ScoredEntry, BirdeyeTrendingToken } from '@/lib/types';
import ScoreBoardClient from './_components/ScoreBoardClient';

export const metadata: Metadata = {
  title: 'Score Board — AlphaScope',
  description: 'AI-powered composite scores across risk, opportunity, momentum & liquidity for trending Solana tokens.',
};

/**
 * ISR: Revalidate every 5 minutes.
 *
 * Rate-limit budget per cycle:
 *   1  call  → getTrendingTokens (top 20)
 *   20 calls → getTokenSecurity, one-at-a-time, 150 ms apart (built-in rate limiter)
 *   ─────────────────────────────────────────────────────
 *   ~21 calls / 5 minutes → well within Birdeye free tier
 *
 * All subsequent requests within the 5-minute window are served from
 * Next.js's server-side full-route cache — zero additional API calls.
 */
export const revalidate = 300;

export default async function ScoresPage() {
  // ── Step 1: Fetch top 20 trending tokens (1 API call) ─────────────────────
  const trendingResult = await getTrendingTokens({ chain: 'solana', limit: 20 });

  if (!trendingResult.success || !trendingResult.data?.tokens?.length) {
    return (
      <ScoreBoardClient
        entries={[]}
        fetchError={
          trendingResult.error ??
          'Failed to load trending tokens. Check your BIRDEYE_API_KEY and try again.'
        }
      />
    );
  }

  const tokens = trendingResult.data.tokens;
  const now = Math.floor(Date.now() / 1000);

  // ── Step 2: Fetch security + score each token sequentially ────────────────
  //
  // Sequential (not Promise.all) so we honour the 150 ms minimum gap enforced
  // by birdeyeFetch's built-in rate limiter. At 150 ms/call this loop takes
  // ~3 seconds — but the result is cached for 5 minutes so end-users never
  // experience this delay after the first warm request.
  //
  const entries: ScoredEntry[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token: BirdeyeTrendingToken = tokens[i];

    // Fetch security data; degrade gracefully on failure (returns null)
    const secResult = await getTokenSecurity(token.address, { chain: 'solana' });
    const security = secResult.success ? secResult.data : null;

    // Age in minutes — use lastTradeUnixTime as a proxy; default 120 min
    const ageMinutes = token.lastTradeUnixTime
      ? Math.max(0, Math.floor((now - token.lastTradeUnixTime) / 60))
      : 120;

    // BirdeyeTrendingToken is structurally compatible with BirdeyeToken for
    // buildScoringInput (all required fields present; extras ignored).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = buildScoringInput(token as any, security, ageMinutes);
    const score = scoreToken(input);

    entries.push({
      address:              token.address,
      symbol:               token.symbol,
      name:                 token.name,
      logoURI:              token.logoURI,
      price:                token.price,
      priceChange24hPercent: token.priceChange24hPercent,
      v24hUSD:              token.v24hUSD,
      mc:                   token.mc,
      liquidity:            token.liquidity,
      holder:               token.holder,
      rank:                 i + 1,
      score,
    });
  }

  return <ScoreBoardClient entries={entries} />;
}
