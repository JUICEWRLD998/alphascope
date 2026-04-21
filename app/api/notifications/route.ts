import { NextRequest, NextResponse } from 'next/server';
import { getNewListings, getTrendingTokens } from '@/services/birdeye';
import { scoreToken } from '@/lib/scoring';
import type { AppNotification } from '@/lib/notifications';
import type { BirdeyeNewListing, BirdeyeTrendingToken } from '@/lib/types';
import type { ScoringInput } from '@/lib/scoring';
import { sendTelegramAlerts } from '@/services/telegram';
import { filterUnsent } from '@/lib/alert-dedup';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Minimum overall score for a new listing to be shown as an opportunity */
const OPPORTUNITY_MIN_SCORE = 60;

/** Max new-opportunity notifications to return */
const OPPORTUNITY_LIMIT = 5;

/** Volume change % threshold for a trending breakout (volume doubled) */
const BREAKOUT_VOLUME_THRESHOLD = 100;

/** Price change % threshold for a trending breakout */
const BREAKOUT_PRICE_THRESHOLD = 30;

/** Max breakout notifications to return */
const BREAKOUT_LIMIT = 5;

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

function isBreakout(t: BirdeyeTrendingToken): boolean {
  return (t.v24hChangePercent ?? 0) > BREAKOUT_VOLUME_THRESHOLD
    || (t.priceChange24hPercent ?? 0) > BREAKOUT_PRICE_THRESHOLD;
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * GET /api/notifications
 *
 * Query params:
 *   chain — chain id, defaults to "solana"
 *
 * Returns:
 *   { notifications: AppNotification[] }
 *
 * Sources:
 *   1. New opportunities — new listings (6h) with BUY verdict and score >= 60
 *   2. Trending breakouts — trending tokens with volume or price spike
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chain = url.searchParams.get('chain') ?? 'solana';
  const notifications: AppNotification[] = [];
  const now = Date.now();

  // Fetch both data sources in parallel
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
        // Stable ID per 30-min window so the same breakout doesn't spam on every poll
        id: `breakout-${token.address}-${Math.floor(now / 1_800_000)}`,
        type: 'trending-breakout',
        title: `${token.symbol} — Breakout`,
        message: signals.join(' · '),
        address: token.address,
        symbol: token.symbol,
        logoURI: token.logoURI,
        volumeChange: volChange,
        priceChange:  priceChange,
        rank: token.rank,
        timestamp: now,
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
const TG_SCORE_THRESHOLD  = 70;   // opportunity min score
const TG_VOLUME_THRESHOLD = 150;  // breakout min volume change %
const TG_PRICE_THRESHOLD  = 50;   // breakout min price change %

async function dispatchToTelegram(notifications: AppNotification[]): Promise<void> {
  // Skip entirely when Telegram is not configured
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  // Filter to high-signal only — higher bar than in-app to keep Telegram low-noise
  const highSignal = notifications.filter((n) => {
    if (n.type === 'new-opportunity') {
      return (n.overallScore ?? 0) >= TG_SCORE_THRESHOLD;
    }
    if (n.type === 'trending-breakout') {
      return (n.volumeChange ?? 0) >= TG_VOLUME_THRESHOLD
        || (n.priceChange  ?? 0) >= TG_PRICE_THRESHOLD;
    }
    return false;
  });

  // Deduplicate — only send IDs not yet dispatched in this server process
  const toSend = filterUnsent(highSignal);
  if (toSend.length === 0) return;

  await sendTelegramAlerts(toSend);
}
