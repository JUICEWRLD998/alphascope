/**
 * app/api/cron/notifications/route.ts
 *
 * Vercel Cron endpoint — runs every 5 minutes 24/7 (configured in vercel.json).
 * Generates token alerts and dispatches high-signal ones to the Telegram group,
 * completely independently of whether any user is active on the app.
 *
 * Security: Vercel automatically sends `Authorization: Bearer {CRON_SECRET}`
 * with every cron invocation. Set CRON_SECRET in your Vercel project env vars.
 */

import { NextResponse } from 'next/server';
import { generateNotifications, dispatchToTelegram } from '@/lib/notification-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Reject requests that don't carry the Vercel Cron secret.
  // When CRON_SECRET is set, only Vercel's scheduler can trigger this endpoint.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const notifications = await generateNotifications('solana');
    await dispatchToTelegram(notifications);

    return NextResponse.json({
      ok:    true,
      total: notifications.length,
      time:  new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/notifications] Failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
