import { LayoutDashboard, Activity, TrendingUp, ShieldAlert } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import NewTokenRadar from '@/components/dashboard/NewTokenRadar';
import TrendingBreakout from '@/components/dashboard/TrendingBreakout';
import ScoreBoard from '@/components/dashboard/ScoreBoard';
import { MOCK_STATS, MOCK_NEW_TOKENS, MOCK_TRENDING_TOKENS } from '@/lib/mock-data';

/**
 * Dashboard homepage — server component.
 *
 * Data flow:
 *  - Currently uses mock data from lib/mock-data.ts for UI development.
 *  - Replace the MOCK_* imports with calls to services/birdeye.ts once
 *    BIRDEYE_API_KEY is set in .env.local.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">

      {/* ── Banner if no API key ──────────────────────────────────────── */}
      {!process.env.BIRDEYE_API_KEY && (
        <div className="flex items-center gap-3 rounded-lg border border-warning-500/20 bg-warning-500/5 px-4 py-3 text-sm text-warning-400">
          <span className="text-base">⚠</span>
          <span>
            <strong>Demo mode</strong> — Add{' '}
            <code className="rounded bg-space-700 px-1.5 py-0.5 text-xs font-mono text-warning-300">
              BIRDEYE_API_KEY
            </code>{' '}
            to <code className="rounded bg-space-700 px-1.5 py-0.5 text-xs font-mono text-warning-300">.env.local</code>{' '}
            to enable live data.
          </span>
        </div>
      )}

      {/* ── Stat cards row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Tokens Analyzed"
          value={MOCK_STATS.totalTokensAnalyzed.toLocaleString()}
          subtitle="across all chains"
          icon={<LayoutDashboard className="h-5 w-5" />}
          accentColor="cyan"
        />
        <StatCard
          title="New Tokens (24h)"
          value={MOCK_STATS.newTokens24h.toLocaleString()}
          trend={12.4}
          subtitle="vs yesterday"
          icon={<Activity className="h-5 w-5" />}
          accentColor="green"
        />
        <StatCard
          title="Trending Breakouts"
          value={MOCK_STATS.trendingBreakouts}
          trend={-8.2}
          subtitle="active signals"
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="amber"
        />
        <StatCard
          title="High Risk Alerts"
          value={MOCK_STATS.highRiskAlerts}
          trend={5.1}
          subtitle="require review"
          icon={<ShieldAlert className="h-5 w-5" />}
          accentColor="red"
        />
      </div>

      {/* ── New Token Radar + Trending Breakouts ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <NewTokenRadar tokens={MOCK_NEW_TOKENS} />
        </div>
        <div className="xl:col-span-2">
          <TrendingBreakout tokens={MOCK_TRENDING_TOKENS} />
        </div>
      </div>

      {/* ── Score Board ───────────────────────────────────────────────── */}
      <ScoreBoard tokens={MOCK_NEW_TOKENS} />
    </div>
  );
}
