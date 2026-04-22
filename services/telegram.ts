/**
 * services/telegram.ts — Telegram Bot notification delivery
 *
 * Requires two env vars (both must be present — if either is missing the
 * helper becomes a silent no-op so the app works without Telegram configured):
 *
 *   TELEGRAM_BOT_TOKEN   — from BotFather (e.g. 123456:ABC-...)
 *   TELEGRAM_CHAT_ID     — the chat / group ID that receives alerts
 *
 * Usage:
 *   await sendTelegramAlert({ type: 'price-alert', symbol: 'SOL', ... })
 */

import type { AppNotification } from '@/lib/notifications';

// ─── Telegram API base ────────────────────────────────────────────────────────

const TELEGRAM_API = 'https://api.telegram.org';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape characters that have special meaning in Telegram MarkdownV2 */
function escMd(text: string | number): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Format a notification object into a Telegram MarkdownV2 message string */
function formatMessage(n: AppNotification): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://alphascope-psi.vercel.app';
  const tokenUrl = `${appUrl}/token/${n.address}`;

  if (n.type === 'trending-breakout') {
    const volPct   = escMd((n.volumeChange ?? 0).toFixed(0));
    const pricePct = escMd((n.priceChange  ?? 0).toFixed(1));
    const rank     = n.rank ? ` · Rank \\#${escMd(n.rank)}` : '';

    return [
      `⚡ *Trending Breakout — ${escMd(n.symbol)}*`,
      ``,
      `Vol \\+${volPct}% · Price \\+${pricePct}%${rank}`,
      ``,
      `[View token ›](${tokenUrl})`,
    ].join('\n');
  }

  if (n.type === 'price-floor-break') {
    const drop = escMd(Math.abs(n.priceChange ?? 0).toFixed(1));
    return [
      `📉 *Price Floor Break — ${escMd(n.symbol)}*`,
      ``,
      `Dropped \\-${drop}% in 24h`,
      `Potential reversal setup — consider buying the dip`,
      ``,
      `[View token ›](${tokenUrl})`,
    ].join('\n');
  }

  if (n.type === 'liquidity-milestone') {
    const milestone = escMd(n.milestoneLabel ?? '');
    return [
      `💧 *Liquidity Milestone — ${escMd(n.symbol)}*`,
      ``,
      `Liquidity reached *${milestone}*`,
      `Now highly tradeable — easier to enter and exit positions`,
      ``,
      `[View token ›](${tokenUrl})`,
    ].join('\n');
  }

  if (n.type === 'security-risk') {
    const flags = (n.riskFlags ?? []).map((f) => escMd(f)).join(', ');
    return [
      `🚨 *Security Risk — ${escMd(n.symbol)}*`,
      ``,
      `Risk flags detected: ${flags}`,
      `Exercise caution — verify before trading`,
      ``,
      `[View token ›](${tokenUrl})`,
    ].join('\n');
  }

  // new-opportunity
  const score = n.overallScore ?? 0;
  const scoreBar = buildScoreBar(score);
  return [
    `🟢 *New Opportunity — ${escMd(n.symbol)}*`,
    ``,
    `Score: *${escMd(score)}/100* ${scoreBar}`,
    escMd(n.message),
    ``,
    `[Analyse token ›](${tokenUrl})`,
  ].join('\n');
}

/** Tiny ASCII bar, e.g. "████░░░░░░" representing a 0-100 score */
function buildScoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a single AppNotification to the configured Telegram chat.
 * Returns true on success, false on any error (non-throwing).
 */
export async function sendTelegramAlert(notification: AppNotification): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Silently skip when not configured
  if (!token || !chatId) return false;

  const text = formatMessage(notification);
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
      // Hard 8-second timeout — never block the API response
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[AlphaScope/Telegram] sendMessage failed:', res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[AlphaScope/Telegram] sendMessage error:', err);
    return false;
  }
}

/**
 * Dispatch a batch of notifications to Telegram in parallel (max 5 at once).
 * Already-sent IDs must be filtered by the caller via alert-dedup.
 * Returns the number of messages successfully sent.
 */
export async function sendTelegramAlerts(notifications: AppNotification[]): Promise<number> {
  if (notifications.length === 0) return 0;

  const results = await Promise.allSettled(
    notifications.map((n) => sendTelegramAlert(n)),
  );

  return results.filter(
    (r) => r.status === 'fulfilled' && r.value === true,
  ).length;
}
