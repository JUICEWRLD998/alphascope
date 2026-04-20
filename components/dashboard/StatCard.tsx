import type { ReactNode } from 'react';
import { cn, getChangeColor } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

type AccentColor = 'cyan' | 'green' | 'red' | 'amber';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: ReactNode;
  accentColor?: AccentColor;
}

const ACCENT: Record<AccentColor, { icon: string; ring: string; hover: string }> = {
  cyan:  { icon: 'bg-accent-500/10  text-accent-400',  ring: 'border-accent-500/15',  hover: 'hover:border-accent-500/40  hover:shadow-accent-500/10' },
  green: { icon: 'bg-success-500/10 text-success-400', ring: 'border-success-500/15', hover: 'hover:border-success-500/40 hover:shadow-success-500/10' },
  red:   { icon: 'bg-danger-500/10  text-danger-400',  ring: 'border-danger-500/15',  hover: 'hover:border-danger-500/40  hover:shadow-danger-500/10' },
  amber: { icon: 'bg-warning-500/10 text-warning-400', ring: 'border-warning-500/15', hover: 'hover:border-warning-500/40 hover:shadow-warning-500/10' },
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentColor = 'cyan',
}: StatCardProps) {
  const a = ACCENT[accentColor];
  const isUp = trend !== undefined && trend > 0;
  const isDown = trend !== undefined && trend < 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-space-800 p-5',
        'transition-all duration-200 hover:-translate-y-0.5 hover:bg-space-750 hover:shadow-xl',
        'border-space-600',
        a.ring,
        a.hover,
      )}
    >
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/2 to-transparent" />

      <div className="relative flex items-start justify-between gap-3">
        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
            {value}
          </p>

          {(trend !== undefined || subtitle) && (
            <div className="mt-1.5 flex items-center gap-2">
              {trend !== undefined && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-semibold tabular-nums',
                    getChangeColor(trend),
                  )}
                >
                  {isUp && <TrendingUp className="h-3 w-3" />}
                  {isDown && <TrendingDown className="h-3 w-3" />}
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-slate-600">{subtitle}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        <div className={cn('shrink-0 rounded-lg p-2.5 transition-transform duration-200 group-hover:scale-110', a.icon)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
