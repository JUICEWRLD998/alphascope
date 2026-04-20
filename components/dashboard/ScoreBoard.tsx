import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import ScoreMeter from '@/components/ui/ScoreMeter';
import { formatPrice, formatAddress } from '@/lib/utils';
import type { NewToken, ScoreLabel, Verdict } from '@/lib/types';

interface ScoreBoardProps {
  tokens: NewToken[];
}

const LABEL_VARIANT: Record<ScoreLabel, 'danger' | 'success' | 'warning' | 'info' | 'accent' | 'default'> = {
  'high-risk':            'danger',
  'low-liquidity':        'warning',
  'new-token':            'info',
  'trending':             'accent',
  'breakout':             'success',
  'whale-activity':       'warning',
  'low-holders':          'danger',
  'high-volume':          'success',
  'concentrated-supply':  'danger',
  'lp-burned':            'success',
  'mintable':             'danger',
  'freezeable':           'danger',
  'transfer-fee':         'warning',
  'mutable-metadata':     'warning',
  'volume-spike':         'accent',
  'price-breakout':       'success',
  'low-mcap-gem':         'accent',
  'honeypot-risk':        'danger',
};

const VERDICT_STYLE: Record<Verdict, { bg: string; text: string; dot: string }> = {
  BUY:   { bg: 'bg-success-500/10 border-success-500/20', text: 'text-success-400', dot: 'bg-success-400' },
  WATCH: { bg: 'bg-warning-500/10 border-warning-500/20', text: 'text-warning-400', dot: 'bg-warning-400' },
  AVOID: { bg: 'bg-danger-500/10  border-danger-500/20',  text: 'text-danger-400',  dot: 'bg-danger-400'  },
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span className={[
      'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase',
      s.bg, s.text,
    ].join(' ')}>
      <span className={['h-1.5 w-1.5 rounded-full', s.dot].join(' ')} />
      {verdict}
    </span>
  );
}

/** Inline mini-bar (used for risk / opportunity sub-scores) */
function SubBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={['w-7 font-mono text-[11px] font-semibold tabular-nums', color].join(' ')}>
        {value}
      </span>
      <div className="flex-1 h-1 rounded-full bg-space-700 overflow-hidden">
        <div
          className={['h-full rounded-full', color.replace('text-', 'bg-').replace('-400', '-500')].join(' ')}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ScoreBoard({ tokens }: ScoreBoardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-space-600 bg-space-800">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-space-700 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Token Score Board</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Composite risk + opportunity scores
          </p>
        </div>
        <Badge variant="accent">SCORED</Badge>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-space-700">
              {[
                { label: 'Token',       align: 'text-left' },
                { label: 'Verdict',     align: 'text-left' },
                { label: 'Overall',     align: 'text-left  w-36' },
                { label: 'Risk',        align: 'text-left  w-32' },
                { label: 'Opportunity', align: 'text-left  w-32' },
                { label: 'Price',       align: 'text-right' },
                { label: 'Labels',      align: 'text-left' },
              ].map(({ label, align }) => (
                <th
                  key={label}
                  className={[
                    'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500',
                    align,
                  ].join(' ')}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-space-700">
            {tokens.map((token) => {
              const s = token.scoreSnapshot;
              return (
                <tr
                  key={token.address}
                  className="group transition-all duration-150 hover:bg-space-750/70"
                >
                  {/* Token */}
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/token/${token.address}`}
                      className="flex items-center gap-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-space-600 text-xs font-bold text-slate-200">
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
                    </Link>
                  </td>

                  {/* Verdict */}
                  <td className="px-4 py-3.5">
                    <VerdictBadge verdict={s.verdict} />
                  </td>

                  {/* Overall score */}
                  <td className="w-36 px-4 py-3.5">
                    <ScoreMeter score={s.overall} size="sm" />
                  </td>

                  {/* Risk sub-score */}
                  <td className="w-32 px-4 py-3.5">
                    <SubBar value={s.risk} color="text-danger-400" />
                  </td>

                  {/* Opportunity sub-score */}
                  <td className="w-32 px-4 py-3.5">
                    <SubBar value={s.opportunity} color="text-success-400" />
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3.5 text-right font-mono text-slate-200">
                    {formatPrice(token.price)}
                  </td>

                  {/* Labels */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {s.labels.slice(0, 3).map((lbl) => (
                        <Badge key={lbl} variant={LABEL_VARIANT[lbl]}>
                          {lbl}
                        </Badge>
                      ))}
                      {s.labels.length > 3 && (
                        <Badge variant="default">+{s.labels.length - 3}</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-space-700 px-5 py-3">
        <Link
          href="/scores"
          className="text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          View full score board →
        </Link>
      </div>
    </div>
  );
}
