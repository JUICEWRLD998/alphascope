import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'accent';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-space-700 text-slate-400 ring-space-600',
  success: 'bg-success-500/12 text-success-400 ring-success-500/25',
  danger:  'bg-danger-500/12  text-danger-400  ring-danger-500/25',
  warning: 'bg-warning-500/12 text-warning-400 ring-warning-500/25',
  info:    'bg-accent-500/12  text-accent-400  ring-accent-500/25',
  accent:  'bg-accent-500/20  text-accent-300  ring-accent-500/35',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[9px] px-2 py-0.5 tracking-wider',
  md: 'text-[10px] px-2.5 py-1 tracking-wider',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-bold font-mono uppercase ring-1',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
