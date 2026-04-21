'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWatchlist } from '@/lib/watchlist';

interface WatchlistButtonProps {
  address: string;
  className?: string;
}

export default function WatchlistButton({ address, className }: WatchlistButtonProps) {
  const { has, toggle, hydrated } = useWatchlist();
  const watched = has(address);

  return (
    <button
      type="button"
      disabled={!hydrated}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(address);
      }}
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150',
        watched
          ? 'border-warning-500/40 bg-warning-500/10 text-warning-400 hover:bg-warning-500/20'
          : 'border-space-600 bg-space-800/50 text-slate-600 hover:border-space-500 hover:text-slate-300',
        !hydrated && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      <Star className={cn('h-3.5 w-3.5 transition-all', watched && 'fill-warning-400')} />
    </button>
  );
}
