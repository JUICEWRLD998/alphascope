import { NextRequest, NextResponse } from 'next/server';
import { generateNotifications } from '@/lib/notification-generator';

// Run on every request — notifications must always reflect live data.
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 *
 * Query params:
 *   chain — chain id, defaults to "solana"
 *
 * Returns:
 *   { notifications: AppNotification[] }
 *
 * Telegram dispatch is handled exclusively by the Vercel Cron job at
 * /api/cron/notifications so alerts flow 24/7 regardless of user activity.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chain = url.searchParams.get('chain') ?? 'solana';

  const notifications = await generateNotifications(chain);

  return NextResponse.json(
    { notifications },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

