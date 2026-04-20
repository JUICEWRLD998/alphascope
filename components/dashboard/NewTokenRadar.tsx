import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  Zap,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  BarChart2,
  ExternalLink,
} from 'lucide-react';
import { getNewListings } from '@/services/birdeye';
import { scoreToken } from '@/lib/scoring';
import type { ScoringInput } from '@/lib/scoring';
import type { BirdeyeNewListing, Verdict } from '@/lib/types';
import { SkeletonCard } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import ScoreMeter from '@/components/ui/ScoreMeter';
import {
  cn,
  formatPrice,
  formatNumber,
  formatAge,
  formatAddress,
  getScoreTextColor,
} from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listingToScoringInput(token: BirdeyeNewListing): ScoringInput {
  const ageMinutes = Math.max(
    0,
    Math.floor((Date.now() / 1000 - token.liquidityAddedAt) / 60),
  );
  return {
    address:         token.address,
    price:           token.price,
    priceChange24h:  0,
    volume24h:       token.v24hUSD,
    volumeChange24h: 0,
    marketCap:       token.mc,
    liquidity:       token.liquidity,
    holders:         0,
    ageMinutes,
    security:           null,
    whaleActivityRatio: null,
  };
}

// ─── Verdict → style maps ─────────────────────────────────────────────────────

const CARD_BORDER: Record<Verdict, string> = {
  BUY:   'border-success-500/30 hover:border-success-500/60 hover:shadow-success-500/10',
  WATCH: 'border-space-600    hover:border-space-500',
  AVOID: 'border-danger-500/30 hover:border-danger-500/60 hover:shadow-danger-500/10',
};

const VERDICT_BADGE: Record<Verdict, 'success' | 'warning' | 'danger'> = {
  BUY:   'success',
  WATCH: 'warning',
  AVOID: 'danger',
};

// ─── Token Card ───────────────────────────────────────────────────────────────

function TokenCard({
  token,
  rank,
}: {
  token: BirdeyeNewListing;
  rank: number;
}) {
  const input      = listingToScoringInput(token);
  const score      = scoreToken(input);
  const ageMinutes = input.ageMinutes;
  const isNew      = ageMinutes < 30;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-xl border bg-space-900 p-5',
        'transition-all duration-200 hover:bg-space-850 hover:shadow-lg',
        CARD_BORDER[score.verdict],
      )}
    >
      {/* Rank badge */}
      <span className="absolute left-3 top-3 font-mono text-[10px] text-slate-600">
        #{rank}
      </span>

      {/* ── Header: avatar + identity + verdict ── */}
      <div className="flex items-start gap-3 pl-5">
        {/* Avatar with initials fallback */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-700">
          <span className="absolute text-xs font-bold text-slate-500">
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

        {/* Name + symbol + address */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/token/${token.address}`}
              className="truncate font-semibold text-slate-100 transition-colors hover:text-accent-300"
            >
              {token.name}
            </Link>
            {isNew && (
              <Badge variant="accent" size="sm">NEW</Badge>
            )}
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
              aria-label="View on Solscan"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Verdict */}
        <Badge variant={VERDICT_BADGE[score.verdict]} size="md">
          {score.verdict}
        </Badge>
      </div>

      {/* ── Price + Vol + Age ── */}
      <div className="flex items-end justify-between border-t border-space-700/50 pt-3">
        <div>
          <p className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-600">
            Price
          </p>
          <p className="font-mono text-sm font-bold text-slate-100">
            {formatPrice(token.price)}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-600">
            24h Vol
          </p>
          <p className="font-mono text-sm text-slate-300">
            ${formatNumber(token.v24hUSD)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          <span>{formatAge(ageMinutes)}</span>
        </div>
      </div>

      {/* ── Score meters ── */}
      <div className="space-y-2.5">
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-600">
            Risk Score
          </p>
          <ScoreMeter score={score.risk} size="sm" />
        </div>
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-600">
            Opportunity
          </p>
          <ScoreMeter score={score.opportunity} size="sm" />
        </div>
      </div>

      {/* ── Signals + Confidence ── */}
      <div className="flex items-center justify-between border-t border-space-700/50 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Zap className="h-3 w-3 text-accent-400" />
          <span>{score.signals.length} signals</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <BarChart2 className="h-3 w-3" />
          <span>
            Confidence:{' '}
            <span className={getScoreTextColor(Math.round(score.confidence * 100))}>
              {Math.round(score.confidence * 100)}%
            </span>
          </span>
        </div>
      </div>

      {/* ── Verdict reason ── */}
      <p className="border-t border-space-700/50 pt-3 text-[11px] leading-snug text-slate-500">
        {score.verdictReason}
      </p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function NewTokenRadarSkeleton() {
  return (
    <section className="rounded-xl border border-space-700 bg-space-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-5 w-44 animate-pulse rounded bg-space-700" />
        <div className="h-4 w-28 animate-pulse rounded bg-space-750" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}

// ─── Error panel ──────────────────────────────────────────────────────────────

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger-500/20 bg-danger-500/5 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-danger-400" />
      <p className="text-sm font-semibold text-danger-300">Failed to load new tokens</p>
      <p className="font-mono text-xs text-slate-500">{message}</p>
      <p className="text-xs text-slate-600">
        Data refreshes automatically on the next request.
      </p>
    </div>
  );
}

// ─── Async data grid ──────────────────────────────────────────────────────────

async function TokenGrid({ chain, window: win }: { chain: string; window: string }) {
  const result = await getNewListings({
    chain,
    window: win as '30m' | '1h' | '2h' | '6h' | '24h',
    limit: 20,
  });

  if (!result.success || !result.data) {
    return <ErrorPanel message={result.error ?? 'Unknown error'} />;
  }

  const items = result.data.items ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-space-600 bg-space-850 p-10 text-center">
        <TrendingUp className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">No new listings in the past {win}.</p>
      </div>
    );
  }

  // Score all tokens and sort best-first
  const ranked = items
    .map((token) => ({ token, score: scoreToken(listingToScoringInput(token)) }))
    .sort((a, b) => b.score.overall - a.score.overall);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ranked.map(({ token }, idx) => (
        <TokenCard key={token.address} token={token} rank={idx + 1} />
      ))}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface NewTokenRadarProps {
  chain?:  string;
  window?: '30m' | '1h' | '2h' | '6h' | '24h';
}

export default function NewTokenRadar({
  chain  = 'solana',
  window = '6h',
}: NewTokenRadarProps) {
  return (
    <section className="rounded-xl border border-space-700 bg-space-900 p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-accent-400" />
          <h2 className="text-base font-semibold text-slate-100">New Token Radar</h2>
          <Badge variant="info" size="sm">LIVE</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-400" />
          <span className="capitalize">{chain} · last {window}</span>
        </div>
      </div>

      {/* Streaming card grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <TokenGrid chain={chain} window={window} />
      </Suspense>

      {/* Footer link */}
      <div className="mt-5 border-t border-space-700/50 pt-4">
        <Link
          href="/radar"
          className="text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          Open full radar →
        </Link>
      </div>
    </section>
  );
}
