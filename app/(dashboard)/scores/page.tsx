import type { Metadata } from 'next';
import { BarChart2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Score Board — AlphaScope',
};

export default function ScoresPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-space-600 bg-space-800">
        <BarChart2 className="h-7 w-7 text-slate-500" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Score Board — Coming Soon</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Composite risk &amp; opportunity scoring for trending tokens will be available in a future update.
        </p>
      </div>
    </div>
  );
}
