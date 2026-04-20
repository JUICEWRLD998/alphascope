// ─── Class name helper ───────────────────────────────────────────────────────

export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Number formatting ───────────────────────────────────────────────────────

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '—';
  const safe = toFiniteNumber(price, Number.NaN);
  if (!Number.isFinite(safe)) return '—';
  if (safe === 0) return '$0.00';
  if (safe < 0.000001) return `$${safe.toExponential(2)}`;
  if (safe < 0.01) return `$${safe.toFixed(6)}`;
  if (safe < 1) return `$${safe.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const safe = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(safe)) return '—';
  const abs = Math.abs(safe);
  if (abs >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(safe / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(safe / 1_000).toFixed(2)}K`;
  return safe.toFixed(2);
}

export function formatPercent(value: number | null | undefined, showSign = true): string {
  if (value === null || value === undefined) return '—';
  const safe = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(safe)) return '—';
  const sign = showSign && safe > 0 ? '+' : '';
  return `${sign}${safe.toFixed(2)}%`;
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

export function getChangeColor(change: number | null | undefined): string {
  if (change === null || change === undefined) return 'text-slate-400';
  const safe = toFiniteNumber(change, 0);
  if (safe > 0) return 'text-success-400';
  if (safe < 0) return 'text-danger-400';
  return 'text-slate-400';
}
