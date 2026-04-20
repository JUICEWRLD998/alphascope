import type { NextRequest } from 'next/server';
import { getNewListings } from '@/services/birdeye';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const chain = searchParams.get('chain') ?? 'solana';
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? '20', 10),
    50, // cap at 50 to protect API quota
  );
  const window = (searchParams.get('window') ?? '6h') as '30m' | '1h' | '2h' | '6h' | '24h';

  const result = await getNewListings({ chain, limit, window });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  // Return the items array directly for convenience
  return Response.json(result.data.items ?? result.data);
}
