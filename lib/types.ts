export type Chain = 'solana' | 'ethereum' | 'bsc' | 'base';

export type ScoreLabel =
  | 'high-risk'
  | 'low-liquidity'
  | 'new-token'
  | 'trending'
  | 'breakout'
  | 'whale-activity'
  | 'low-holders'
  | 'high-volume'
  | 'concentrated-supply'
  | 'lp-burned'
  | 'mintable'
  | 'freezeable'
  | 'transfer-fee'
  | 'mutable-metadata'
  | 'volume-spike'
  | 'price-breakout'
  | 'low-mcap-gem'
  | 'honeypot-risk';

export type Verdict = 'BUY' | 'WATCH' | 'AVOID';

/** The full scored output for one token */
export interface TokenScore {
  address: string;
  // ── Core scores ────────────────────────────────────────────────
  overall: number;      // 0–100 weighted composite
  risk: number;         // 0–100 — higher means SAFER (lower risk)
  opportunity: number;  // 0–100 — higher means more upside
  momentum: number;     // 0–100
  liquidity: number;    // 0–100 normalised liquidity score
  security: number;     // 0–100 — higher means cleaner security posture
  // ── Verdict ────────────────────────────────────────────────────
  verdict: Verdict;
  verdictReason: string;
  // ── Signal breakdown ───────────────────────────────────────────
  labels: ScoreLabel[];
  signals: ScoringSignal[];
  // ── Confidence ─────────────────────────────────────────────────
  /** 0–1: how much data was available (missing security = lower) */
  confidence: number;
  computedAt: number; // unix ms
}

/** A single human-readable scoring signal with its point impact */
export interface ScoringSignal {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  /** The raw point delta this signal contributed (+/-) */
  delta: number;
  category: 'risk' | 'opportunity' | 'momentum' | 'security' | 'liquidity';
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

/** Returned by /defi/token_overview */
export interface BirdeyeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  price: number;
  priceChange24hPercent: number;
  v24hUSD: number;           // 24h volume in USD
  v24hChangePercent: number; // volume change %
  mc: number;                // market cap
  liquidity: number;
  holder: number;
  lastTradeUnixTime: number;
  supply: number;
  circulatingSupply: number;
  realMc: number;
}

/** Returned by /defi/token_trending (items inside the `tokens` array) */
export interface BirdeyeTrendingToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  rank: number;
  price: number;
  priceChange24hPercent: number;
  v24hUSD: number;
  v24hChangePercent: number;
  mc: number;
  liquidity: number;
  holder: number;
  lastTradeUnixTime: number;
}

/** Shape of the top-level response from /defi/token_trending */
export interface BirdeyeTrendingResponse {
  updateUnixTime: number;
  updateTime: string;
  tokens: BirdeyeTrendingToken[];
  total: number;
}

/** Returned by /defi/v2/tokens/new_listing (each item) */
export interface BirdeyeNewListing {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  liquidityAddedAt: number; // unix timestamp
  price: number;
  liquidity: number;
  v24hUSD: number;
  mc: number;
  /** DEX / launchpad where liquidity was added (e.g. pump_amm, raydium_launchlab) */
  source?: string;
}

/** Shape of the top-level response from /defi/v2/tokens/new_listing */
export interface BirdeyeNewListingResponse {
  items: BirdeyeNewListing[];
  total: number;
}

/** Returned by /defi/token_security */
export interface BirdeyeTokenSecurity {
  address: string;
  symbol: string;
  ownerAddress: string | null;
  creatorAddress: string | null;
  creationTx: string | null;
  creationTime: number | null;
  /** What % of supply the top-10 holders control (0–1) */
  top10HolderPercent: number | null;
  /** What % of supply the top-10 non-contract wallets control (0–1) */
  top10UserPercent: number | null;
  /** Whether metadata can be updated by the authority */
  isMutable: boolean | null;
  /** Whether the mint authority can issue more tokens */
  mintable: boolean | null;
  /** Whether the freeze authority can freeze wallets */
  freezeable: boolean | null;
  /** Whether the LP tokens were burned */
  burnedLp: boolean | null;
  /** Whether the token has transfer fees (Token-2022) */
  transferFeeEnable: boolean | null;
  transferFeeData: {
    newerTransferFee: { transferFeeBasisPoints: number; maximumFee: string };
    olderTransferFee: { transferFeeBasisPoints: number; maximumFee: string };
  } | null;
  isToken2022: boolean;
  nonTransferable: boolean | null;
}
