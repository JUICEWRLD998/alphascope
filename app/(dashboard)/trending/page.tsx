import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  Zap,
  TrendingUp,
  BarChart2,
  ExternalLink,
} from 'lucide-react';
import { getTrendingTokens } from '@/services/birdeye';
import type { BirdeyeTrendingToken } from '@/lib/types';
import { TrendingBreakoutSkeleton } from '@/components/dashboard/TrendingBreakout';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  cn,
  formatPrice,
  formatNumber,
  formatPercent,
  formatAddress,
  getChangeColor,
  getScoreTextColor,
} from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Trending Breakouts — AlphaScope',
  description:
    'Live trending tokens with volume surge, price spike, and rank movement signals.',
};

// ─── Breakout detection (shared logic, inline for this page) ─────────────────

const T = {
  VOLUME_SURGE:        100,
  VOLUME_NOTABLE:       50,
  PRICE_SPIKE:          15,
  PRICE_EXTREME:        60,
  RANK_TOP:              5,
  RANK_VOL_CONFIRM:     50,
} as const;

type SignalKey = 'VOLUME SURGE' | 'PRICE SPIKE' | 'RANK MOVER';

interface Breakout {
  isBreakout: boolean;
  score: number;
  signals: SignalKey[];
  volumeBreakout: boolean;
  priceBreakout: boolean;
  rankBreakout: boolean;
}

function detect(token: BirdeyeTrendingToken): Breakout {
  const volumeBreakout = token.v24hChangePercent > T.VOLUME_SURGE;
  const priceBreakout  = token.priceChange24hPercent > T.PRICE_SPIKE;
  const rankBreakout   = token.rank <= T.RANK_TOP && token.v24hChangePercent > T.RANK_VOL_CONFIRM;
  const isBreakout     = volumeBreakout || priceBreakout || rankBreakout;

  const signals: SignalKey[] = [];
  let score = 0;

  if (volumeBreakout) {
    score += 20 + Math.min(15, (token.v24hChangePercent - T.VOLUME_SURGE) / 27);
    signals.push('VOLUME SURGE');
  } else if (token.v24hChangePercent > T.VOLUME_NOTABLE) {
    score += 8;
  }
  if (token.priceChange24hPercent > T.PRICE_EXTREME) {
    score += 35;
    signals.push('PRICE SPIKE');
  } else if (priceBreakout) {
    score += Math.min(25, (token.priceChange24hPercent - T.PRICE_SPIKE) * 0.7 + 10);
    signals.push('PRICE SPIKE');
  } else if (token.priceChange24hPercent > 5) {
    score += 5;
  }
  if (rankBreakout) { score += 20; signals.push('RANK MOVER'); }
  if (token.rank === 1) score += 10;

  return { isBreakout, score: Math.min(100, Math.round(score)), signals, volumeBreakout, priceBreakout, rankBreakout };
}

// ─── Breakout card (large format, for the hero section) ──────────────────────

