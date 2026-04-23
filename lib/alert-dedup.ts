/**
 * lib/alert-dedup.ts — Duplicate suppression for Telegram alerts
 *
 * Primary (production): Neon Postgres — persists across server restarts and
 * cold starts, preventing duplicate Telegram messages even when the cron job
 * and client polling both fire at the same time.
 *
 * Fallback (dev without DATABASE_URL): In-memory Set — same behaviour as
 * before, scoped to the current process lifetime.
 *
 * The INSERT ... ON CONFLICT DO NOTHING pattern is atomic, so concurrent
 * invocations can never both return true for the same alert_id.
 */

import { getSql } from './db';

// ─── In-memory fallback (local dev without DATABASE_URL) ──────────────────────

const MAX_MEMORY_IDS = 500;
const memorySet = new Set<string>();

function memoryCheck(id: string): boolean {
  if (memorySet.has(id)) return false;
  memorySet.add(id);
  if (memorySet.size > MAX_MEMORY_IDS) {
    const oldest = [...memorySet].slice(0, memorySet.size - MAX_MEMORY_IDS);
    for (const old of oldest) memorySet.delete(old);
  }
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if this alert ID has NOT been sent before and atomically
 * records it as sent. Returns false if it was already dispatched.
 *
 * Uses Neon Postgres when DATABASE_URL is set; falls back to in-memory Set.
 */
export async function shouldSend(id: string, type = ''): Promise<boolean> {
  if (!process.env.DATABASE_URL) return memoryCheck(id);

  try {
    const sql = getSql();
    const result = await sql`
      INSERT INTO sent_alerts (alert_id, type)
      VALUES (${id}, ${type})
      ON CONFLICT (alert_id) DO NOTHING
      RETURNING id
    `;
    return result.length > 0;
  } catch {
    // If DB is temporarily unavailable, fall back to in-memory to avoid blocking
    console.warn('[alert-dedup] DB insert failed, using in-memory fallback for:', id);
    return memoryCheck(id);
  }
}

/**
 * Filters an array of notifications down to only those not yet dispatched,
 * and atomically marks each returned item as sent.
 */
export async function filterUnsent<T extends { id: string; type?: string }>(
  items: T[],
): Promise<T[]> {
  const results: T[] = [];
  for (const item of items) {
    if (await shouldSend(item.id, (item as { type?: string }).type ?? '')) {
      results.push(item);
    }
  }
  return results;
}
