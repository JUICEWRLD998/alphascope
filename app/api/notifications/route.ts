import { NextRequest, NextResponse } from 'next/server';
import { getTokenOverview, getNewListings } from '@/services/birdeye';
import { scoreToken } from '@/lib/scoring';
import type { AppNotification } from '@/lib/notifications';
import type { BirdeyeNewListing } from '@/lib/types';
import type { ScoringInput } from '@/lib/scoring';
import { sendTelegramAlerts } from '@/services/telegram';
import { filterUnsent } from '@/lib/alert-dedup';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Minimum absolute 24h price change (%) to emit a price-alert notification */
const PRICE_ALERT_THRESHOLD = 10;

/** Minimum overall score for a new listing to be shown as an opportunity */
const OPPORTUNITY_MIN_SCORE = 60;

/** Max number of opportunities to return */
const OPPORTUNITY_LIMIT = 5;

/** Cap watchlist addresses to protect API quota */
const MAX_WATCHLIST = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listingToScoringInput(t: BirdeyeNewListing): ScoringInput {
  return {
    address: t.address,
    price: t.price,
    priceChange24h: 0,
    volume24h: t.v24hUSD,
    volumeChange24h: 0,
    marketCap: t.mc,
    liquidity: t.liquidity,
    holders: 0,
    ageMinutes: Math.max(0, Math.floor((Date.now() / 1000 - t.liquidityAddedAt) / 60)),
    security: null,
    whaleActivityRatio: null,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * GET /api/notifications
 *
 * Query params:
 *   addresses  — comma-separated watchlist token addresses (optional, max 10)
 *   chain      — chain id, defaults to "solana"
 *
 * Returns:
 *   { notifications: AppNotification[] }
 *
 * Combines two sources:
 *   1. Price alerts — watchlist tokens with |priceChange24h| >= 10%
 *   2. New opportunities — new listings (6h) with BUY verdict and score >= 60
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chain = url.searchParams.get('chain') ?? 'solana';
  const addressesParam = url.searchParams.get('addresses') ?? '';
  const addresses = addressesParam
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, MAX_WATCHLIST);

  const notifications: AppNotification[] = [];
  const now = Date.now();

  // ── 1. Watchlist price alerts ─────────────────────────────────────────────
  if (addresses.length > 0) {
    const overviewResults = await Promise.allSettled(
      addresses.map((address) => getTokenOverview(address, { chain })),
    );

    for (const result of overviewResults) {
      if (result.status !== 'fulfilled') continue;
      const { success, data } = result.value;
      if (!success || !data) continue;

      const change = data.priceChange24hPercent;
      if (Math.abs(change) < PRICE_ALERT_THRESHOLD) continue;

      const up = change > 0;
      notifications.push({
        // Stable ID per 10-min window so re-polls don't duplicate unread dots
        id: `price-${data.address}-${Math.floor(now / 600_000)}`,
        type: 'price-alert',
        title: `${data.symbol} ${up ? 'surged' : 'dropped'} ${Math.abs(change).toFixed(1)}%`,
        message: `Watchlist token moved ${up ? '+' : ''}${change.toFixed(1)}% in the last 24h`,
        address: data.address,
        symbol: data.symbol,
        logoURI: data.logoURI,
        priceChange: change,
        timestamp: now,
      });
    }
  }

  // ── 2. New token opportunities ─────────────────────────────────────────────
  const newRes = await getNewListings({ chain, window: '6h', limit: 30 });
  if (newRes.success && newRes.data?.items) {
    const opportunities = newRes.data.items
      .map((t) => ({ token: t, score: scoreToken(listingToScoringInput(t)) }))
      .filter(({ score }) => score.verdict === 'BUY' && score.overall >= OPPORTUNITY_MIN_SCORE)
      .sort((a, b) => b.score.overall - a.score.overall)
      .slice(0, OPPORTUNITY_LIMIT);

    for (const { token, score } of opportunities) {
      notifications.push({
        id: `opp-${token.address}`,
        type: 'new-opportunity',
        title: `${token.symbol} — New Opportunity`,
        message: `Score ${score.overall}/100 · ${score.verdictReason}`,
        address: token.address,
        symbol: token.symbol,
        logoURI: token.logoURI,
        verdict: score.verdict,
        overallScore: score.overall,
        timestamp: token.liquidityAddedAt * 1000,
      });
    }
  }

  // ── 3. Telegram dispatch (non-blocking, high-signal only) ────────────────
  //
  // Only fire when env vars are configured. We filter to high-conviction events
  // (large price moves or strong BUY scores) and deduplicate so the same event
  // is never sent twice within a server process lifetime.
  void dispatchToTelegram(notifications);

  return NextResponse.json(
    { notifications },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

// ─── Telegram dispatcher ──────────────────────────────────────────────────────

/**
 * High-signal filter thresholds for Telegram.
 * Higher bar than in-app so the Telegram chat stays low-noise.
 */
const TG_PRICE_THRESHOLD   = 15;   // |priceChange| %
const TG_SCORE_THRESHOLD   = 70;   // opportunity score

async function dispatchToTelegram(notifications: AppNotification[]): Promise<void> {
  // Skip entirely when Telegram is not configured
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  // Filter to high-signal only
  const highSignal = notifications.filter((n) => {
    if (n.type === 'price-alert') {
      return Math.abs(n.priceChange ?? 0) >= TG_PRICE_THRESHOLD;
    }
    if (n.type === 'new-opportunity') {
      return (n.overallScore ?? 0) >= TG_SCORE_THRESHOLD;
    }
    return false;
  });

  // Deduplicate — only send IDs not yet dispatched in this server process
  const toSend = filterUnsent(highSignal);
  if (toSend.length === 0) return;

  await sendTelegramAlerts(toSend);
}
