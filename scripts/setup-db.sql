-- scripts/setup-db.sql
-- Run this once in your Neon console to create the alert deduplication table.
--
-- How to run:
--   1. Open your Neon project → SQL Editor
--   2. Paste this file and click "Run"

CREATE TABLE IF NOT EXISTS sent_alerts (
  id        SERIAL      PRIMARY KEY,
  alert_id  TEXT        UNIQUE NOT NULL,
  type      TEXT        NOT NULL DEFAULT '',
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by alert_id (used by INSERT ... ON CONFLICT and SELECT EXISTS)
CREATE INDEX IF NOT EXISTS idx_sent_alerts_alert_id ON sent_alerts (alert_id);

-- Optional: auto-delete records older than 7 days to keep the table small.
-- Run as a one-off or schedule via pg_cron if available on your Neon plan.
-- DELETE FROM sent_alerts WHERE sent_at < NOW() - INTERVAL '7 days';
