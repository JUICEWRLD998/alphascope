'use client';

import { GitCompare, X, BarChart2 } from 'lucide-react';
import { useCompare } from '@/lib/compare';
import { cn } from '@/lib/utils';

export default function CompareTray() {
  const { tokens, remove, openModal, clear } = useCompare();

  if (tokens.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 z-40 -translate-x-1/2',
        'flex items-center gap-2 rounded-2xl border border-space-500',
        'bg-space-900/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-md',
        'transition-all duration-300',
      )}
    >
      {/* Token chips */}
      <div className="flex items-center gap-1.5">
        {tokens.map((t, i) => {
          const colors = ['border-accent-500/50 text-accent-300', 'border-purple-500/50 text-purple-300', 'border-warning-500/50 text-warning-300'];
          return (
            <div
              key={t.address}
              className={cn(
                'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold',
                colors[i % colors.length],
              )}
            >
              <span>{t.symbol}</span>
              <button
                type="button"
                onClick={() => remove(t.address)}
                aria-label={`Remove ${t.symbol} from compare`}
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        {/* Placeholder slot */}
        {tokens.length < 3 && (
          <div className="flex items-center gap-1 rounded-lg border border-dashed border-space-600 px-2 py-1 text-[10px] text-slate-600">
            + add token
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-space-600" />

      {/* Compare button */}
      <button
        type="button"
        onClick={openModal}
        disabled={tokens.length < 2}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
          tokens.length >= 2
            ? 'bg-accent-500 text-white hover:bg-accent-400'
            : 'bg-space-700 text-slate-600 cursor-not-allowed',
        )}
      >
        <BarChart2 className="h-3.5 w-3.5" />
        Compare
        {tokens.length >= 2 && ` (${tokens.length})`}
      </button>

      {/* Clear */}
      <button
        type="button"
        onClick={clear}
        aria-label="Clear comparison"
        className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-space-700 hover:text-slate-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
