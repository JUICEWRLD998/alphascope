'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'alphascope-watchlist-v1';

interface WatchlistItem {
  address: string;
  addedAt: number;
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as WatchlistItem[]);
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback((address: string) => {
    setItems((prev) => {
      const next = prev.some((i) => i.address === address)
        ? prev.filter((i) => i.address !== address)
        : [...prev, { address, addedAt: Date.now() }];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const has = useCallback(
    (address: string) => items.some((i) => i.address === address),
    [items],
  );

  const clear = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { items, toggle, has, hydrated, clear };
}
