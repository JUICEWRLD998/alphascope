/**
 * app/api/test/db.ts — Temporary test endpoint
 * Hit this once to verify Neon connection, then delete it.
 */

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getSql();
    const result = await sql`SELECT NOW()`;
    return NextResponse.json({
      ok: true,
      message: 'DB connected',
      timestamp: result[0],
    });
  } catch (err) {
    return NextResponse.json({
      error: String(err),
    }, { status: 500 });
  }
}
