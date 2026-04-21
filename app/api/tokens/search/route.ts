import { NextRequest, NextResponse } from 'next/server';
import { BIRDEYE_BASE_URL } from '@/lib/constants';

// Birdeye search result item shape
export interface SearchResultToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
  v24hUSD: number;
  mc: number;
  price: number;
  priceChange24hPercent: number;
}

function normalizeNum(v: unknown, fb = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fb;
}

function normalizeStr(v: unknown, fb = ''): string {
  return typeof v === 'string' ? v : fb;
}

/** Is this query a Solana wallet/token address (base58, 32-44 chars)? */
function looksLikeAddress(q: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q.trim());
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const chain = url.searchParams.get('chain') ?? 'solana';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], isAddress: false });
  }

  const isAddress = looksLikeAddress(q);

  // For direct address input, no search needed — caller navigates directly
  if (isAddress) {
    return NextResponse.json({ results: [], isAddress: true, address: q });
  }

  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [], isAddress: false, error: 'API key not configured' });
  }

  try {
    const searchUrl = new URL(`${BIRDEYE_BASE_URL}/defi/v3/search`);
    searchUrl.searchParams.set('chain', chain);
    searchUrl.searchParams.set('keyword', q);
    searchUrl.searchParams.set('target', 'token');
    searchUrl.searchParams.set('sort_by', 'v24hUSD');
    searchUrl.searchParams.set('sort_type', 'desc');
    searchUrl.searchParams.set('offset', '0');
    searchUrl.searchParams.set('limit', '8');
    searchUrl.searchParams.set('verify_token', 'true');

    const res = await fetch(searchUrl.toString(), {
      headers: {
        accept: 'application/json',
        'X-API-KEY': apiKey,
        'x-chain': chain,
      },
      next: { revalidate: 10 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], isAddress: false });
    }

    const json = await res.json() as {
      success: boolean;
      data?: {
        items?: Array<{
          type: string;
          result?: Array<Record<string, unknown>>;
        }>;
      };
    };

    if (!json.success || !json.data?.items) {
      return NextResponse.json({ results: [], isAddress: false });
    }

    const tokenItems = json.data.items.find((i) => i.type === 'token');
    const raw = tokenItems?.result ?? [];

    const results: SearchResultToken[] = raw.slice(0, 8).map((r) => ({
      address: normalizeStr(r.address),
      symbol: normalizeStr(r.symbol, 'N/A'),
      name: normalizeStr(r.name, 'Unknown'),
      logoURI: normalizeStr(r.logoURI ?? r.logo_uri),
      v24hUSD: normalizeNum(r.v24hUSD ?? r.volume24hUSD),
      mc: normalizeNum(r.mc ?? r.marketcap),
      price: normalizeNum(r.price),
      priceChange24hPercent: normalizeNum(r.priceChange24hPercent ?? r.price24hChangePercent),
    })).filter((r) => r.address.length > 0);

    return NextResponse.json({ results, isAddress: false });
  } catch {
    return NextResponse.json({ results: [], isAddress: false });
  }
}
