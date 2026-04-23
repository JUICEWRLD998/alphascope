/**
 * lib/db.ts — Neon Postgres connection (raw SQL, no ORM)
 *
 * Uses the `postgres` npm package directly with a module-level singleton
 * so the connection is reused across requests in the same serverless instance.
 *
 * Required env var:
 *   DATABASE_URL — Neon connection string (pooled endpoint recommended)
 */

import postgres from 'postgres';

// Module-level singleton — reused in the same warm serverless invocation.
// Each cold start creates a fresh connection (Neon's pooler handles this cheaply).
let _sql: ReturnType<typeof postgres> | null = null;

export function getSql(): ReturnType<typeof postgres> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. Add it to .env.local (Neon connection string).',
      );
    }
    _sql = postgres(url, {
      ssl:             'require',
      max:             1,   // 1 connection per serverless invocation
      idle_timeout:    20,  // close idle connections quickly
      connect_timeout: 10,  // fail fast on cold network
    });
  }
  return _sql;
}
