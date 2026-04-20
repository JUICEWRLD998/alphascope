import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  Zap,
  TrendingUp,
  BarChart2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { getTrendingTokens } from '@/services/birdeye';
import type { BirdeyeTrendingToken } from '@/lib/types';
import { SkeletonRow } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import { cn, formatPrice, formatNumber, formatPercent, getChangeColor } from '@/lib/utils';

// ─── Breakout detection ──────────────────────────────────────────────────────

const BREAKOUT_THRESHOLDS = {
  VOLUME_SURGE:        100, // v24hChangePercent > 100% → volume doubled
  VOLUME_NOTABLE:       50, // 50-100% → strong but not full surge
  PRICE_SPIKE:          15, // priceChange24hPercent > 15%
  PRICE_EXTREME:        60, // priceChange24hPercent > 60%
  RANK_TOP:              5, // top-5 rank
  RANK_VOL_CONFIRM:     50, // must also have vol > 50% to count as rank mover
} as const;

type BreakoutSignalKey = 'VOLUME SURGE' | 'PRICE SPIKE' | 'RANK MOVER';

interface BreakoutResult {
  volumeBreakout: boolean;
  priceBreakout:  boolean;
  rankBreakout:   boolean;
  isBreakout:     boolean;
  /** 0–100 intensity score — drives bar fill and glow strength */
  score:   number;
  signals: BreakoutSignalKey[];
}

function detectBreakout(token: BirdeyeTrendingToken): BreakoutResult {
  const T = BREAKOUT_THRESHOLDS;

  const volumeBreakout = token.v24hChangePercent > T.VOLUME_SURGE;
  const priceBreakout  = token.priceChange24hPercent > T.PRICE_SPIKE;
  const rankBreakout   = token.rank <= T.RANK_TOP && token.v24hChangePercent > T.RANK_VOL_CONFIRM;
  const isBreakout     = volumeBreakout || priceBreakout || rankBreakout;

  const signals: BreakoutSignalKey[] = [];
  let score = 0;

  // ── Volume ───────────────────────────────────────────────────────────────
  if (volumeBreakout) {
    // 20 pts base + up to 15 pts for extreme volume
    const excess = Math.min(token.v24hChangePercent - T.VOLUME_SURGE, 400);
    score += 20 + Math.min(15, excess / 27);
    signals.push('VOLUME SURGE');
  } else if (token.v24hChangePercent > T.VOLUME_NOTABLE) {
    score += 8;
  }

  // ── Price ────────────────────────────────────────────────────────────────
  if (token.priceChange24hPercent > T.PRICE_EXTREME) {
    score += 35;
    signals.push('PRICE SPIKE');
  } else if (priceBreakout) {
    score += Math.min(25, (token.priceChange24hPercent - T.PRICE_SPIKE) * 0.7 + 10);
    signals.push('PRICE SPIKE');
  } else if (token.priceChange24hPercent > 5) {
    score += 5;
  }

  // ── Rank ─────────────────────────────────────────────────────────────────
  if (rankBreakout) {
    score += 20;
    signals.push('RANK MOVER');
  }
  // Rank #1 always gets a bonus
  if (token.rank === 1) score += 10;

  return {
    volumeBreakout,
    priceBreakout,
    rankBreakout,
    isBreakout,
    score:   Math.min(100, Math.round(score)),
    signals,
  };
}

// ─── Breakout intensity bar (equalizer columns) ───────────────────────────────

