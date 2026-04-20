import Link from 'next/link';
import { ArrowLeft, ExternalLink, Clock } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import ScoreMeter from '@/components/ui/ScoreMeter';
import { formatAddress } from '@/lib/utils';

interface PageProps {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { address } = await params;
  return {
    title: `Token ${formatAddress(address, 6)}`,
  };
}

export default async function TokenDetailPage({ params }: PageProps) {
  const { address } = await params;

  return (
    <div className="space-y-6">

      {/* ── Back nav ─────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* ── Token hero ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-space-700 text-xl font-bold text-slate-200">
          TK
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Token</h1>
            <Badge variant="info">Solana</Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-sm text-slate-500">{address}</p>
            <a
              href={`https://solscan.io/token/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 transition-colors hover:text-accent-400"
              aria-label="View on Solscan"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Coming soon placeholder ───────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-space-600 bg-space-800 py-20 text-center">
        <Clock className="h-10 w-10 text-slate-600" />
        <div>
          <p className="font-semibold text-slate-300">Token Detail View</p>
          <p className="mt-1 text-sm text-slate-500">
            Full analytics coming in Step 2 — price charts, holder analysis,
            risk breakdown, and social signals.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-accent-500/10 px-4 py-2 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/20"
        >
          Return to Dashboard
        </Link>
      </div>

    </div>
  );
}
