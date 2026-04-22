'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radar,
  TrendingUp,
  BarChart3,
  Star,
  X,
  Activity,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME, NAV_LINKS } from '@/lib/constants';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP = {
  grid: LayoutDashboard,
  radar: Radar,
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  star: Star,
} as const;

type IconKey = keyof typeof ICON_MAP;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-space-900 border-r border-space-600',
        'transition-transform duration-300 ease-in-out',
        // Always visible on desktop; toggle-driven on mobile
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 border-b border-space-600 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-emerald-400 shadow-[0_0_16px_-4px_rgba(52,211,153,0.6)]">
          <Crosshair className="h-4.5 w-4.5 text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-bold tracking-tight text-white">{APP_NAME}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-400">
            Analytics
          </p>
        </div>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-space-700 hover:text-slate-200 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
          Menu
        </p>
        <ul className="space-y-0.5">
          {NAV_LINKS.map((link) => {
            const Icon = ICON_MAP[link.icon as IconKey];
            const isActive = pathname === link.href;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={[
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-accent-500/10 text-accent-300'
                      : 'text-slate-500 hover:bg-space-700/60 hover:text-slate-100',
                  ].join(' ')}
                >
                  {/* Active bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-400" />
                  )}
                  <Icon className={['h-4 w-4 shrink-0 transition-transform duration-150', !isActive && 'group-hover:scale-110'].join(' ')} />
                  <span className="flex-1">{link.label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_6px_0px_rgba(34,211,238,0.8)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Status footer ────────────────────────────────────────────────── */}
      <div className="border-t border-space-600 px-4 py-4 space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-space-800 px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-success-400" />
          <span className="text-xs text-slate-400">Live Data Feed</span>
          <span className="ml-auto animate-pulse text-xs text-success-400">●</span>
        </div>
        <p className="px-3 text-[10px] text-slate-600">
          Powered by{' '}
          <span className="font-medium text-slate-500">Birdeye API</span>
        </p>
      </div>
    </aside>
  );
}