function BreakoutBar({ score }: { score: number }) {
  const filled = Math.round((score / 100) * 5);

  const COLOR: Record<string, string> = {
    active_high:   'bg-success-400',
    active_mid:    'bg-warning-400',
    active_low:    'bg-accent-400',
    inactive:      'bg-space-700',
  };

  function barColor(i: number, active: boolean): string {
    if (!active) return COLOR.inactive;
    if (score >= 80) return COLOR.active_high;
    if (score >= 55) return COLOR.active_mid;
    return COLOR.active_low;
  }

  return (
    <div className="flex items-end gap-0.75" title={`Breakout score: ${score}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < filled;
        // Each column is progressively taller: 7px → 11px → 15px → 19px → 23px
        const height = 7 + i * 4;
        return (
          <div
            key={i}
            className={cn(
              'w-0.75 rounded-sm transition-all duration-500',
              barColor(i, active),
              active && score >= 80 && 'shadow-[0_0_4px_var(--color-success-400)]',
            )}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

// ─── Volume change pill ───────────────────────────────────────────────────────

function VolumeChangePill({ pct }: { pct: number }) {
  if (pct === 0) return null;
  const positive = pct > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1 py-px font-mono text-[9px] font-bold',
        positive
          ? 'bg-success-500/10 text-success-400'
          : 'bg-danger-500/10 text-danger-400',
      )}
    >
      {positive ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Single token row ─────────────────────────────────────────────────────────

function TokenRow({ token }: { token: BirdeyeTrendingToken }) {
  const breakout = detectBreakout(token);

  return (
    <li
      className={cn(
        'relative',
        breakout.isBreakout && 'after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:rounded-full',
        breakout.isBreakout && score_to_glow_bar(breakout.score),
      )}
    >
      <Link
        href={`/token/${token.address}`}
        className={cn(
          'flex items-center gap-3 px-4 py-3 transition-all duration-150 group',
          breakout.isBreakout
            ? 'hover:bg-accent-500/8'
            : 'hover:bg-space-850/80',
        )}
      >
        {/* Rank */}
        <span
          className={cn(
            'w-5 shrink-0 text-center font-mono text-[11px] font-bold',
            token.rank <= 3 ? 'text-accent-400' : 'text-slate-600',
          )}
        >
          {token.rank}
        </span>

        {/* Avatar + token logo */}
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-space-700">
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
            {token.symbol.slice(0, 2).toUpperCase()}
          </span>
          {token.logoURI && (
            <Image
              src={token.logoURI}
              alt={token.symbol}
              fill
              unoptimized
              className="rounded-full object-cover"
            />
          )}
        </div>

        {/* Symbol + vol + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <p className="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-accent-300">
              {token.symbol}
            </p>
            {breakout.isBreakout && (
              <Badge variant="accent" size="sm">BREAKOUT</Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">
              ${formatNumber(token.v24hUSD)}
            </span>
            <VolumeChangePill pct={token.v24hChangePercent} />
          </div>
        </div>

        {/* Price + 24h change */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-slate-200">
            {formatPrice(token.price)}
          </p>
          <p
            className={cn(
              'mt-0.5 font-mono text-[11px] font-bold',
              getChangeColor(token.priceChange24hPercent),
            )}
          >
            {formatPercent(token.priceChange24hPercent)}
          </p>
        </div>

        {/* Breakout bar */}
        <div className="ml-1 shrink-0">
          <BreakoutBar score={breakout.score} />
        </div>
      </Link>

      {/* Signal pills under row for active breakouts */}
      {breakout.isBreakout && breakout.signals.length > 0 && (
        <div className="flex gap-1 px-13 pb-2 -mt-1">
          {breakout.signals.map((sig) => (
            <span
              key={sig}
              className="inline-flex items-center gap-0.5 rounded border border-accent-500/20 bg-accent-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-accent-400"
            >
              <Zap className="h-2 w-2" />
              {sig}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

/** Maps breakout intensity to the left edge accent bar color */
function score_to_glow_bar(score: number): string {
  if (score >= 80) return 'after:bg-success-400';
  if (score >= 55) return 'after:bg-warning-400';
  return 'after:bg-accent-500';
}

// ─── Async data fetcher ───────────────────────────────────────────────────────

async function TokenList({ chain }: { chain: string }) {
  const result = await getTrendingTokens({ chain, limit: 20 });

  if (!result.success || !result.data) {
    const code = (result.error ?? '').match(/^\[([A-Z_]+)\]/)?.[1] ?? '';
    const isRateLimited = code === 'RATE_LIMITED';
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-space-700">
          <AlertTriangle className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-300">
          {isRateLimited ? 'Rate limit reached' : 'Data temporarily unavailable'}
        </p>
        <p className="max-w-[200px] text-xs text-slate-500">
          {isRateLimited
            ? 'Trending data will resume shortly.'
            : 'Market data is momentarily unreachable. Refreshing will retry.'}
        </p>
      </div>
    );
  }

  const tokens = result.data.tokens ?? [];
  const breakoutCount = tokens.filter((t) => detectBreakout(t).isBreakout).length;

  return (
    <>
      {breakoutCount > 0 && (
        <div className="flex items-center gap-2 border-b border-space-700/60 bg-accent-500/5 px-4 py-2">
          <Zap className="h-3 w-3 text-accent-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-400">
            {breakoutCount} breakout{breakoutCount !== 1 ? 's' : ''} detected
          </span>
        </div>
      )}
      <ul className="flex-1 divide-y divide-space-700/40 overflow-y-auto">
        {tokens.map((token) => (
          <TokenRow key={token.address} token={token} />
        ))}
      </ul>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TrendingBreakoutSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-space-700 bg-space-900">
      <div className="flex items-center justify-between border-b border-space-700 px-5 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-space-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-space-750" />
      </div>
      <div>
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface TrendingBreakoutProps {
  chain?: string;
}

export default function TrendingBreakout({ chain = 'solana' }: TrendingBreakoutProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-space-700 bg-space-900">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-space-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-400" />
          <h2 className="text-sm font-semibold text-slate-100">Trending Breakouts</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {chain}
          </span>
        </div>
      </div>

      {/* Streaming list */}
      <Suspense
        fallback={
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        }
      >
        <TokenList chain={chain} />
      </Suspense>

      {/* Footer */}
      <div className="border-t border-space-700/50 px-5 py-3">
        <Link
          href="/trending"
          className="text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          Full trending list →
        </Link>
      </div>
    </div>
  );
}

