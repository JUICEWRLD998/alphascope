export type Chain = 'solana' | 'ethereum' | 'bsc' | 'base';

export type ScoreLabel =
  | 'high-risk'
  | 'low-liquidity'
  | 'new-token'
  | 'trending'
  | 'breakout'
  | 'whale-activity'
  | 'low-holders'
  | 'high-volume';

export interface TokenScore {
  address: string;
  overall: number;      // 0–100 composite
  risk: number;         // 0–100, higher = safer
  opportunity: number;  // 0–100, higher = better
  momentum: number;     // 0–100
  liquidity: number;    // 0–100
  labels: ScoreLabel[];
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI?: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  createdAt: number; // unix seconds
  chain: Chain;
}

export interface NewToken extends Token {
  age: number;             // minutes since creation
  initialLiquidity: number;
  scoreSnapshot: TokenScore;
}

export interface TrendingToken extends Token {
  rank: number;
  volumeChange: number;    // % change in 24h volume
  breakoutScore: number;   // 0–100
}

export interface DashboardStats {
  totalTokensAnalyzed: number;
  newTokens24h: number;
  trendingBreakouts: number;
  highRiskAlerts: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// ─── Birdeye raw response shapes ────────────────────────────────────────────

export interface BirdeyeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  price: number;
  priceChange24hPercent: number;
  v24hUSD: number;
  mc: number;
  liquidity: number;
  holder: number;
  lastTradeUnixTime: number;
}

export interface BirdeyeTrendingToken extends BirdeyeToken {
  rank: number;
  v24hChangePercent: number;
}

export interface BirdeyeNewToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  creationTime: number;
  price: number;
  liquidity: number;
  v24hUSD: number;
  mc: number;
}
