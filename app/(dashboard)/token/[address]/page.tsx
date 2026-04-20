import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Users,
  Droplets,
  TrendingUp,
  BarChart2,
  Zap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
} from 'lucide-react';
import { getTokenOverview, getTokenSecurity } from '@/services/birdeye';
import { generateInsight, buildInsightInput } from '@/lib/insights';
import { scoreToken, buildScoringInput } from '@/lib/scoring';
import type { TokenScore, BirdeyeToken, BirdeyeTokenSecurity, Verdict, ScoreLabel } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import ScoreMeter from '@/components/ui/ScoreMeter';
import {
  cn,
  formatPrice,
  formatNumber,
  formatAddress,
  formatPercent,
  getChangeColor,
  getScoreTextColor,
} from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ address: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { address } = await params;
  const result = await getTokenOverview(address);
  const name = result.success && result.data
    ? `${result.data.name} (${result.data.symbol})`
    : formatAddress(address, 8);
  return {
    title: `${name} — AlphaScope`,
    description: `Token analytics, risk scoring, and AI insight for ${name}.`,
  };
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────

function generateSparkPoints(
  priceChange: number,
  volume: number,
  w = 300,
  h = 64,
): string {
  const points = 14;
  const step   = w / (points - 1);
  const seed   = Math.abs(volume % 998) + 1;

  const ys: number[] = [];
  let cur = h * 0.5;
  for (let i = 0; i < points; i++) {
    const trend = (priceChange / 100) * h * 0.3;
    const noise = ((((seed * (i + 1) * 17) % 100) / 100) - 0.5) * h * 0.4;
    cur = Math.max(4, Math.min(h - 4, cur + trend / points + noise));
    ys.push(cur);
  }

  return ys
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
}

function Sparkline({ priceChange, volume }: { priceChange: number; volume: number }) {
  const W = 300;
  const H = 64;
  const path  = generateSparkPoints(priceChange, volume, W, H);
  const color = priceChange >= 0 ? '#22d3ee' : '#f87171';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-label="Price trend sparkline">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, change }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; change?: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-space-700 bg-space-900 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-space-600 hover:bg-space-850 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</span>
        <span className="text-slate-600">{icon}</span>
      </div>
      <div>
        <p className="font-mono text-xl font-bold text-slate-100">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        {change !== undefined && (
          <p className={cn('mt-0.5 font-mono text-xs font-semibold', getChangeColor(change))}>
            {formatPercent(change, true)} 24h
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Score dimension card ─────────────────────────────────────────────────────

function ScoreCard({ label, score, description }: { label: string; score: number; description: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-space-700 bg-space-900 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-space-600 hover:bg-space-850 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className={cn('font-mono text-lg font-bold tabular-nums', getScoreTextColor(score))}>{score}</span>
      </div>
      <ScoreMeter score={score} size="sm" showLabel={false} />
      <p className="text-[10px] leading-snug text-slate-500">{description}</p>
    </div>
  );
}

// ─── Verdict banner ───────────────────────────────────────────────────────────

const VERDICT_STYLES: Record<Verdict, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
  BUY:   { border: 'border-success-500/30', bg: 'bg-success-500/5', text: 'text-success-400', icon: <CheckCircle2 className="h-5 w-5" /> },
  WATCH: { border: 'border-warning-500/30', bg: 'bg-warning-500/5', text: 'text-warning-400', icon: <AlertTriangle className="h-5 w-5" /> },
  AVOID: { border: 'border-danger-500/30',  bg: 'bg-danger-500/5',  text: 'text-danger-400',  icon: <XCircle className="h-5 w-5" /> },
};

function VerdictBanner({ score }: { score: TokenScore }) {
  const s = VERDICT_STYLES[score.verdict];
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-4', s.border, s.bg)}>
      <span className={s.text}>{s.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold', s.text)}>{score.verdict}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">
            Overall: <span className={cn('font-mono font-bold', s.text)}>{score.overall}</span>
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">Confidence: {Math.round(score.confidence * 100)}%</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{score.verdictReason}</p>
      </div>
    </div>
  );
}

// ─── Security flags ───────────────────────────────────────────────────────────

type FlagStatus = 'good' | 'bad' | 'warn' | 'unknown';

function FlagRow({ label, status, detail }: { label: string; status: FlagStatus; detail?: string }) {
  const ICONS: Record<FlagStatus, React.ReactNode> = {
    good:    <CheckCircle2  className="h-4 w-4 text-success-400" />,
    bad:     <XCircle       className="h-4 w-4 text-danger-400"  />,
    warn:    <AlertTriangle className="h-4 w-4 text-warning-400" />,
    unknown: <Minus         className="h-4 w-4 text-slate-600"   />,
  };
  const TEXT: Record<FlagStatus, string> = {
    good: 'text-success-400', bad: 'text-danger-400', warn: 'text-warning-400', unknown: 'text-slate-600',
  };
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        {ICONS[status]}
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      {detail && <span className={cn('font-mono text-xs', TEXT[status])}>{detail}</span>}
    </div>
  );
}

