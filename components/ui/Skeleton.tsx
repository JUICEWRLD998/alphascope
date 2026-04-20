import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-space-700',
        className,
      )}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-space-800 rounded-xl border border-space-600 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
