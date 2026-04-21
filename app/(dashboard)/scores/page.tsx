import type { Metadata } from 'next';
import { Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Score Board — AlphaScope',
  description: 'AI-powered composite scores across risk, opportunity, momentum & liquidity for trending Solana tokens.',
};

export default function ScoresPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-accent-500/30 bg-accent-500/10">
        <Zap className="h-9 w-9 text-accent-400" />
      </div>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-400">
        Coming Soon
      </span>

      {/* Heading */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Score Board</h1>
        <p className="max-w-md text-sm text-slate-500">
          AI-powered composite scores across Risk, Opportunity, Momentum &amp; Liquidity for every trending Solana token — ranked and filterable in real time.
        </p>
      </div>

      {/* Feature list */}
      <ul className="mt-2 space-y-1.5 text-left text-sm text-slate-500">
        {[
          'BUY / WATCH / AVOID verdicts powered by on-chain data',
          'Sub-score breakdown: Risk · Opportunity · Momentum · Liquidity',
          'Filter by verdict, sort by any dimension',
          'Star tokens directly into your Watchlist',
        ].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 text-accent-500">✦</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