function BreakoutCard({ token, rank }: { token: BirdeyeTrendingToken; rank: number }) {
  const b = detect(token);

  const glow =
    b.score >= 80  ? 'border-success-500/40 hover:border-success-500/70 hover:shadow-success-500/10' :
    b.score >= 55  ? 'border-warning-500/40 hover:border-warning-500/70 hover:shadow-warning-500/10' :
                     'border-accent-500/30  hover:border-accent-500/60  hover:shadow-accent-500/10';

  const intensityPct = Math.round(b.score);
  const textColor    = getScoreTextColor(intensityPct);

  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-xl border bg-space-900 p-5',
        'transition-all duration-200 hover:shadow-lg',
        glow,
      )}
    >
      {/* Rank */}
      <span className="absolute right-4 top-4 font-mono text-[10px] text-slate-600">#{rank}</span>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-space-700">
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-500">
            {token.symbol.slice(0, 2).toUpperCase()}
          </span>
          {token.logoURI && (
            <Image src={token.logoURI} alt={token.symbol} fill unoptimized className="rounded-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/token/${token.address}`}
              className="font-semibold text-slate-100 transition-colors hover:text-accent-300"
            >
              {token.name}
            </Link>
            <Badge variant="accent" size="sm">BREAKOUT</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{token.symbol}</span>
            <span className="text-xs text-slate-700">·</span>
            <span className="font-mono text-xs text-slate-600">
              {formatAddress(token.address, 4)}
            </span>
            <Link
              href={`https://solscan.io/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 transition-colors hover:text-accent-400"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Price + change */}
      <div className="flex items-end justify-between border-t border-space-700/50 pt-3">
        <div>
          <p className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-600">Price</p>
          <p className="font-mono text-sm font-bold text-slate-100">{formatPrice(token.price)}</p>
        </div>
        <div className="text-right">
          <p className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-600">24h</p>
          <p className={cn('font-mono text-sm font-bold', getChangeColor(token.priceChange24hPercent))}>
            {formatPercent(token.priceChange24hPercent)}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-600">Volume</p>
          <p className="font-mono text-sm text-slate-300">${formatNumber(token.v24hUSD)}</p>
        </div>
      </div>

      {/* Signal pills */}
      <div className="flex flex-wrap gap-1.5">
        {b.signals.map((sig) => (
          <span
            key={sig}
            className="inline-flex items-center gap-1 rounded border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-accent-400"
          >
            <Zap className="h-2 w-2" />
            {sig}
          </span>
        ))}
      </div>

      {/* Intensity meter */}
      <div className="border-t border-space-700/50 pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-slate-600">Breakout Intensity</span>
          <span className={cn('font-mono text-xs font-bold', textColor)}>{intensityPct}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-space-700">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700',
              b.score >= 80 ? 'bg-success-500' : b.score >= 55 ? 'bg-warning-500' : 'bg-accent-500',
            )}
            style={{ width: `${intensityPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Full ranked table row ────────────────────────────────────────────────────

function TableRow({ token }: { token: BirdeyeTrendingToken }) {
  const b = detect(token);

  return (
    <tr
      className={cn(
        'group border-b border-space-700/40 transition-colors',
        b.isBreakout ? 'hover:bg-accent-500/5' : 'hover:bg-space-850',
      )}
    >
      {/* Rank */}
      <td className="px-4 py-3">
        <span className={cn('font-mono text-sm font-bold', token.rank <= 3 ? 'text-accent-400' : 'text-slate-600')}>
          {token.rank}
        </span>
      </td>

      {/* Token */}
      <td className="px-4 py-3">
        <Link href={`/token/${token.address}`} className="flex items-center gap-2.5">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-space-700">
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-500">
              {token.symbol.slice(0, 2).toUpperCase()}
            </span>
            {token.logoURI && (
              <Image src={token.logoURI} alt={token.symbol} fill unoptimized className="rounded-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-accent-300">
              {token.symbol}
            </p>
            <p className="font-mono text-[10px] text-slate-600">{formatAddress(token.address, 4)}</p>
          </div>
          {b.isBreakout && <Badge variant="accent" size="sm">BREAKOUT</Badge>}
        </Link>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-slate-200">{formatPrice(token.price)}</span>
      </td>

      {/* 24h change */}
      <td className="px-4 py-3 text-right">
        <span className={cn('font-mono text-sm font-bold', getChangeColor(token.priceChange24hPercent))}>
          {formatPercent(token.priceChange24hPercent)}
        </span>
      </td>

      {/* Volume */}
      <td className="px-4 py-3 text-right">
        <div>
          <p className="font-mono text-sm text-slate-200">${formatNumber(token.v24hUSD)}</p>
          {typeof token.v24hChangePercent === 'number' && token.v24hChangePercent !== 0 && (
            <p className={cn('font-mono text-[10px]', getChangeColor(token.v24hChangePercent))}>
              {token.v24hChangePercent > 0 ? '+' : ''}{token.v24hChangePercent.toFixed(0)}% vol
            </p>
          )}
        </div>
      </td>

      {/* Mkt cap */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-slate-400">${formatNumber(token.mc)}</span>
      </td>

      {/* Signals */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {b.signals.map((sig) => (
            <span
              key={sig}
              className="inline-flex items-center gap-0.5 rounded border border-accent-500/20 bg-accent-500/10 px-1.5 py-[2px] font-mono text-[9px] font-bold text-accent-400"
            >
              <Zap className="h-2 w-2" />
              {sig}
            </span>
          ))}
          {!b.isBreakout && (
            <span className="text-[10px] text-slate-700">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Async page data component ───────────────────────────────────────────────

async function TrendingPageContent({ chain }: { chain: string }) {
  const result = await getTrendingTokens({ chain, limit: 20 });

  if (!result.success || !result.data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-danger-500/20 bg-danger-500/5 p-12 text-center">
        <Activity className="h-8 w-8 text-danger-400" />
        <p className="text-sm font-semibold text-danger-300">Failed to load trending tokens</p>
        <p className="font-mono text-xs text-slate-600">{result.error}</p>
      </div>
    );
  }

  const tokens = result.data.tokens ?? [];
  const breakouts = tokens.filter((t) => detect(t).isBreakout);
  const all = [...tokens].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-8">

      {/* ── Breakout highlights ──────────────────────────────────────────── */}
      {breakouts.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Active Breakouts
            </h2>
            <Badge variant="accent">{breakouts.length}</Badge>
            <span className="ml-auto text-xs text-slate-600">
              Volume surge · Price spike · Rank movement
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {breakouts.map((token) => (
              <BreakoutCard key={token.address} token={token} rank={token.rank} />
            ))}
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-space-700 bg-space-900 px-5 py-4 text-sm text-slate-500">
          <BarChart2 className="h-4 w-4 shrink-0" />
          <span>No active breakout signals right now — check back in 30 seconds.</span>
        </div>
      )}

      {/* ── Full rankings table ──────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-100">Full Rankings</h2>
          <span className="text-xs text-slate-600">Top {all.length} by volume</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-space-700 bg-space-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-space-700">
                  {['#', 'Token', 'Price', '24h %', 'Volume', 'Mkt Cap', 'Signals'].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={cn(
                          'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500',
                          i <= 1 || i === 6 ? 'text-left' : 'text-right',
                        )}
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {all.map((token) => (
                  <TableRow key={token.address} token={token} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const CHAINS = ['solana', 'ethereum', 'bsc', 'base'] as const;

interface TrendingPageProps {
  searchParams: Promise<{ chain?: string }>;
}

export default async function TrendingPage({ searchParams }: TrendingPageProps) {
  const params = await searchParams;
  const chain  = CHAINS.includes(params.chain as (typeof CHAINS)[number])
    ? (params.chain as string)
    : 'solana';

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10">
            <Activity className="h-5 w-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Trending Breakouts</h1>
            <p className="text-sm text-slate-500">
              Volume surge · Price spike · Rank movement — auto-refreshes every 30 s
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-lg border border-space-700 bg-space-900 px-3 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success-400" />
          <span className="text-xs font-medium text-slate-400">LIVE</span>
          <span className="text-xs text-slate-600">· refreshes every 30 s</span>
        </div>
      </div>

      {/* ── Chain selector ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {CHAINS.map((c) => (
          <a
            key={c}
            href={`/trending?chain=${c}`}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
              c === chain
                ? 'border-accent-500/30 bg-accent-500/10 text-accent-300'
                : 'border-space-600 text-slate-500 hover:border-space-500 hover:text-slate-300',
            )}
          >
            {c}
          </a>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <Suspense fallback={<TrendingBreakoutSkeleton />} key={chain}>
        <TrendingPageContent chain={chain} />
      </Suspense>

    </div>
  );
}
