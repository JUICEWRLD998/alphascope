'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bell,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCheck,
  Loader2,
  Clock,
} from 'lucide-react';
import { useNotificationStore, type AppNotification } from '@/lib/notifications';
import { cn, timeAgo } from '@/lib/utils';

// ─── Configuration ────────────────────────────────────────────────────────────

const POLL_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  /** Whether the dropdown is visible */
  open: boolean;
  /** Called when user interacts outside or clicks a notification link */
  onClose: () => void;
  /** Reports the current unread count so the parent can show the badge dot */
  onUnreadChange: (count: number) => void;
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function NotificationPanel({
  open,
  onClose,
  onUnreadChange,
}: NotificationPanelProps) {
  const { markAllRead, isRead } = useNotificationStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const chainRef = useRef<string>('solana');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ chain: chainRef.current });
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: AppNotification[] };
      setNotifications(data.notifications);
    } catch {
      // Network error — keep previous notifications
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll every 60s
  useEffect(() => {
    const timer = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Sync the chain selector from the URL on the client
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('chain');
    if (c) chainRef.current = c;
  }, []);

  // Report unread count to parent whenever notifications or readIds change
  useEffect(() => {
    const count = notifications.filter((n) => !isRead(n.id)).length;
    onUnreadChange(count);
  }, [notifications, isRead, onUnreadChange]);

  // Mark all as read the moment the panel opens
  useEffect(() => {
    if (open && notifications.length > 0) {
      markAllRead(notifications.map((n) => n.id));
    }
  }, [open, notifications, markAllRead]);

  // ── Derived lists ────────────────────────────────────────────────────────
  const breakouts     = notifications.filter((n) => n.type === 'trending-breakout');
  const opportunities = notifications.filter((n) => n.type === 'new-opportunity');
  const isEmpty = !loading && notifications.length === 0;
  const isFirstLoad = loading && notifications.length === 0;

  return (
    <div
      className={cn(
        'absolute right-0 top-full mt-2 z-50',
        'w-[min(380px,calc(100vw-2rem))]',
        'overflow-hidden rounded-2xl border border-space-600 bg-space-900',
        'shadow-2xl shadow-black/50 ring-1 ring-white/5',
        'transition-all duration-200 ease-out origin-top-right',
        open
          ? 'scale-100 opacity-100 pointer-events-auto'
          : 'scale-95 opacity-0 pointer-events-none',
      )}
    >
      {/* ── Panel header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-space-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent-400" />
          <p className="text-sm font-semibold text-slate-100">Notifications</p>
          {loading && notifications.length > 0 && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
          )}
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={() => markAllRead(notifications.map((n) => n.id))}
            className="flex items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-accent-400"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div className="max-h-110 overflow-y-auto divide-y divide-space-700/40">

        {/* Trending breakouts section */}
        {breakouts.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-space-800/80 px-4 py-2 backdrop-blur-sm">
              <Zap className="h-3 w-3 text-warning-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Trending Breakouts
              </p>
            </div>
            {breakouts.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                unread={!isRead(n.id)}
                onClose={onClose}
              />
            ))}
          </section>
        )}

        {/* New opportunities section */}
        {opportunities.length > 0 && (
          <section>
            <div className="sticky top-0 z-10 flex items-center gap-1.5 bg-space-800/80 px-4 py-2 backdrop-blur-sm">
              <TrendingUp className="h-3 w-3 text-success-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                New Opportunities
              </p>
            </div>
            {opportunities.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                unread={!isRead(n.id)}
                onClose={onClose}
              />
            ))}
          </section>
        )}

        {/* First-load skeleton */}
        {isFirstLoad && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking signals…
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-space-600 bg-space-800">
              <Bell className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">All caught up</p>
              <p className="mt-1 max-w-55 text-xs leading-relaxed text-slate-600">
                No breakouts or new opportunities detected in the last 6 hours.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="border-t border-space-700/60 bg-space-900 px-4 py-2.5">
        <p className="text-center text-[10px] text-slate-600">
          Refreshes every 60s · Live market signals
        </p>
      </div>
    </div>
  );
}

// ─── Individual notification row ──────────────────────────────────────────────

function NotificationRow({
  notification: n,
  unread,
  onClose,
}: {
  notification: AppNotification;
  unread: boolean;
  onClose: () => void;
}) {
  const isOpportunity = n.type === 'new-opportunity';
  const isBreakout    = n.type === 'trending-breakout';

  return (
    <Link
      href={`/token/${n.address}`}
      onClick={onClose}
      className={cn(
        'group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-space-800/60',
        unread && 'bg-accent-500/4',
      )}
    >
      {/* Unread indicator bar */}
      <div
        className={cn(
          'mt-1 h-full w-0.5 shrink-0 self-stretch rounded-full',
          unread ? 'bg-accent-500' : 'bg-transparent',
        )}
      />

      {/* Token logo */}
      <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-space-700">
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-500">
          {n.symbol.slice(0, 2).toUpperCase()}
        </span>
        {n.logoURI && (
          <Image
            src={n.logoURI}
            alt={n.symbol}
            fill
            unoptimized
            className="rounded-full object-cover"
          />
        )}
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-100">{n.title}</p>
          {unread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{n.message}</p>

        {/* Chips row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Volume change chip — breakout only */}
          {isBreakout && n.volumeChange !== undefined && (
            <span className="rounded-full bg-warning-500/10 px-2 py-0.5 text-[10px] font-bold text-warning-400">
              Vol +{n.volumeChange.toFixed(0)}%
            </span>
          )}

          {/* Price change chip — breakout only */}
          {isBreakout && n.priceChange !== undefined && (
            <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-bold text-success-400">
              ▲ {n.priceChange.toFixed(1)}%
            </span>
          )}

          {/* Rank chip — breakout only */}
          {isBreakout && n.rank !== undefined && (
            <span className="rounded-full bg-space-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              #{n.rank}
            </span>
          )}

          {/* Score chip — opportunity only */}
          {isOpportunity && n.overallScore !== undefined && (
            <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-bold text-accent-400">
              Score {n.overallScore}
            </span>
          )}

          {/* Verdict chip — opportunity only */}
          {isOpportunity && n.verdict && (
            <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[10px] font-bold text-success-400">
              {n.verdict}
            </span>
          )}

          {/* Timestamp */}
          <span className="flex items-center gap-0.5 text-[10px] text-slate-600">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(Math.floor(n.timestamp / 1000))}
          </span>
        </div>
      </div>

      <ArrowRight className="mt-1 h-4 w-4 shrink-0 self-center text-slate-600 transition-colors group-hover:text-slate-300" />
    </Link>
  );
}
