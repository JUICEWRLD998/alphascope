'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, TrendingUp, ShieldCheck, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, formatNumber, formatPercent, formatAddress, getChangeColor } from '@/lib/utils';
import ScoreMeter from '@/components/ui/ScoreMeter';
import type { Verdict, ScoreLabel, ScoredEntry } from '@/lib/types';

// ─── Verdict styles ───────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<Verdict, { ring: string; text: string; dot: string; bg: string }> = {
  BUY:   { ring: 'border-success-500/30', text: 'text-success-400', dot: 'bg-success-400', bg: 'bg-success-500/10' },
  WATCH: { ring: 'border-warning-500/30', text: 'text-warning-400', dot: 'bg-warning-400', bg: 'bg-warning-500/10' },
  AVOID: { ring: 'border-danger-500/30',  text: 'text-danger-400',  dot: 'bg-danger-400',  bg: 'bg-danger-500/10'  },
};

const LABEL_VARIANT: Record<ScoreLabel, string> = {
  'high-risk':           'border-danger-500/25 bg-danger-500/10 text-danger-400',
  'low-liquidity':       'border-warning-500/25 bg-warning-500/10 text-warning-400',
  'new-token':           'border-accent-500/25 bg-accent-500/10 text-accent-400',
  'trending':            'border-accent-500/25 bg-accent-500/10 text-accent-400',
  'breakout':            'border-success-500/25 bg-success-500/10 text-success-400',
  'whale-activity':      'border-warning-500/25 bg-warning-500/10 text-warning-400',
  'low-holders':         'border-danger-500/25 bg-danger-500/10 text-danger-400',
  'high-volume':         'border-success-500/25 bg-success-500/10 text-success-400',
  'concentrated-supply': 'border-danger-500/25 bg-danger-500/10 text-danger-400',
  'lp-burned':           'border-success-500/25 bg-success-500/10 text-success-400',
  'mintable':            'border-danger-500/25 bg-danger-500/10 text-danger-400',
  'freezeable':          'border-danger-500/25 bg-danger-500/10 text-danger-400',
  'transfer-fee':        'border-warning-500/25 bg-warning-500/10 text-warning-400',
  'mutable-metadata':    'border-warning-500/25 bg-warning-500/10 text-warning-400',
  'volume-spike':        'border-accent-500/25 bg-accent-500/10 text-accent-400',
  'price-breakout':      'border-success-500/25 bg-success-500/10 text-success-400',
  'low-mcap-gem':        'border-accent-500/25 bg-accent-500/10 text-accent-400',
  'honeypot-risk':       'border-danger-500/25 bg-danger-500/10 text-danger-400',
};

// ─── Sub-score bar ────────────────────────────────────────────────────────────

function SubBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-7 font-mono text-[11px] font-semibold tabular-nums', color)}>
        {value}
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-space-700">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', color.replace('text-', 'bg-'))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Verdict badge ────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5',
        'text-[10px] font-bold uppercase tracking-widest',
        s.bg, s.ring, s.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {verdict}
    </span>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function TokenCard({ entry }: { entry: ScoredEntry }) {
  const { score } = entry;
  const s = VERDICT_STYLE[score.verdict];

  return (
    <div className={cn('rounded-xl border bg-space-900 p-4 transition-colors hover:border-space-500', s.ring)}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-space-700">
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-500">
            {entry.symbol.slice(0, 2)}
          </span>
          {entry.logoURI && (
            <Image src={entry.logoURI} alt={entry.symbol} fill unoptimized className="rounded-full object-cover" />
          )}
        </div>

        {/* Name + verdict */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/token/${entry.address}`}
              className="font-semibold text-slate-100 hover:text-accent-300 transition-colors"
            >
              {entry.symbol}
            </Link>
            <VerdictBadge verdict={score.verdict} />
            <Link
              href={`https://solscan.io/token/${entry.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-accent-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-slate-600">{formatAddress(entry.address, 4)}</p>
        </div>

        {/* Overall score */}
        <div className="shrink-0">
          <ScoreMeter score={score.overall} size="sm" />
        </div>
      </div>

      {/* Price row */}
      <div className="mt-3 flex items-center justify-between border-t border-space-700/50 pt-3 text-xs">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Price</p>
          <p className="font-mono font-semibold text-slate-200">{formatPrice(entry.price)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-slate-600">24h</p>
          <p className={cn('font-mono font-semibold', getChangeColor(entry.priceChange24hPercent))}>
            {formatPercent(entry.priceChange24hPercent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Volume</p>
          <p className="font-mono text-slate-300">${formatNumber(entry.v24hUSD)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Mkt Cap</p>
          <p className="font-mono text-slate-400">{entry.mc > 0 ? `$${formatNumber(entry.mc)}` : '\u2014'}</p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-space-700/50 pt-3">
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-widest text-slate-600">Risk</p>
          <SubBar value={score.risk} color="text-danger-400" />
        </div>
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-widest text-slate-600">Opportunity</p>
          <SubBar value={score.opportunity} color="text-success-400" />
        </div>
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-widest text-slate-600">Momentum</p>
          <SubBar value={score.momentum} color="text-accent-400" />
        </div>
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-widest text-slate-600">Liquidity</p>
          <SubBar value={score.liquidity} color="text-warning-400" />
        </div>
      </div>

      {/* Labels */}
      {score.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-space-700/50 pt-3">
          {score.labels.slice(0, 4).map((lbl) => (
            <span
              key={lbl}
              className={cn(
                'rounded border px-1.5 py-[2px] font-mono text-[8px] font-bold uppercase tracking-wider',
                LABEL_VARIANT[lbl] ?? 'border-space-600 bg-space-800 text-slate-500',
              )}
            >
              {lbl}
            </span>
          ))}
          {score.labels.length > 4 && (
            <span className="rounded border border-space-600 bg-space-800 px-1.5 py-[2px] font-mono text-[8px] text-slate-500">
              +{score.labels.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Desktop table row ────────────────────────────────────────────────────────

function TableRow({ entry }: { entry: ScoredEntry }) {
  const { score } = entry;

  return (
    <tr className="group border-b border-space-700/40 transition-colors hover:bg-space-850/70">
      {/* Rank */}
      <td className="px-4 py-3.5 text-center">
        <span className={cn('font-mono text-sm font-bold', entry.rank <= 3 ? 'text-accent-400' : 'text-slate-600')}>
          #{entry.rank}
        </span>
      </td>

      {/* Token */}
      <td className="px-4 py-3.5">
        <Link href={`/token/${entry.address}`} className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-space-700">
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-500">
              {entry.symbol.slice(0, 2)}
            </span>
            {entry.logoURI && (
              <Image src={entry.logoURI} alt={entry.symbol} fill unoptimized className="rounded-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-accent-300">
              {entry.symbol}
            </p>
            <p className="font-mono text-[10px] text-slate-600">{formatAddress(entry.address, 4)}</p>
          </div>
        </Link>
      </td>

      {/* Verdict */}
      <td className="px-4 py-3.5">
        <VerdictBadge verdict={score.verdict} />
      </td>

      {/* Overall */}
      <td className="w-36 px-4 py-3.5">
        <ScoreMeter score={score.overall} size="sm" />
      </td>

      {/* Risk */}
      <td className="w-28 px-4 py-3.5">
        <SubBar value={score.risk} color="text-danger-400" />
      </td>

      {/* Opportunity */}
      <td className="w-28 px-4 py-3.5">
        <SubBar value={score.opportunity} color="text-success-400" />
      </td>

      {/* Momentum */}
      <td className="w-28 px-3 py-3.5">
        <SubBar value={score.momentum} color="text-accent-400" />
      </td>

      {/* Price */}
      <td className="px-4 py-3.5 text-right font-mono text-sm text-slate-200">
        {formatPrice(entry.price)}
      </td>

      {/* 24h change */}
      <td className="px-4 py-3.5 text-right">
        <span className={cn('font-mono text-sm font-bold', getChangeColor(entry.priceChange24hPercent))}>
          {formatPercent(entry.priceChange24hPercent)}
        </span>
      </td>

      {/* Volume */}
      <td className="px-4 py-3.5 text-right font-mono text-sm text-slate-400">
        ${formatNumber(entry.v24hUSD)}
      </td>

      {/* Labels */}
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1">
          {score.labels.slice(0, 2).map((lbl) => (
            <span
              key={lbl}
              className={cn(
                'rounded border px-1.5 py-[2px] font-mono text-[8px] font-bold uppercase tracking-wider',
                LABEL_VARIANT[lbl] ?? 'border-space-600 bg-space-800 text-slate-500',
              )}
            >
              {lbl}
            </span>
          ))}
          {score.labels.length > 2 && (
            <span className="rounded border border-space-600 bg-space-800 px-1.5 py-[2px] font-mono text-[8px] text-slate-500">
              +{score.labels.length - 2}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-space-600 bg-space-900 px-4 py-3">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold tabular-nums text-slate-100">{value}</p>
      </div>
    </div>
  );
}

// ─── Sort key type ────────────────────────────────────────────────────────────

type SortKey = 'overall' | 'risk' | 'opportunity' | 'momentum';
type FilterKey = 'ALL' | Verdict;

// ─── Main client component ────────────────────────────────────────────────────

export default function ScoreBoardClient({ entries, fetchError }: { entries: ScoredEntry[]; fetchError?: string }) {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [sort, setSort] = useState<SortKey>('overall');

  const stats = useMemo(() => ({
    total: entries.length,
    buy:   entries.filter((e) => e.score.verdict === 'BUY').length,
    watch: entries.filter((e) => e.score.verdict === 'WATCH').length,
    avoid: entries.filter((e) => e.score.verdict === 'AVOID').length,
  }), [entries]);

  const displayed = useMemo(() => {
    const filtered = filter === 'ALL' ? entries : entries.filter((e) => e.score.verdict === filter);
    return [...filtered].sort((a, b) => b.score[sort] - a.score[sort]);
  }, [entries, filter, sort]);

  const FILTERS: { key: FilterKey; label: string; count: number; textCls: string; activeCls: string }[] = [
    { key: 'ALL',   label: 'All',   count: stats.total, textCls: 'text-slate-300', activeCls: 'bg-space-600 border-space-500 text-slate-100' },
    { key: 'BUY',   label: 'BUY',   count: stats.buy,   textCls: 'text-success-400', activeCls: 'bg-success-500/10 border-success-500/40 text-success-400' },
    { key: 'WATCH', label: 'WATCH', count: stats.watch, textCls: 'text-warning-400', activeCls: 'bg-warning-500/10 border-warning-500/40 text-warning-400' },
    { key: 'AVOID', label: 'AVOID', count: stats.avoid, textCls: 'text-danger-400',  activeCls: 'bg-danger-500/10  border-danger-500/40  text-danger-400'  },
  ];

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'overall',     label: 'Overall' },
    { key: 'risk',        label: 'Risk' },
    { key: 'opportunity', label: 'Opportunity' },
    { key: 'momentum',    label: 'Momentum' },
  ];

  return (
    <div className="space-y-6">

      {/* ── API error banner ───────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-400" />
          <div>
            <p className="font-semibold text-danger-300">Failed to load token scores</p>
            <p className="mt-0.5 text-xs text-danger-400/70">{fetchError}</p>
            <p className="mt-1 text-xs text-slate-500">This is usually a Birdeye API rate-limit or key issue. The page auto-refreshes every 30 s.</p>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Score Board</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            AI-powered composite scores across risk, opportunity, momentum & liquidity.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <RefreshCw className="h-3 w-3" />
          <span>Live — refreshes every 30 s</span>
        </div>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { label: 'Tokens Scored', value: stats.total, icon: Zap,        color: 'bg-accent-500/10 text-accent-400' },
          { label: 'BUY Signal',    value: stats.buy,   icon: TrendingUp,  color: 'bg-success-500/10 text-success-400' },
          { label: 'WATCH Signal',  value: stats.watch, icon: ShieldCheck, color: 'bg-warning-500/10 text-warning-400' },
          { label: 'AVOID Signal',  value: stats.avoid, icon: ShieldCheck, color: 'bg-danger-500/10 text-danger-400' },
        ].map((s) => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
            <StatCard label={s.label} value={s.value} icon={s.icon} color={s.color} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Filters + sort ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label, count, textCls, activeCls }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                filter === key
                  ? activeCls
                  : 'border-space-600 bg-space-800/50 hover:border-space-500 hover:bg-space-700 ' + textCls,
              )}
            >
              {label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                filter === key ? 'bg-black/20' : 'bg-space-700',
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort select */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-500">Sort by</span>
          <div className="flex flex-wrap gap-1.5">
            {SORTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                  sort === key
                    ? 'border-accent-500/40 bg-accent-500/10 text-accent-400'
                    : 'border-space-600 bg-space-800/50 text-slate-500 hover:border-space-500 hover:text-slate-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {displayed.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-space-600 bg-space-800">
            <ShieldCheck className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            {fetchError ? (
              <>
                <p className="font-semibold text-slate-300">Scores unavailable</p>
                <p className="mt-1 text-sm text-slate-600">The trending data fetch failed. Try refreshing the page.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-300">No tokens match this filter</p>
                <p className="mt-1 text-sm text-slate-600">Try selecting a different verdict category.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile card list ──────────────────────────────────────────────────── */}
      {displayed.length > 0 && (
        <motion.div
          className="space-y-3 xl:hidden"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {displayed.map((entry) => (
            <motion.div key={entry.address} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
              <TokenCard entry={entry} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Desktop table ─────────────────────────────────────────────────────── */}
      {displayed.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border border-space-600 bg-space-800 xl:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-space-700 bg-space-850/50">
                  {[
                    { label: '#',           align: 'text-center' },
                    { label: 'Token',       align: 'text-left' },
                    { label: 'Verdict',     align: 'text-left' },
                    { label: 'Overall',     align: 'text-left w-36' },
                    { label: 'Risk',        align: 'text-left w-28' },
                    { label: 'Opportunity', align: 'text-left w-28' },
                    { label: 'Momentum',    align: 'text-left w-28' },
                    { label: 'Price',       align: 'text-right' },
                    { label: '24h',         align: 'text-right' },
                    { label: 'Volume',      align: 'text-right' },
                    { label: 'Labels',      align: 'text-left' },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={cn(
                        'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500',
                        align,
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-space-700/40">
                {displayed.map((entry) => (
                  <TableRow key={entry.address} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-space-700 px-5 py-3">
            <p className="text-[11px] text-slate-600">
              Scored {displayed.length} tokens · Security dimension estimated (no on-chain security fetch) · Confidence may be lower
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
