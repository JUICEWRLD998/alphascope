import type { NextRequest } from 'next/server';
import { getNewTokens } from '@/services/birdeye';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const chain = searchParams.get('chain') ?? 'solana';
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? '20', 10),
    50, // cap at 50 to protect API quota
  );

  const result = await getNewTokens(chain, limit);

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json(result.data);
}
