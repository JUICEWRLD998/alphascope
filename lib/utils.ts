// ─── Class name helper ───────────────────────────────────────────────────────

export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Number formatting ───────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

// ─── Time formatting ─────────────────────────────────────────────────────────

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  if (minutes < 1440)
    return `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
  return `${Math.floor(minutes / 1440)}d`;
}

export function timeAgo(unixSeconds: number): string {
  const diff = Date.now() - unixSeconds * 1000;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Score helpers ───────────────────────────────────────────────────────────

export function getScoreTextColor(score: number): string {
  if (score >= 75) return 'text-success-400';
  if (score >= 50) return 'text-warning-400';
  return 'text-danger-400';
}

export function getScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-success-500';
  if (score >= 50) return 'bg-warning-500';
  return 'bg-danger-500';
}

export function getScoreLabel(score: number): 'HIGH' | 'MED' | 'LOW' {
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MED';
  return 'LOW';
}

export function getChangeColor(change: number): string {
  if (change > 0) return 'text-success-400';
  if (change < 0) return 'text-danger-400';
  return 'text-slate-400';
}
