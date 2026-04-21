import { NextRequest, NextResponse } from 'next/server';
import { getTokenOHLCV } from '@/services/birdeye';
import type { OHLCVTimeframe } from '@/services/birdeye';

const VALID_TIMEFRAMES: OHLCVTimeframe[] = [
  '1m', '3m', '5m', '15m', '30m',
  '1H', '2H', '4H', '6H', '8H', '12H',
  '1D', '3D', '1W', '1M',
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address   = searchParams.get('address') ?? '';
  const timeframe = (searchParams.get('timeframe') ?? '1H') as OHLCVTimeframe;
  const chain     = searchParams.get('chain') ?? 'solana';

  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json({ error: 'invalid timeframe' }, { status: 400 });
  }

  const result = await getTokenOHLCV(address, { chain, timeframe });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result.data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
