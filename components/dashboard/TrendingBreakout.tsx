import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { formatPrice, formatNumber, formatPercent, getChangeColor } from '@/lib/utils';
import type { TrendingToken } from '@/lib/types';

interface TrendingBreakoutProps {
  tokens: TrendingToken[];
}

/** Visual bar indicating breakout signal strength — 5 columns */
function BreakoutBar({ score }: { score: number }) {
  const filled = Math.round((score / 100) * 5);
  return (
    <div className="flex items-end gap-0.5" title={`Breakout score: ${score}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < filled;
        const heightClass =
          active && score >= 80 ? 'h-4' :
          active && score >= 60 ? 'h-3.5' :
          active              ? 'h-3' :
                                 'h-2';
        const colorClass =
          active && score >= 80 ? 'bg-success-400' :
          active && score >= 60 ? 'bg-warning-400' :
          active               ? 'bg-accent-400'   :
                                  'bg-space-600';
        return (
          <div
            key={i}
            className={['w-1 rounded-sm transition-all', heightClass, colorClass].join(' ')}
          />
        );
      })}
    </div>
  );
}

export default function TrendingBreakout({ tokens }: TrendingBreakoutProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-space-600 bg-space-800">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-space-700 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Trending Breakouts</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Volume + momentum signals</p>
        </div>
        <Badge variant="accent">TOP {tokens.length}</Badge>
      </div>

      {/* ── Token list ─────────────────────────────────────────────────── */}
      <ul className="flex-1 divide-y divide-space-700 overflow-y-auto">
        {tokens.map((token) => (
          <li key={token.address}>
            <Link
              href={`/token/${token.address}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-space-750 group"
            >
              {/* Rank */}
              <span className="w-4 flex-shrink-0 text-center font-mono text-[11px] font-bold text-slate-600">
                {token.rank}
              </span>

              {/* Avatar */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-space-600 text-xs font-bold text-slate-200">
                {token.symbol.slice(0, 2)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100 group-hover:text-accent-400 transition-colors">
                  {token.symbol}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Vol: ${formatNumber(token.volume24h)}
                </p>
              </div>

              {/* Price + change */}
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-sm text-slate-200">
                  {formatPrice(token.price)}
                </p>
                <p
                  className={[
                    'mt-0.5 font-mono text-[11px] font-semibold',
                    getChangeColor(token.priceChange24h),
                  ].join(' ')}
                >
                  {formatPercent(token.priceChange24h)}
                </p>
              </div>

              {/* Breakout bars */}
              <div className="ml-1 flex-shrink-0">
                <BreakoutBar score={token.breakoutScore} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-space-700 px-5 py-3">
        <Link
          href="/trending"
          className="text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          View full trending list →
        </Link>
      </div>
    </div>
  );
}