function SecurityPanel({ security }: { security: BirdeyeTokenSecurity | null }) {
  if (!security) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-space-700 bg-space-900 p-6 text-sm text-slate-500">
        <ShieldOff className="h-5 w-5 shrink-0 text-slate-600" />
        <span>Security data unavailable for this token.</span>
      </div>
    );
  }

  const concPct = security.top10HolderPercent ?? security.top10UserPercent;
  const feeBps  = security.transferFeeData?.newerTransferFee.transferFeeBasisPoints;

  return (
    <div className="rounded-xl border border-space-700 bg-space-900 divide-y divide-space-700/50 px-5">
      <FlagRow label="Mint authority"           status={security.mintable === false ? 'good' : security.mintable === true ? 'bad' : 'unknown'} detail={security.mintable === false ? 'Disabled' : security.mintable === true ? 'Active' : '—'} />
      <FlagRow label="Freeze authority"         status={security.freezeable === false ? 'good' : security.freezeable === true ? 'bad' : 'unknown'} detail={security.freezeable === false ? 'Disabled' : security.freezeable === true ? 'Active' : '—'} />
      <FlagRow label="LP burned"                status={security.burnedLp === true ? 'good' : security.burnedLp === false ? 'warn' : 'unknown'} detail={security.burnedLp === true ? 'Yes' : security.burnedLp === false ? 'No' : '—'} />
      <FlagRow label="Mutable metadata"         status={security.isMutable === false ? 'good' : security.isMutable === true ? 'warn' : 'unknown'} detail={security.isMutable === false ? 'Immutable' : security.isMutable === true ? 'Mutable' : '—'} />
      <FlagRow label="Top-10 holder concentration" status={concPct == null ? 'unknown' : concPct >= 0.9 ? 'bad' : concPct >= 0.6 ? 'warn' : 'good'} detail={concPct != null ? `${(concPct * 100).toFixed(1)}%` : '—'} />
      <FlagRow label="Transfer fee (Token-2022)" status={!security.transferFeeEnable ? 'good' : feeBps != null && feeBps > 300 ? 'bad' : feeBps != null && feeBps > 0 ? 'warn' : 'unknown'} detail={feeBps != null && security.transferFeeEnable ? `${(feeBps / 100).toFixed(2)}%` : 'None'} />
      <FlagRow label="Non-transferable"         status={security.nonTransferable ? 'bad' : 'good'} detail={security.nonTransferable ? 'Yes — honeypot risk' : 'Transferable'} />
    </div>
  );
}

// ─── Label → badge variant ────────────────────────────────────────────────────

const LABEL_VARIANT: Record<ScoreLabel, 'danger' | 'success' | 'warning' | 'info' | 'accent' | 'default'> = {
  'high-risk': 'danger', 'low-liquidity': 'warning', 'new-token': 'info', 'trending': 'accent',
  'breakout': 'success', 'whale-activity': 'warning', 'low-holders': 'danger', 'high-volume': 'success',
  'concentrated-supply': 'danger', 'lp-burned': 'success', 'mintable': 'danger', 'freezeable': 'danger',
  'transfer-fee': 'warning', 'mutable-metadata': 'warning', 'volume-spike': 'accent',
  'price-breakout': 'success', 'low-mcap-gem': 'accent', 'honeypot-risk': 'danger',
};

// ─── AI Insight panel ─────────────────────────────────────────────────────────

