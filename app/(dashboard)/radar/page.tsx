import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import NewTokenRadar, { NewTokenRadarSkeleton } from '@/components/dashboard/NewTokenRadar';
import AnimateIn from '@/components/ui/AnimateIn';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Token Radar — AlphaScope',
  description: 'Real-time new token listings with AI-powered risk and opportunity scoring.',
};

const WINDOW_OPTIONS = ['30m', '1h', '2h', '6h', '24h'] as const;
type WindowOption = (typeof WINDOW_OPTIONS)[number];

const WINDOW_LABELS: Record<WindowOption, string> = {
  '30m': '30 min',
  '1h':  '1 hour',
  '2h':  '2 hours',
  '6h':  '6 hours',
  '24h': '24 hours',
};

interface RadarPageProps {
  searchParams: Promise<{ window?: string; chain?: string }>;
}

export default async function RadarPage({ searchParams }: RadarPageProps) {
  const params = await searchParams;
  const win: WindowOption = WINDOW_OPTIONS.includes(params.window as WindowOption)
    ? (params.window as WindowOption)
    : '6h';
  const chain = params.chain ?? 'solana';

  return (
    <div className="space-y-6">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <AnimateIn>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10">
            <ShieldAlert className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Token Radar</h1>
            <p className="text-sm text-slate-500">
              New listings scored by risk, opportunity &amp; momentum
            </p>
          </div>
        </div>

        {/* ── Window filter pills ─────────────────────────────────────── */}
        <nav className="flex items-center gap-1 rounded-lg border border-space-700 bg-space-900 p-1" aria-label="Time window">
          {WINDOW_OPTIONS.map((opt) => (
            <a
              key={opt}
              href={`/radar?window=${opt}&chain=${chain}`}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
                opt === win
                  ? 'bg-accent-500/20 text-accent-300 shadow-sm'
                  : 'text-slate-500 hover:bg-space-700 hover:text-slate-200',
              ].join(' ')}
            >
              {WINDOW_LABELS[opt]}
            </a>
          ))}
        </nav>
      </div>
      </AnimateIn>

      {/* ── Chain filter ────────────────────────────────────────────────── */}
      <AnimateIn delay={0.1}>
        <div className="flex flex-wrap items-center gap-2">
        {['solana', 'ethereum', 'bsc', 'base'].map((c) => (
          <a
            key={c}
            href={`/radar?window=${win}&chain=${c}`}
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
              c === chain
                ? 'border-accent-500/30 bg-accent-500/10 text-accent-300'
                : 'border-space-600 text-slate-500 hover:border-space-500 hover:text-slate-300',
            ].join(' ')}
          >
            {c}
          </a>
        ))}
        <span className="ml-auto text-xs text-slate-600">
          Scores refresh every 15 s
        </span>
        </div>
      </AnimateIn>

      {/* ── Radar grid ─────────────────────────────────────────────────── */}
      <AnimateIn delay={0.2}>
        <Suspense
          fallback={<NewTokenRadarSkeleton />}
          key={`${chain}-${win}`}
        >
          <NewTokenRadar chain={chain} window={win} />
        </Suspense>
      </AnimateIn>

    </div>
  );
}
