import { NextRequest, NextResponse } from 'next/server';
import { getTokenOverview } from '@/services/birdeye';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const address = url.searchParams.get('address');
  const chain = url.searchParams.get('chain') ?? 'solana';

  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'address query param is required' }, { status: 400 });
  }

  const result = await getTokenOverview(address, { chain });

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Token not found' }, { status: 404 });
  }

  return NextResponse.json(result.data);
}
