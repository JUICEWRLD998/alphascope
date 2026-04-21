import type { Metadata } from 'next';
import { getTrendingTokens } from '@/services/birdeye';
import { scoreToken, buildScoringInput } from '@/lib/scoring';
import type { ScoredEntry, BirdeyeToken, BirdeyeTrendingToken } from '@/lib/types';
import ScoreBoardClient from './_components/ScoreBoardClient';

export const metadata: Metadata = {
  title: 'Score Board — AlphaScope',
  description: 'AI-powered composite scores across risk, opportunity, momentum & liquidity for trending Solana tokens.',
};

export const revalidate = 30;

function toScoredEntry(token: BirdeyeTrendingToken, rank: number): ScoredEntry {
  // BirdeyeTrendingToken shares all fields used by buildScoringInput
  const input = buildScoringInput(token as unknown as BirdeyeToken, null);
  const score = scoreToken(input);
  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    logoURI: token.logoURI,
    price: token.price,
    priceChange24hPercent: token.priceChange24hPercent,
    v24hUSD: token.v24hUSD,
    mc: token.mc,
    liquidity: token.liquidity,
    holder: token.holder,
    rank,
    score,
  };
}

export default async function ScoresPage() {
  const result = await getTrendingTokens({ chain: 'solana', limit: 30 });
  const entries: ScoredEntry[] =
    result.success && result.data?.tokens.length
      ? result.data.tokens.map((t, i) => toScoredEntry(t, i + 1))
      : [];

  return <ScoreBoardClient entries={entries} />;
}
