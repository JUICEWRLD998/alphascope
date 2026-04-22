'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Bookmark, RefreshCw, Trash2 } from 'lucide-react';
import { useWatchlist } from '@/lib/watchlist';
import { scoreToken, buildScoringInput } from '@/lib/scoring';
import type { ScoredEntry, BirdeyeToken } from '@/lib/types';
import ScoreBoardClient from '@/app/(dashboard)/scores/_components/ScoreBoardClient';
import AnimateIn from '@/components/ui/AnimateIn';

export default function WatchlistPage() {
  const { items, clear, hydrated } = useWatchlist();
  const [entries, setEntries] = useState<ScoredEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch sequentially to respect Birdeye's 150ms rate limit (free tier)
    (async () => {
      const results: ScoredEntry[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const { address } = items[i];
        try {
          const res = await fetch(`/api/tokens/overview?address=${encodeURIComponent(address)}`);
          if (!res.ok) continue;
          
          const token = await res.json() as BirdeyeToken;
          const input = buildScoringInput(token, null);
          const score = scoreToken(input);
          const entry: ScoredEntry = {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            logoURI: token.logoURI,
            price: token.price,
            priceChange24hPercent: token.priceChange24hPercent,
            v24hUSD: token.v24hUSD,
            mc: token.mc,
            liquidity: token.liquidity,
            holder: token.holder,
            rank: i + 1,
            score,
          };
          results.push(entry);
        } catch {
          // Skip failed fetches silently
        }
      }
      
      setEntries(results);
      setLoading(false);
    })();
  }, [items, hydrated]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimateIn>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100">
              <Star className="h-5 w-5 fill-warning-400 text-warning-400" />
              Watchlist
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {hydrated
                ? `${items.length} token${items.length !== 1 ? 's' : ''} tracked — scores refresh on load`
                : 'Loading…'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1.5 self-start rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-1.5 text-xs font-medium text-danger-400 transition-colors hover:bg-danger-500/20 sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </AnimateIn>

      {/* Empty state */}
      {hydrated && items.length === 0 && (
        <AnimateIn delay={0.05}>
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-space-600 bg-space-800">
              <Bookmark className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-300">No tokens in watchlist</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Star any token on the Radar, Trending, or Token Detail pages to track it here.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/radar"
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-400"
              >
                Browse Radar
              </Link>
              <Link
                href="/trending"
                className="rounded-lg border border-space-600 bg-space-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
              >
                Trending
              </Link>
            </div>
          </div>
        </AnimateIn>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading watchlist tokens…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 px-5 py-4 text-sm text-danger-300">
          {error}
        </div>
      )}

      {/* Score board */}
      {!loading && entries.length > 0 && (
        <AnimateIn delay={0.05}>
          <ScoreBoardClient entries={entries} />
        </AnimateIn>
      )}
    </div>
  );
}
