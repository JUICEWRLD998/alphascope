import { getTrendingTokens } from '@/services/birdeye';
import { scoreToken } from '@/lib/scoring';
import type { ScoringInput } from '@/lib/scoring';
import type { TokenScore } from '@/lib/types';
import ScoreBoardClient from './_components/ScoreBoardClient';

export const dynamic = 'force-dynamic';

// ─── Shape shared with the client component ───────────────────────────────────

export interface ScoredEntry {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  price: number;
  priceChange24hPercent: number;
  v24hUSD: number;
  mc: number;
  liquidity: number;
  holder: number;
  rank: number;
  score: TokenScore;
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorCard({ message }: { message?: string }) {
  const friendlyMsg =
    message?.includes('MISSING_API_KEY')
      ? 'Birdeye API key is not set. Add BIRDEYE_API_KEY to your .env.local file to enable live scoring.'
      : message?.includes('UNAUTHORIZED')
      ? 'Your Birdeye API key is invalid or expired. Check .env.local.'
      : message?.includes('RATE_LIMITED')
      ? 'API rate limit reached. Scores will refresh automatically in a moment.'
      : 'Unable to reach the Birdeye API. Check your internet connection and try again.';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-danger-500/30 bg-danger-500/10">
        <svg className="h-7 w-7 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Score Board Unavailable</h2>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">{friendlyMsg}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScoresPage() {
  const result = await getTrendingTokens({ limit: 30 });

  if (!result.success || !result.data?.tokens?.length) {
    return <ErrorCard message={result.error} />;
  }

  const now = Math.floor(Date.now() / 1000);

  const entries: ScoredEntry[] = result.data.tokens.map((t) => {
    const ageMinutes = t.lastTradeUnixTime
      ? Math.max(0, Math.floor((now - t.lastTradeUnixTime) / 60))
      : 120;

    const input: ScoringInput = {
      address:            t.address,
      price:              t.price,
      priceChange24h:     t.priceChange24hPercent,
      volume24h:          t.v24hUSD,
      volumeChange24h:    t.v24hChangePercent ?? 0,
      marketCap:          t.mc,
      liquidity:          t.liquidity,
      holders:            t.holder,
      ageMinutes,
      security:           null,
      whaleActivityRatio: null,
    };

    const score = scoreToken(input);

    return {
      address:              t.address,
      symbol:               t.symbol,
      name:                 t.name,
      logoURI:              t.logoURI ?? '',
      price:                t.price,
      priceChange24hPercent: t.priceChange24hPercent,
      v24hUSD:              t.v24hUSD,
      mc:                   t.mc,
      liquidity:            t.liquidity,
      holder:               t.holder,
      rank:                 t.rank,
      score,
    };
  });

  return <ScoreBoardClient entries={entries} />;
}
