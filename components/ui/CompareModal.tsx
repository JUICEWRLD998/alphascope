'use client';

import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useCompare, type CompareToken } from '@/lib/compare';
import { cn, formatPrice, getScoreTextColor } from '@/lib/utils';

// ─── Radar chart ──────────────────────────────────────────────────────────────

const DIMS = ['Risk', 'Opportunity', 'Momentum', 'Liquidity', 'Security'] as const;
const N = DIMS.length;
const CX = 150;
const CY = 150;
const R  = 110;
const LEVELS = 4;

// Angle for dimension i — start from top (−π/2), go clockwise
function angle(i: number) {
  return (Math.PI * 2 * i) / N - Math.PI / 2;
}

function toXY(i: number, ratio: number) {
  const a = angle(i);
  return { x: CX + R * ratio * Math.cos(a), y: CY + R * ratio * Math.sin(a) };
}

const GRID_POINTS = Array.from({ length: N }, (_, i) => toXY(i, 1));
const AXIS_ENDPOINTS = GRID_POINTS;

function gridPolygon(ratio: number) {
  return Array.from({ length: N }, (_, i) => {
    const { x, y } = toXY(i, ratio);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function scorePolygon(scores: number[]) {
  return scores.map((s, i) => {
    const { x, y } = toXY(i, s / 100);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

const TOKEN_COLORS = [
  { stroke: '#06b6d4', fill: '#06b6d415' }, // accent (cyan)
  { stroke: '#a855f7', fill: '#a855f715' }, // purple
  { stroke: '#f59e0b', fill: '#f59e0b15' }, // warning (amber)
];

function RadarChart({ tokens }: { tokens: CompareToken[] }) {
  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto" aria-label="Score radar chart">
      {/* Grid rings */}
      {Array.from({ length: LEVELS }, (_, lvl) => {
        const ratio = (lvl + 1) / LEVELS;
        return (
          <polygon
            key={lvl}
            points={gridPolygon(ratio)}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
          />
        );
      })}

      {/* Axes */}
      {Array.from({ length: N }, (_, i) => {
        const { x, y } = AXIS_ENDPOINTS[i];
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="#334155"
            strokeWidth="1"
          />
        );
      })}

      {/* Dimension labels */}
      {Array.from({ length: N }, (_, i) => {
        const { x, y } = toXY(i, 1.25);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400"
            fontSize="10"
            fontWeight="600"
          >
            {DIMS[i]}
          </text>
        );
      })}

      {/* Token polygons */}
      {tokens.map((token, ti) => {
        const scores = [
          token.risk,
          token.opportunity,
          token.momentum,
          token.liquidity,
          token.security,
        ];
        const color = TOKEN_COLORS[ti % TOKEN_COLORS.length];
        return (
          <g key={token.address}>
            <polygon
              points={scorePolygon(scores)}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              opacity="0.9"
            />
            {/* Data points */}
            {scores.map((s, di) => {
              const { x, y } = toXY(di, s / 100);
              return (
                <circle
                  key={di}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color.stroke}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Score bar row ─────────────────────────────────────────────────────────────

function ScoreRow({
  label,
  values,
}: {
  label: string;
  values: number[];
}) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: `5rem repeat(${values.length}, 1fr)` }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {values.map((v, i) => {
        const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className={cn('w-6 font-mono text-[11px] font-bold tabular-nums', getScoreTextColor(v))}>
              {v}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-space-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${v}%`, backgroundColor: color.stroke }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function CompareModal() {
  const { tokens, isOpen, closeModal, remove } = useCompare();

  if (!isOpen || tokens.length < 2) return null;

  const dims: { label: string; key: keyof CompareToken }[] = [
    { label: 'Overall',     key: 'overallScore' },
    { label: 'Risk',        key: 'risk' },
    { label: 'Opportunity', key: 'opportunity' },
    { label: 'Momentum',    key: 'momentum' },
    { label: 'Liquidity',   key: 'liquidity' },
    { label: 'Security',    key: 'security' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-4 z-50 m-auto flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-2xl border border-space-600 bg-space-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Token Comparison"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-700 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">Token Comparison</h2>
            <p className="text-xs text-slate-500">Side-by-side score analysis</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-space-700 hover:text-slate-200"
            aria-label="Close comparison"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Token headers */}
          <div className="mb-6 grid gap-3" style={{ gridTemplateColumns: `5rem repeat(${tokens.length}, 1fr)` }}>
            <div />
            {tokens.map((token, i) => {
              const color = TOKEN_COLORS[i % TOKEN_COLORS.length];
              return (
                <div key={token.address} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color.stroke }} />
                    <Link
                      href={`/token/${token.address}`}
                      onClick={closeModal}
                      className="min-w-0 truncate font-semibold text-slate-100 hover:text-accent-300 transition-colors"
                    >
                      {token.symbol}
                    </Link>
                    <a
                      href={`https://solscan.io/token/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-slate-600 hover:text-accent-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(token.address)}
                      className="ml-auto shrink-0 text-slate-600 hover:text-danger-400"
                      aria-label={`Remove ${token.symbol}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'rounded border px-1.5 py-px text-[10px] font-bold uppercase tracking-widest',
                      token.verdict === 'BUY'   ? 'border-success-500/30 bg-success-500/10 text-success-400' :
                      token.verdict === 'AVOID' ? 'border-danger-500/30  bg-danger-500/10  text-danger-400'  :
                                                  'border-warning-500/30 bg-warning-500/10 text-warning-400',
                    )}>
                      {token.verdict}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{formatPrice(token.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Radar chart */}
          <div className="mb-6 flex justify-center">
            <RadarChart tokens={tokens} />
          </div>

          {/* Score rows */}
          <div className="space-y-3 rounded-xl border border-space-700 bg-space-850/50 p-4">
            {dims.map(({ label, key }) => (
              <ScoreRow
                key={label}
                label={label}
                values={tokens.map((t) => t[key] as number)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
