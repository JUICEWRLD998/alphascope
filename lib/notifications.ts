'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new-opportunity'
  | 'trending-breakout'
  | 'price-floor-break'
  | 'liquidity-milestone'
  | 'security-risk';

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Short headline shown in the row title */
  title: string;
  /** Secondary line of text */
  message: string;
  address: string;
  symbol: string;
  logoURI?: string;
  /** Signed % change — present on price-alert notifications */
  priceChange?: number;
  /** Verdict from the scoring engine — present on new-opportunity notifications */
  verdict?: 'BUY' | 'WATCH' | 'AVOID';
  /** Overall score 0-100 — present on new-opportunity notifications */
  overallScore?: number;
  /** 24h volume change % — present on trending-breakout notifications */
  volumeChange?: number;
  /** DEX rank — present on trending-breakout notifications */
  rank?: number;
  /** Current liquidity USD — present on liquidity-milestone notifications */
  liquidityUSD?: number;
  /** Milestone label e.g. "$1M" — present on liquidity-milestone notifications */
  milestoneLabel?: string;
  /** Risk flag names — present on security-risk notifications */
  riskFlags?: string[];
  /** Unix ms timestamp of the event */
  timestamp: number;
}

// ─── localStorage key ─────────────────────────────────────────────────────────

const READ_KEY = 'alphascope-notifications-read-v1';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Tracks which notification IDs the user has already seen (persisted to
 * localStorage so the unread dot survives page refreshes).
 */
export function useNotificationStore() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (raw) setReadIds(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore parse errors */ }
    setHydrated(true);
  }, []);

  /** Mark a list of notification IDs as read */
  const markAllRead = useCallback((ids: string[]) => {
    setReadIds((prev) => {
      const next = new Set([...prev, ...ids]);
      try {
        // Prune to the 200 most recent IDs to keep localStorage lean
        const pruned = [...next].slice(-200);
        localStorage.setItem(READ_KEY, JSON.stringify(pruned));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

  return { markAllRead, isRead, hydrated };
}
