'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import {
  Search, Bell, ChevronDown, Sun, Moon, Menu, Loader2, ArrowRight, X,
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { formatNumber, formatPrice, getChangeColor, formatPercent, cn } from '@/lib/utils';
import type { SearchResultToken } from '@/app/api/tokens/search/route';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',    subtitle: 'Overview of all onchain signals' },
  '/radar':      { title: 'Token Radar',  subtitle: 'Newly launched tokens in real time' },
  '/trending':   { title: 'Trending',     subtitle: 'Volume & momentum breakouts' },
  '/scores':     { title: 'Score Board',  subtitle: 'AI-powered risk & opportunity scores' },
  '/watchlist':  { title: 'Watchlist',    subtitle: 'Your tracked tokens' },
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

// ─── Token result row ─────────────────────────────────────────────────────────

function ResultRow({ token, onSelect }: { token: SearchResultToken; onSelect: () => void }) {
  const changeColor = getChangeColor(token.priceChange24hPercent);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-space-700/60"
    >
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-space-700">
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-500">
          {token.symbol.slice(0, 2).toUpperCase()}
        </span>
        {token.logoURI && (
          <Image src={token.logoURI} alt={token.symbol} fill unoptimized className="rounded-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{token.symbol}</p>
        <p className="truncate text-[10px] text-slate-500">{token.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-xs text-slate-200">{formatPrice(token.price)}</p>
        <p className={cn('font-mono text-[10px] font-bold', changeColor)}>
          {formatPercent(token.priceChange24hPercent)}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[9px] uppercase tracking-wider text-slate-600">Vol</p>
        <p className="font-mono text-[10px] text-slate-400">${formatNumber(token.v24hUSD)}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
    </button>
  );
}

// ─── Search box ───────────────────────────────────────────────────────────────

const SOL_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function SearchBox({ chain }: { chain: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const navigateTo = useCallback((address: string) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    router.push(`/token/${address}`);
  }, [router]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setOpen(true);

    if (SOL_ADDRESS_RE.test(trimmed)) {
      setLoading(false);
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tokens/search?q=${encodeURIComponent(trimmed)}&chain=${chain}`,
        );
        const data = await res.json() as { results: SearchResultToken[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [chain]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setOpen(false);
      return;
    }
    if (e.key === 'Enter' && query.trim()) {
      if (SOL_ADDRESS_RE.test(query.trim())) {
        navigateTo(query.trim());
      } else if (results.length > 0) {
        navigateTo(results[0].address);
      }
    }
  };

  const isAddress = SOL_ADDRESS_RE.test(query.trim());
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="relative mx-auto hidden w-full max-w-sm md:block">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-accent-500" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search token or paste address…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-space-600 bg-space-800/70 py-2 pl-9 pr-8 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent-500/50 focus:bg-space-750 focus:outline-none focus:ring-1 focus:ring-accent-500/20 transition-all duration-150"
          suppressHydrationWarning
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-space-600 bg-space-900 shadow-2xl shadow-black/40 ring-1 ring-white/5">
          {isAddress && (
            <button
              type="button"
              onClick={() => navigateTo(query.trim())}
              className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-space-700/60"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 ring-1 ring-accent-500/30">
                <Search className="h-3.5 w-3.5 text-accent-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-accent-300">Analyze this address</p>
                <p className="truncate font-mono text-[10px] text-slate-500">{query.trim()}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent-400" />
            </button>
          )}

          {!isAddress && results.length > 0 && (
            <div className="divide-y divide-space-700/40">
              {results.map((token) => (
                <ResultRow key={token.address} token={token} onSelect={() => navigateTo(token.address)} />
              ))}
              <div className="border-t border-space-700/40 px-3 py-2">
                <p className="text-[10px] text-slate-600">
                  Press <kbd className="rounded bg-space-700 px-1 py-px font-mono text-slate-400">Enter</kbd> to open top result
                </p>
              </div>
            </div>
          )}

          {!isAddress && loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {!isAddress && !loading && results.length === 0 && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-slate-400">No tokens found</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Try a ticker like <span className="text-slate-400">SOL</span> or paste a full token address
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────────────

export default function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [chain, setChain] = useState('solana');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Sync chain selector with the current URL search param on mount
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('chain');
    if (c) setChain(c);
  }, []);

  function handleChainChange(value: string) {
    setChain(value);
    router.push(`${pathname}?chain=${value}`);
  }

  const page = PAGE_TITLES[pathname] ?? { title: 'AlphaScope', subtitle: 'Token Analytics' };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-space-600 bg-space-900/80 px-4 lg:px-6 backdrop-blur-md">

      {/* ── Hamburger — mobile only ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden rounded-lg border border-space-600 bg-space-800/70 p-2 text-slate-500 transition-all duration-150 hover:border-space-500 hover:bg-space-700 hover:text-slate-200 active:scale-95 shrink-0"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <div className="shrink-0 min-w-0">
        <h1 className="truncate text-base font-semibold text-white">{page.title}</h1>
        <p className="truncate text-[11px] text-slate-500">{page.subtitle}</p>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <SearchBox chain={chain} />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="ml-auto flex shrink-0 items-center gap-2">

        {/* Chain selector */}
        <div className="relative hidden sm:block">
          <select
            value={chain}
            onChange={(e) => handleChainChange(e.target.value)}
            className="appearance-none cursor-pointer rounded-lg border border-space-600 bg-space-800 py-2 pl-3 pr-7 text-sm text-slate-200 focus:outline-none focus:border-accent-500/60 transition-colors"
            suppressHydrationWarning
          >
            {SUPPORTED_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
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

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg border border-space-600 bg-space-800/70 p-2 text-slate-500 transition-all duration-150 hover:border-space-500 hover:bg-space-700 hover:text-slate-200 active:scale-95"
          aria-label="Toggle theme"
        >
          {!mounted || resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
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
