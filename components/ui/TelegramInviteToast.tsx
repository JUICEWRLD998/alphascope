'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { TELEGRAM_GROUP_URL } from '@/lib/constants';

// ─── Configuration ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'telegram-toast-dismissed';
const SHOW_DELAY_MS = 1_200;
const AUTO_DISMISS_MS = 5_000;
const EXIT_DURATION_MS = 300;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TelegramInviteToast() {
  // `render` keeps the element in the DOM during the exit animation
  const [render, setRender] = useState(false);
  // `show` drives the CSS enter/exit transition
  const [show, setShow] = useState(false);

  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
    setTimeout(() => setRender(false), EXIT_DURATION_MS);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const showTimer = setTimeout(() => {
      setRender(true);
      // Two rAF frames so the element is painted before we apply the class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShow(true);
          autoTimerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
        });
      });
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(showTimer);
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [dismiss]);

  if (!render) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-space-600 bg-space-900 p-4 shadow-2xl',
        'transition-all duration-300 ease-out',
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      ].join(' ')}
    >
      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-md p-1 text-space-400 transition-colors hover:text-space-100"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5 pr-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500/15">
          <Send className="h-3.5 w-3.5 text-accent-400" />
        </div>
        <p className="text-sm font-semibold text-space-100">Get Real-Time Alerts</p>
      </div>

      {/* Body */}
      <p className="mb-3 text-xs leading-relaxed text-space-400">
        Join our Telegram group to receive instant alerts on trending breakouts, new token
        opportunities, and high-risk signals.
      </p>

      {/* CTA */}
      <a
        href={TELEGRAM_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-400"
      >
        <Send className="h-3 w-3" />
        Join Telegram Group
      </a>
    </div>
  );
}
