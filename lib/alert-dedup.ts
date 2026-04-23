/**
 * lib/alert-dedup.ts — In-process duplicate suppression for Telegram alerts
 *
 * Uses a module-level Set that lives for the lifetime of the Node.js server
 * process. This is sufficient for a single-instance deployment (dev server or
 * Vercel function warm instance) because:
 *
 *  • Notification IDs are already time-windowed in the notifications route
 *    (e.g. `price-<addr>-<10min-bucket>`) so the same economic event cannot
 *    generate a new ID for at least 10 minutes.
 *
 *  • The Set is capped at MAX_SENT_IDS entries to prevent memory growth if the
 *    server stays warm for a very long time.
 *
 * Trade-off: on a cold start (new Vercel invocation, server restart) the Set
 * is empty, so a single duplicate send per event window is possible.
 */

const MAX_SENT_IDS = 500;

// Module-level singleton — shared across all requests in the same process
const sentIds = new Set<string>();

/**
 * Returns true if this notification ID has NOT been sent before and records it
 * as sent. Returns false (skip) if it was already dispatched.
 */
export function shouldSend(id: string): boolean {
  if (sentIds.has(id)) return false;

  sentIds.add(id);

  // Prune oldest entries when cap is reached
  if (sentIds.size > MAX_SENT_IDS) {
    const oldest = [...sentIds].slice(0, sentIds.size - MAX_SENT_IDS);
    for (const old of oldest) sentIds.delete(old);
  }

  return true;
}

/**
 * Convenience: filter an array of notifications down to only those that
 * have not yet been dispatched, and mark each returned item as sent.
 */
export function filterUnsent<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => shouldSend(item.id));
}
