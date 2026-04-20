import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'accent';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-space-600 text-slate-400 border-space-500',
  success: 'bg-success-500/10 text-success-400 border-success-500/20',
  danger:  'bg-danger-500/10  text-danger-400  border-danger-500/20',
  warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  info:    'bg-accent-500/10  text-accent-400  border-accent-500/20',
  accent:  'bg-accent-500/20  text-accent-300  border-accent-500/30',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 tracking-wide',
  md: 'text-xs    px-2.5 py-1   tracking-wide',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded border font-medium font-mono uppercase',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
