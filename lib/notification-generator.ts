/**
 * lib/notification-generator.ts
 *
 * Shared notification generation + Telegram dispatch logic.
 * Called by:
 *   - GET /api/notifications  → client UI polling
 *   - GET /api/cron/notifications  → Vercel Cron job (24/7 independent dispatch)
 */

import { getNewListings, getTrendingTokens } from '@/services/birdeye';
import { scoreToken } from '@/lib/scoring';
import { sendTelegramAlerts } from '@/services/telegram';
import { filterUnsent } from '@/lib/alert-dedup';
import type { AppNotification } from '@/lib/notifications';
import type { BirdeyeNewListing, BirdeyeTrendingToken } from '@/lib/types';
import type { ScoringInput } from '@/lib/scoring';

// ─── Configuration ────────────────────────────────────────────────────────────

const OPPORTUNITY_MIN_SCORE    = 60;
const OPPORTUNITY_LIMIT        = 5;
const BREAKOUT_VOLUME_THRESHOLD = 100;
const BREAKOUT_PRICE_THRESHOLD  = 30;
const BREAKOUT_LIMIT           = 5;
const PRICE_DROP_THRESHOLD     = -30;
const PRICE_DROP_LIMIT         = 3;
const LIQUIDITY_MILESTONES     = [
  { threshold: 5_000_000, label: '$5M'   },
  { threshold: 1_000_000, label: '$1M'   },
  { threshold:   500_000, label: '$500K' },
] as const;
const LIQUIDITY_MILESTONE_LIMIT = 5;
const SECURITY_RISK_LABELS = [
  'mintable', 'freezeable', 'honeypot-risk', 'concentrated-supply',
] as const;
const SECURITY_RISK_LIMIT = 5;

// Telegram high-signal thresholds (higher bar than in-app to keep channel low-noise)
const TG_SCORE_THRESHOLD  = 70;
const TG_VOLUME_THRESHOLD = 150;
const TG_PRICE_THRESHOLD  = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listingToScoringInput(t: BirdeyeNewListing): ScoringInput {
  return {
    address:         t.address,
    price:           t.price,
    priceChange24h:  0,
    volume24h:       t.v24hUSD,
    volumeChange24h: 0,
    marketCap:       t.mc,
    liquidity:       t.liquidity,
    holders:         0,
    ageMinutes:      Math.max(0, Math.floor((Date.now() / 1000 - t.liquidityAddedAt) / 60)),
    security:           null,
    whaleActivityRatio: null,
  };
}

function isBreakout(t: BirdeyeTrendingToken): boolean {
  return (t.v24hChangePercent ?? 0) > BREAKOUT_VOLUME_THRESHOLD
    || (t.priceChange24hPercent ?? 0) > BREAKOUT_PRICE_THRESHOLD;
}

// ─── Notification generation ──────────────────────────────────────────────────

/**
 * Fetches live data and generates all notification types for the given chain.
 * Pure — does NOT send to Telegram. Call dispatchToTelegram() separately.
 */