function AIPanel({ insight, usingAI }: { insight: string; usingAI: boolean }) {
  return (
    <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-5 ring-1 ring-accent-500/10">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-400" />
        <span className="text-sm font-semibold text-accent-200">AI Insight</span>
        <Badge variant={usingAI ? 'accent' : 'default'} size="sm">
          {usingAI ? 'Gemini 1.5 Flash' : 'Rule-based'}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-slate-300">{insight}</p>
    </div>
  );
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound({ address }: { address: string }) {
  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-danger-500/20 bg-danger-500/5 py-20 text-center">
        <ShieldOff className="h-10 w-10 text-danger-400" />
        <div>
          <p className="font-semibold text-danger-300">Token not found</p>
          <p className="mt-1 font-mono text-xs text-slate-500">{address}</p>
        </div>
        <Link href="/dashboard" className="rounded-lg bg-space-800 px-4 py-2 text-sm text-slate-300 hover:text-white">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TokenDetailPage({ params }: PageProps) {
  const { address } = await params;

  const [overviewRes, securityRes] = await Promise.all([
    getTokenOverview(address),
    getTokenSecurity(address),
  ]);

  if (!overviewRes.success || !overviewRes.data) {
    return <NotFound address={address} />;
  }

  const token:    BirdeyeToken             = overviewRes.data;
  const security: BirdeyeTokenSecurity | null = securityRes.success ? securityRes.data : null;

  const input        = buildScoringInput(token, security);
  const score        = scoreToken(input);
  const insightInput  = buildInsightInput(token, security, score);
  const insightResult = await generateInsight(insightInput);

  const verdictBorders: Record<Verdict, string> = {
    BUY:   'border-success-500/30',
    WATCH: 'border-space-700',
    AVOID: 'border-danger-500/30',
  };

  return (
    <div className="space-y-6">

      {/* ── Back nav ─────────────────────────────────────────────────────── */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-100">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className={cn('flex flex-col gap-5 rounded-xl border bg-space-900 p-6 sm:flex-row sm:items-start', verdictBorders[score.verdict])}>
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-space-700">
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-500">
            {token.symbol.slice(0, 2).toUpperCase()}
          </span>
          {token.logoURI && (
            <Image src={token.logoURI} alt={token.symbol} fill unoptimized className="rounded-2xl object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">{token.name}</h1>
            <span className="font-mono text-base text-slate-500">{token.symbol}</span>
            <Badge variant="info">Solana</Badge>
            {score.verdict === 'BUY'   && <Badge variant="success">BUY</Badge>}
            {score.verdict === 'AVOID' && <Badge variant="danger">AVOID</Badge>}
            {score.verdict === 'WATCH' && <Badge variant="warning">WATCH</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{formatAddress(address, 8)}</span>
            {[
              { href: `https://solscan.io/token/${address}`,               label: 'Solscan' },
              { href: `https://dexscreener.com/solana/${address}`,         label: 'DexScreener' },
              { href: `https://birdeye.so/token/${address}?chain=solana`,  label: 'Birdeye' },
            ].map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-slate-600 transition-colors hover:text-accent-400">
                {link.label} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
          <div className="mt-4 flex items-end gap-4">
            <div className="flex-1">
              <Sparkline priceChange={token.priceChange24hPercent} volume={token.v24hUSD} />
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-2xl font-bold text-slate-100">{formatPrice(token.price)}</p>
              <p className={cn('font-mono text-sm font-bold', getChangeColor(token.priceChange24hPercent))}>
                {formatPercent(token.priceChange24hPercent, true)} 24h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Verdict banner ───────────────────────────────────────────────── */}
      <VerdictBanner score={score} />

      {/* ── Key metrics ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Volume 24h"   value={`$${formatNumber(token.v24hUSD)}`}          change={token.v24hChangePercent} icon={<BarChart2 className="h-4 w-4" />} />
        <StatCard label="Market Cap"   value={`$${formatNumber(token.mc)}`}                icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Liquidity"    value={`$${formatNumber(token.liquidity)}`}         icon={<Droplets className="h-4 w-4" />} />
        <StatCard label="Holders"      value={token.holder.toLocaleString()}               icon={<Users className="h-4 w-4" />} />
        <StatCard label="Circulating"  value={formatNumber(token.circulatingSupply)}       sub={`of ${formatNumber(token.supply)} total`} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Real Mkt Cap" value={`$${formatNumber(token.realMc)}`}            icon={<BarChart2 className="h-4 w-4" />} />
      </div>

      {/* ── AI Insight ───────────────────────────────────────────────────── */}
      <AIPanel insight={insightResult.text} usingAI={insightResult.source === 'gemini'} />

      {/* ── Score breakdown ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-100">Score Breakdown</h2>
          <span className="text-xs text-slate-600">
            Composite: <span className={cn('font-mono font-bold', getScoreTextColor(score.overall))}>{score.overall}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <ScoreCard label="Risk"        score={score.risk}        description="Higher = safer. Factors in age, holder count, and liquidity floor." />
          <ScoreCard label="Opportunity" score={score.opportunity} description="Upside potential from price action, market cap, and momentum." />
          <ScoreCard label="Momentum"    score={score.momentum}    description="Volume trend, price acceleration, and buy/sell confirmation." />
          <ScoreCard label="Liquidity"   score={score.liquidity}   description="Depth of on-chain pools — determines entry and exit ease." />
          <ScoreCard label="Security"    score={score.security}    description="Authority flags, LP lock, concentration, and Token-2022 risks." />
        </div>
      </section>

      {/* ── Security flags ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-100">Security Flags</h2>
          {security && (
            <Badge variant={score.security >= 70 ? 'success' : score.security >= 45 ? 'warning' : 'danger'}>
              Score {score.security}
            </Badge>
          )}
        </div>
        <SecurityPanel security={security} />
      </section>

      {/* ── Labels ───────────────────────────────────────────────────────── */}
      {score.labels.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-100">Detected Labels</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {score.labels.map((label) => (
              <Badge key={label} variant={LABEL_VARIANT[label]}>{label}</Badge>
            ))}
          </div>
        </section>
      )}

      {/* ── Signals ──────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-100">Scoring Signals</h2>
          <span className="text-xs text-slate-600">{score.signals.length} total</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-space-700 bg-space-900">
          <div className="divide-y divide-space-700/50">
            {score.signals.map((sig, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className={cn('mt-0.5 shrink-0 font-mono text-[10px] font-bold',
                  sig.impact === 'positive' ? 'text-success-400' : sig.impact === 'negative' ? 'text-danger-400' : 'text-slate-600')}>
                  {sig.delta > 0 ? '+' : ''}{sig.delta}
                </span>
                <p className="flex-1 text-sm text-slate-400">{sig.label}</p>
                <Badge variant="default" size="sm">{sig.category}</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
