'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard',    subtitle: 'Overview of all onchain signals' },
  '/radar':     { title: 'Token Radar',  subtitle: 'Newly launched tokens in real time' },
  '/trending':  { title: 'Trending',     subtitle: 'Volume & momentum breakouts' },
  '/scores':    { title: 'Score Board',  subtitle: 'AI-powered risk & opportunity scores' },
  '/settings':  { title: 'Settings',     subtitle: 'Configure your API keys and preferences' },
};

export default function Header() {
  const pathname = usePathname();
  const [chain, setChain] = useState('solana');
  const [search, setSearch] = useState('');

  const page = PAGE_TITLES[pathname] ?? {
    title: 'AlphaScope',
    subtitle: 'Token Analytics',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-space-600 bg-space-900/80 px-6 backdrop-blur-md">

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <div className="shrink-0 min-w-0">
        <h1 className="truncate text-base font-semibold text-white">{page.title}</h1>
        <p className="truncate text-[11px] text-slate-500">{page.subtitle}</p>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600 transition-colors peer-focus:text-accent-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token or address…"
            className="peer w-full rounded-lg border border-space-600 bg-space-800/70 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent-500/50 focus:bg-space-750 focus:outline-none focus:ring-1 focus:ring-accent-500/20 transition-all duration-150"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="ml-auto flex shrink-0 items-center gap-2.5">

        {/* Chain selector */}
        <div className="relative">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="appearance-none cursor-pointer rounded-lg border border-space-600 bg-space-800 py-2 pl-3 pr-7 text-sm text-slate-200 focus:outline-none focus:border-accent-500/60 transition-colors"
            suppressHydrationWarning
          >
            {SUPPORTED_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-lg border border-space-600 bg-space-800/70 p-2 text-slate-500 transition-all duration-150 hover:border-space-500 hover:bg-space-700 hover:text-slate-200 active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger-500 ring-2 ring-space-900" />
        </button>

        {/* API status pill */}
        <div className="hidden items-center gap-1.5 rounded-lg border border-space-600 bg-space-800/70 px-3 py-2 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-400 shadow-[0_0_6px_0px_rgba(34,197,94,0.8)]" />
          <span className="text-xs text-slate-400">Live</span>
        </div>
      </div>
    </header>
  );
}
