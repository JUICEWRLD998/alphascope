export const APP_NAME = 'AlphaScope';
export const APP_DESCRIPTION =
  'Professional onchain token analytics powered by real-time Birdeye data.';

export const BIRDEYE_BASE_URL = 'https://public-api.birdeye.so';

export const SUPPORTED_CHAINS = [
  { id: 'solana', label: 'Solana', symbol: 'SOL' },
  { id: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
  { id: 'bsc', label: 'BNB Chain', symbol: 'BNB' },
  { id: 'base', label: 'Base', symbol: 'BASE' },
] as const;

export const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/radar', label: 'Token Radar', icon: 'radar' },
  { href: '/trending', label: 'Trending', icon: 'trending-up' },
  { href: '/scores', label: 'Score Board', icon: 'bar-chart' },
] as const;

export const REFRESH_INTERVAL_MS = 30_000;

export const SCORE_THRESHOLDS = {
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
} as const;

export const BIRDEYE_SORT_OPTIONS = {
  RANK: 'rank',
  VOLUME: 'v24hUSD',
  PRICE_CHANGE: 'priceChange24hPercent',
  LIQUIDITY: 'liquidity',
} as const;
