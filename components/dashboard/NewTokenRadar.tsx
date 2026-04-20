import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import ScoreMeter from '@/components/ui/ScoreMeter';
import { formatPrice, formatNumber, formatAge, formatAddress, getChangeColor } from '@/lib/utils';
import type { NewToken } from '@/lib/types';

interface NewTokenRadarProps {
  tokens: NewToken[];
}

export default function NewTokenRadar({ tokens }: NewTokenRadarProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-space-600 bg-space-800">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-space-700 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">New Token Radar</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Recently launched · auto-refreshes every 30 s
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
          <span className="text-[11px] font-semibold tracking-wider text-accent-400">LIVE</span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-space-700">
              {['Token', 'Age', 'Price', 'Mkt Cap', 'Liquidity', '24h', 'Score'].map(
                (col, i) => (
                  <th
                    key={col}
                    className={[
                      'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500',
                      i === 0 ? 'text-left' : i === 6 ? 'text-left' : 'text-right',
                    ].join(' ')}
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-space-700">
            {tokens.map((token) => (
              <tr
                key={token.address}
                className="group transition-colors hover:bg-space-750"
              >
                {/* Token identity */}
                <td className="px-4 py-3">
                  <Link
                    href={`/token/${token.address}`}
                    className="flex items-center gap-2.5"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-space-600 text-xs font-bold text-slate-200">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight text-slate-100 group-hover:text-accent-400 transition-colors">
                        {token.symbol}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
                        {formatAddress(token.address)}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </td>

                {/* Age */}
                <td className="px-4 py-3 text-right">
                  <Badge variant="info">{formatAge(token.age)}</Badge>
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-right font-mono text-slate-200">
                  {formatPrice(token.price)}
                </td>

                {/* Market cap */}
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  ${formatNumber(token.marketCap)}
                </td>

                {/* Liquidity */}
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  ${formatNumber(token.liquidity)}
                </td>

                {/* 24h change */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={[
                      'font-mono text-xs font-semibold',
                      getChangeColor(token.priceChange24h),
                    ].join(' ')}
                  >
                    {token.priceChange24h > 0 ? '+' : ''}
                    {token.priceChange24h.toFixed(1)}%
                  </span>
                </td>

                {/* Score */}
                <td className="w-28 px-4 py-3">
                  <ScoreMeter score={token.scoreSnapshot.overall} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-space-700 px-5 py-3">
        <Link
          href="/radar"
          className="text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          View all new tokens →
        </Link>
      </div>
    </div>
  );
}
