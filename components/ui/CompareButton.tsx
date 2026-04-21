'use client';

import { GitCompare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompare, type CompareToken } from '@/lib/compare';

interface CompareButtonProps {
  token: CompareToken;
  className?: string;
}

export default function CompareButton({ token, className }: CompareButtonProps) {
  const { has, add, remove, tokens } = useCompare();
  const selected = has(token.address);
  const full = tokens.length >= 3 && !selected;

  return (
    <button
      type="button"
      disabled={full}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        selected ? remove(token.address) : add(token);
      }}
      aria-label={selected ? 'Remove from compare' : 'Add to compare'}
      title={full ? 'Max 3 tokens for comparison' : selected ? 'Remove from compare' : 'Add to compare'}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150',
        selected
          ? 'border-accent-500/40 bg-accent-500/10 text-accent-400 hover:bg-accent-500/20'
          : 'border-space-600 bg-space-800/50 text-slate-600 hover:border-space-500 hover:text-slate-300',
        full && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {selected ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <GitCompare className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
