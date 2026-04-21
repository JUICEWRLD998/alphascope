import { LayoutDashboard, Activity, TrendingUp, ShieldAlert } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import NewTokenRadar from '@/components/dashboard/NewTokenRadar';
import TrendingBreakout from '@/components/dashboard/TrendingBreakout';
import ScoreBoard from '@/components/dashboard/ScoreBoard';
import AnimateIn from '@/components/ui/AnimateIn';
import { MOCK_STATS, MOCK_NEW_TOKENS } from '@/lib/mock-data';
import { getNewListings, getTrendingTokens } from '@/services/birdeye';
import { scoreToken } from '@/lib/scoring';
import type { ScoringInput } from '@/lib/scoring';
import type { BirdeyeNewListing, BirdeyeTrendingToken, NewToken } from '@/lib/types';

// Run on every request so env vars and live data are always fresh.
export const dynamic = 'force-dynamic';

function listingToInput(t: BirdeyeNewListing): ScoringInput {
  return {
    address: t.address,
    price: t.price,
    priceChange24h: 0,
    volume24h: t.v24hUSD,
    volumeChange24h: 0,
    marketCap: t.mc,
    liquidity: t.liquidity,
    holders: 0,
    ageMinutes: Math.max(0, Math.floor((Date.now() / 1000 - t.liquidityAddedAt) / 60)),
    security: null,
    whaleActivityRatio: null,
  };
}

function isBreakout(t: BirdeyeTrendingToken): boolean {
  return (t.v24hChangePercent ?? 0) > 100 || (t.priceChange24hPercent ?? 0) > 50;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const chain = params.chain ?? 'solana';

  // Fetch both in parallel; errors are safe (API returns typed failure objects)
  const [newListRes, trendRes] = await Promise.all([
    getNewListings({ chain, window: '24h', limit: 50 }),
    getTrendingTokens({ chain, limit: 20 }),
  ]);

  // New Tokens (24h)
  const newItems = newListRes.success && newListRes.data ? newListRes.data.items : null;
  const newTokens24h = newItems ? newItems.length : MOCK_STATS.newTokens24h;

  // High Risk Alerts — tokens scored as AVOID
  const highRiskAlerts = newItems
    ? newItems.map((t) => scoreToken(listingToInput(t))).filter((s) => s.verdict === 'AVOID').length
    : MOCK_STATS.highRiskAlerts;

  // Trending Breakouts — significant momentum
  const trendItems = trendRes.success && trendRes.data ? trendRes.data.tokens : null;
  const trendingBreakouts = trendItems
    ? trendItems.filter(isBreakout).length
    : MOCK_STATS.trendingBreakouts;

  // Tokens Analyzed — rough total for the session
  const totalTokensAnalyzed = newItems || trendItems
    ? (newItems?.length ?? 0) + (trendItems?.length ?? 0)
    : MOCK_STATS.totalTokensAnalyzed;

  // Live scored tokens for the Score Board widget (top 6 trending)
  const now = Math.floor(Date.now() / 1000);
  const scoredItems: NewToken[] = trendItems
    ? trendItems.slice(0, 6).map((t): NewToken => {
        const ageMinutes = t.lastTradeUnixTime
          ? Math.max(0, Math.floor((now - t.lastTradeUnixTime) / 60))
          : 120;
        const input: ScoringInput = {
          address:         t.address,
          price:           t.price,
          priceChange24h:  t.priceChange24hPercent,
          volume24h:       t.v24hUSD,
          volumeChange24h: t.v24hChangePercent ?? 0,
          marketCap:       t.mc,
          liquidity:       t.liquidity,
          holders:         t.holder,
          ageMinutes,
          security:           null,
          whaleActivityRatio: null,
        };
        return {
          address:         t.address,
          symbol:          t.symbol,
          name:            t.name,
          logoURI:         t.logoURI || undefined,
          price:           t.price,
          priceChange24h:  t.priceChange24hPercent,
          volume24h:       t.v24hUSD,
          marketCap:       t.mc,
          liquidity:       t.liquidity,
          holders:         t.holder,
          createdAt:       t.lastTradeUnixTime || now,
          chain:           'solana',
          age:             ageMinutes,
          initialLiquidity: t.liquidity,
          scoreSnapshot:   scoreToken(input),
        };
      })
    : MOCK_NEW_TOKENS;

  return (
    <div className="space-y-4 lg:space-y-6">

      {/* ── Stat cards row ────────────────────────────────────────────── */}
      <AnimateIn>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            title="Tokens Analyzed"
            value={totalTokensAnalyzed.toLocaleString()}
            subtitle="across all chains"
            icon={<LayoutDashboard className="h-5 w-5" />}
            accentColor="cyan"
          />
          <StatCard
            title="New Tokens (24h)"
            value={newTokens24h.toLocaleString()}
            trend={12.4}
            subtitle="vs yesterday"
            icon={<Activity className="h-5 w-5" />}
            accentColor="green"
          />
          <StatCard
            title="Trending Breakouts"
            value={trendingBreakouts}
            trend={-8.2}
            subtitle="active signals"
            icon={<TrendingUp className="h-5 w-5" />}
            accentColor="amber"
          />
          <StatCard
            title="High Risk Alerts"
            value={highRiskAlerts}
            trend={5.1}
            subtitle="require review"
            icon={<ShieldAlert className="h-5 w-5" />}
            accentColor="red"
          />
        </div>
      </AnimateIn>

      {/* ── New Token Radar + Trending Breakouts ──────────────────────── */}
      <AnimateIn delay={0.15}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <NewTokenRadar chain={chain} />
          </div>
          <div className="lg:col-span-2">
            <TrendingBreakout chain={chain} />
          </div>
        </div>
      </AnimateIn>

      {/* ── Score Board ───────────────────────────────────────────────── */}
      <AnimateIn delay={0.25}>
        <ScoreBoard tokens={scoredItems} />
      </AnimateIn>
    </div>
  );
}