export async function generateNotifications(chain = 'solana'): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const now = Date.now();

  const [newRes, trendRes] = await Promise.all([
    getNewListings({ chain, window: '6h', limit: 30 }),
    getTrendingTokens({ chain, limit: 20 }),
  ]);

  // ── 1. New token opportunities ────────────────────────────────────────────
  if (newRes.success && newRes.data?.items) {
    const opportunities = newRes.data.items
      .map((t) => ({ token: t, score: scoreToken(listingToScoringInput(t)) }))
      .filter(({ score }) => score.verdict === 'BUY' && score.overall >= OPPORTUNITY_MIN_SCORE)
      .sort((a, b) => b.score.overall - a.score.overall)
      .slice(0, OPPORTUNITY_LIMIT);

    for (const { token, score } of opportunities) {
      notifications.push({
        id:           `opp-${token.address}`,
        type:         'new-opportunity',
        title:        `${token.symbol} — New Opportunity`,
        message:      `Score ${score.overall}/100 · ${score.verdictReason}`,
        address:      token.address,
        symbol:       token.symbol,
        logoURI:      token.logoURI,
        verdict:      score.verdict,
        overallScore: score.overall,
        timestamp:    token.liquidityAddedAt * 1000,
      });
    }
  }

  // ── 2. Trending breakouts ─────────────────────────────────────────────────
  if (trendRes.success && trendRes.data?.tokens) {
    const breakouts = trendRes.data.tokens
      .filter(isBreakout)
      .slice(0, BREAKOUT_LIMIT);

    for (const token of breakouts) {
      const volChange   = token.v24hChangePercent ?? 0;
      const priceChange = token.priceChange24hPercent ?? 0;
      const signals: string[] = [];
      if (volChange   > BREAKOUT_VOLUME_THRESHOLD) signals.push(`Vol +${volChange.toFixed(0)}%`);
      if (priceChange > BREAKOUT_PRICE_THRESHOLD)  signals.push(`Price +${priceChange.toFixed(1)}%`);

      notifications.push({
        // Stable ID per 30-min window — prevents same breakout spamming on every run
        id:           `breakout-${token.address}-${Math.floor(now / 1_800_000)}`,
        type:         'trending-breakout',
        title:        `${token.symbol} — Breakout`,
        message:      signals.join(' · '),
        address:      token.address,
        symbol:       token.symbol,
        logoURI:      token.logoURI,
        volumeChange: volChange,
        priceChange:  priceChange,
        rank:         token.rank,
        timestamp:    now,
      });
    }
  }

  // ── 3. Price floor breaks ─────────────────────────────────────────────────
  if (trendRes.success && trendRes.data?.tokens) {
    const drops = trendRes.data.tokens
      .filter((t) => (t.priceChange24hPercent ?? 0) <= PRICE_DROP_THRESHOLD)
      .sort((a, b) => a.priceChange24hPercent - b.priceChange24hPercent)
      .slice(0, PRICE_DROP_LIMIT);

    for (const token of drops) {
      const drop = Math.abs(token.priceChange24hPercent).toFixed(1);
      notifications.push({
        id:          `price-drop-${token.address}-${Math.floor(now / 3_600_000)}`, // hourly dedup
        type:        'price-floor-break',
        title:       `${token.symbol} \u2014 Price Floor Break`,
        message:     `Dropped ${drop}% in 24h \u2014 potential reversal setup`,
        address:     token.address,
        symbol:      token.symbol,
        logoURI:     token.logoURI,
        priceChange: token.priceChange24hPercent,
        timestamp:   now,
      });
    }
  }

  // ── 4. Liquidity milestones ───────────────────────────────────────────────
  if (trendRes.success && trendRes.data?.tokens) {
    let milestoneCount = 0;
    for (const token of trendRes.data.tokens) {
      if (milestoneCount >= LIQUIDITY_MILESTONE_LIMIT) break;
      const liq = token.liquidity ?? 0;
      const milestone = LIQUIDITY_MILESTONES.find((m) => liq >= m.threshold);
      if (!milestone) continue;

      notifications.push({
        id:             `liq-milestone-${token.address}-${milestone.label}`,
        type:           'liquidity-milestone',
        title:          `${token.symbol} \u2014 Liquidity Milestone`,
        message:        `Liquidity reached ${milestone.label} \u2014 now highly tradeable`,
        address:        token.address,
        symbol:         token.symbol,
        logoURI:        token.logoURI,
        liquidityUSD:   liq,
        milestoneLabel: milestone.label,
        timestamp:      now,
      });
      milestoneCount++;
    }
  }

  // ── 5. Security risks ─────────────────────────────────────────────────────
  if (newRes.success && newRes.data?.items) {
    const riskTokens = newRes.data.items
      .map((t) => ({ token: t, score: scoreToken(listingToScoringInput(t)) }))
      .filter(({ score }) => {
        const flagCount = SECURITY_RISK_LABELS.filter((l) =>
          (score.labels as readonly string[]).includes(l),
        ).length;
        return flagCount >= 2;
      })
      .slice(0, SECURITY_RISK_LIMIT);

    for (const { token, score } of riskTokens) {
      const flags = SECURITY_RISK_LABELS.filter((l) =>
        (score.labels as readonly string[]).includes(l),
      );
      notifications.push({
        id:        `security-risk-${token.address}`,
        type:      'security-risk',
        title:     `${token.symbol} \u2014 Security Risk`,
        message:   `Risk flags: ${flags.join(', ')}`,
        address:   token.address,
        symbol:    token.symbol,
        logoURI:   token.logoURI,
        riskFlags: [...flags],
        timestamp: token.liquidityAddedAt * 1000,
      });
    }
  }

  return notifications;
}

// ─── Telegram dispatch ────────────────────────────────────────────────────────

/**
 * Filters notifications to high-signal only, deduplicates against the
 * database (via filterUnsent), and sends to the configured Telegram group.
 *
 * Safe to call from both the Cron job and the client-side GET endpoint —
 * the DB dedup ensures each alert is sent exactly once across all callers.
 */
export async function dispatchToTelegram(notifications: AppNotification[]): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  const highSignal = notifications.filter((n) => {
    if (n.type === 'new-opportunity')   return (n.overallScore ?? 0) >= TG_SCORE_THRESHOLD;
    if (n.type === 'trending-breakout') {
      return (n.volumeChange ?? 0) >= TG_VOLUME_THRESHOLD
          || (n.priceChange  ?? 0) >= TG_PRICE_THRESHOLD;
    }
    if (n.type === 'price-floor-break')   return true;
    if (n.type === 'liquidity-milestone') return (n.liquidityUSD ?? 0) >= 1_000_000;
    if (n.type === 'security-risk')       return true;
    return false;
  });

  // DB-backed dedup — each alert_id is inserted once; duplicates are skipped
  const toSend = await filterUnsent(highSignal);
  if (toSend.length === 0) return;

  await sendTelegramAlerts(toSend);
}
