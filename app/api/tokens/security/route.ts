import type { NextRequest } from 'next/server';
import { getTokenSecurity } from '@/services/birdeye';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const address = searchParams.get('address');
  const chain = searchParams.get('chain') ?? 'solana';

  if (!address) {
    return Response.json(
      { error: 'Missing required query param: address' },
      { status: 400 },
    );
  }

  const result = await getTokenSecurity(address, { chain });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  return Response.json(result.data);
}
