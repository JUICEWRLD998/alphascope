/**
 * lib/scoring.ts — AlphaScope Token Scoring Engine
 *
 * Architecture
 * ─────────────
 * Each dimension (risk, opportunity, momentum, liquidity, security) is scored
 * independently on a 0–100 scale and then combined into a single composite
 * `overall` score via a weighted average.
 *
 * Design principles:
 * • Pure functions — no network calls, no side effects. Works server or client.
 * • Each rule emits a ScoringSignal so the UI can explain WHY a score is what it is.
 * • Missing data degrades gracefully — the engine still produces a valid score,
 *   but the `confidence` field drops below 1 so the UI can show a caveat.
 * • Thresholds are isolated in THRESHOLDS / WEIGHTS so they can be tuned or made
 *   user-configurable in a future step.
 */

import type {
  TokenScore,
  ScoreLabel,
  ScoringSignal,
  Verdict,
  BirdeyeToken,
  BirdeyeTokenSecurity,
} from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Tunable thresholds
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLDS = {
  // Liquidity (USD) — these map to the 5 tiers used in normalisation
  LIQUIDITY: {
    VERY_LOW:  10_000,
    LOW:       50_000,
    MEDIUM:   250_000,
    HIGH:   1_000_000,
    ELITE:  5_000_000,
  },

  // Market cap (USD)
  MC: {
    MICRO:  500_000,
    SMALL:  5_000_000,
    MID:   50_000_000,
  },

  // Holder count
  HOLDERS: {
    VERY_LOW:    50,
    LOW:        200,
    HEALTHY:  1_000,
    STRONG:  10_000,
  },

  // Holder concentration — top-10 holders % of supply (0–1)
  CONCENTRATION: {
    EXTREME:  0.90,
    HIGH:     0.75,
    ELEVATED: 0.60,
    MODERATE: 0.40,
  },

  // 24h price change
  PRICE_CHANGE: {
    CRASH:     -30,
    DOWN:      -10,
    SLIGHT_UP:   5,
    STRONG_UP:  20,
    EXTREME:    80,
    PARABOLIC: 200,
  },

  // 24h volume (USD)
  VOLUME: {
    MINIMAL:    5_000,
    LOW:       50_000,
    MEDIUM:   500_000,
    HIGH:   5_000_000,
    EXTREME: 20_000_000,
  },

  // Transfer fee (basis points) — 100 bps = 1%
  TRANSFER_FEE: {
    ACCEPTABLE: 50,   // ≤ 0.5% ok
    SUSPICIOUS: 300,  // > 3% = suspicious
    EXTREME:    1000, // > 10% = avoid
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Score weights for the composite "overall" score
// Must sum to 1.0
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  risk:        0.30,
  opportunity: 0.25,
  momentum:    0.20,
  liquidity:   0.15,
  security:    0.10,
} as const satisfies Record<string, number>;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp a value to [min, max] */
function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

/** Linear interpolation normalizer: maps `value` from [lo, hi] → [0, 100] */
function normalize(value: number, lo: number, hi: number): number {
  if (hi === lo) return 50;
  return clamp(((value - lo) / (hi - lo)) * 100);
}

/** Create a ScoringSignal and push it onto the array */
function signal(
  signals: ScoringSignal[],
  label: string,
  delta: number,
  category: ScoringSignal['category'],
): void {
  signals.push({
    label,
    impact: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
    delta,
    category,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Input contract
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringInput {
  /** From BirdeyeToken or your own Token type */
  address:         string;
  price:           number;
  priceChange24h:  number;       // percentage
  volume24h:       number;       // USD
  volumeChange24h: number;       // percentage (pass 0 if unavailable)
  marketCap:       number;       // USD
  liquidity:       number;       // USD
  holders:         number;
  /** Age in minutes since creation / liquidity add */
  ageMinutes:      number;
  /** From BirdeyeTokenSecurity — pass null if not yet fetched */
  security:        BirdeyeTokenSecurity | null;
  /**
   * Optional: % of supply moved by wallets > $10k in 24h (0–1).
   * Pass null if not available — engine degrades gracefully.
   */
  whaleActivityRatio: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory: build a ScoringInput from a BirdeyeToken + optional security data
// ─────────────────────────────────────────────────────────────────────────────

export function buildScoringInput(
  token: BirdeyeToken,
  security: BirdeyeTokenSecurity | null,
  ageMinutes?: number,
  whaleActivityRatio?: number | null,
): ScoringInput {
  const now = Math.floor(Date.now() / 1000);
  const age = ageMinutes ??
    (token.lastTradeUnixTime
      ? Math.floor((now - token.lastTradeUnixTime) / 60)
      : 60);

  return {
    address:            token.address,
    price:              token.price,
    priceChange24h:     token.priceChange24hPercent,
    volume24h:          token.v24hUSD,
    volumeChange24h:    token.v24hChangePercent ?? 0,
    marketCap:          token.mc,
    liquidity:          token.liquidity,
    holders:            token.holder,
    ageMinutes:         age,
    security,
    whaleActivityRatio: whaleActivityRatio ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 1 — Liquidity Score (0–100, higher = more liquid)
// ─────────────────────────────────────────────────────────────────────────────

interface DimResult {
  score: number;
  signals: ScoringSignal[];
  labels: ScoreLabel[];
}

function scoreLiquidity(input: ScoringInput): DimResult {
  const signals: ScoringSignal[] = [];
  const labels: ScoreLabel[] = [];
  const { LIQUIDITY } = THRESHOLDS;

  // Normalize liquidity logarithmically so small differences at low values matter
  const logLiq = input.liquidity > 0 ? Math.log10(input.liquidity) : 0;
  const logLo  = Math.log10(LIQUIDITY.VERY_LOW);
  const logHi  = Math.log10(LIQUIDITY.ELITE);
  let score = normalize(logLiq, logLo, logHi);

  if (input.liquidity < LIQUIDITY.VERY_LOW) {
    score = clamp(score - 20);
    labels.push('low-liquidity');
    signal(signals, 'Critically low liquidity (< $10k)', -20, 'liquidity');
  } else if (input.liquidity < LIQUIDITY.LOW) {
    signal(signals, 'Low liquidity (< $50k) — high slippage risk', -10, 'liquidity');
    labels.push('low-liquidity');
  } else if (input.liquidity >= LIQUIDITY.HIGH) {
    signal(signals, 'Deep liquidity (> $1M) — healthy market depth', +10, 'liquidity');
  }

  // Liquidity-to-market-cap ratio — a healthy pool should back ≥ 10% of mcap
  if (input.marketCap > 0) {
    const ratio = input.liquidity / input.marketCap;
    if (ratio < 0.03) {
      score = clamp(score - 15);
      signal(signals, 'Liquidity < 3% of market cap — rug-pull risk', -15, 'liquidity');
    } else if (ratio >= 0.15) {
      signal(signals, 'Strong liquidity ratio (≥ 15% of mcap)', +8, 'liquidity');
    }
  }

  return { score: clamp(score), signals, labels };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 2 — Security Score (0–100, higher = safer)
// ─────────────────────────────────────────────────────────────────────────────

function scoreSecurity(input: ScoringInput): DimResult & { confidence: number } {
  const signals: ScoringSignal[] = [];
  const labels: ScoreLabel[] = [];

  // No security data: derive what we can from available token metrics
  if (!input.security) {
    let score = 60; // start slightly positive — innocent until proven guilty
    const confidence = 0.5;

    // Liquidity ratio is a strong rug-pull signal and we always have it
    if (input.marketCap > 0) {
      const liqRatio = input.liquidity / input.marketCap;
      if (liqRatio < 0.03) {
        score -= 20;
        signal(signals, 'Liquidity < 3% of market cap — potential rug risk', -20, 'security');
      } else if (liqRatio >= 0.10) {
        score += 10;
        signal(signals, 'Healthy liquidity ratio (≥ 10% of MC)', +10, 'security');
      }
    }

    // Holder count is a reasonable proxy for distribution
    if (input.holders < 50) {
      score -= 20;
      labels.push('low-holders');
      signal(signals, `Very few holders (${input.holders}) — high concentration risk`, -20, 'security');
    } else if (input.holders < 200) {
      score -= 10;
      labels.push('low-holders');
      signal(signals, `Low holder count (${input.holders}) — limited distribution`, -10, 'security');
    } else if (input.holders >= 1000) {
      score += 8;
      signal(signals, `Strong holder base (${input.holders.toLocaleString()})`, +8, 'security');
    }

    signal(signals, 'Full security audit unavailable — showing derived signals', 0, 'security');
    return { score: clamp(score), signals, labels, confidence };
  }

  const sec = input.security;
  let score = 100; // start clean, deduct for red flags
  let confidence = 1.0;

  // ── Holder concentration ───────────────────────────────────────
  const concentration = sec.top10HolderPercent ?? sec.top10UserPercent;
  if (concentration !== null) {
    const { CONCENTRATION } = THRESHOLDS;
    if (concentration >= CONCENTRATION.EXTREME) {
      score -= 35;
      labels.push('concentrated-supply');
      signal(signals, `Top-10 wallets hold ${(concentration * 100).toFixed(0)}% of supply — extreme risk`, -35, 'security');
    } else if (concentration >= CONCENTRATION.HIGH) {
      score -= 20;
      labels.push('concentrated-supply');
      signal(signals, `Top-10 wallets hold ${(concentration * 100).toFixed(0)}% of supply — high concentration`, -20, 'security');
    } else if (concentration >= CONCENTRATION.ELEVATED) {
      score -= 10;
      signal(signals, `Top-10 wallets hold ${(concentration * 100).toFixed(0)}% of supply — elevated`, -10, 'security');
    } else {
      signal(signals, `Supply well distributed (top-10: ${(concentration * 100).toFixed(0)}%)`, +5, 'security');
    }
  } else {
    confidence -= 0.15; // no concentration data
  }

  // ── Mutable metadata ──────────────────────────────────────────
  if (sec.isMutable === true) {
    score -= 10;
    labels.push('mutable-metadata');
    signal(signals, 'Metadata is mutable — dev can change name/image', -10, 'security');
  } else if (sec.isMutable === false) {
    signal(signals, 'Metadata is immutable', +5, 'security');
  }

  // ── Mintable (can mint more supply) ───────────────────────────
  if (sec.mintable === true) {
    score -= 15;
    labels.push('mintable');
    signal(signals, 'Mint authority active — supply can be inflated', -15, 'security');
  } else if (sec.mintable === false) {
    signal(signals, 'Mint authority disabled — fixed supply', +8, 'security');
  }

  // ── Freeze authority ──────────────────────────────────────────
  if (sec.freezeable === true) {
    score -= 12;
    labels.push('freezeable');
    signal(signals, 'Freeze authority active — wallets can be frozen', -12, 'security');
  } else if (sec.freezeable === false) {
    signal(signals, 'No freeze authority — wallets cannot be frozen', +5, 'security');
  }

  // ── LP burned ─────────────────────────────────────────────────
  if (sec.burnedLp === true) {
    score += 10;
    labels.push('lp-burned');
    signal(signals, 'LP tokens burned — liquidity locked permanently', +10, 'security');
  } else if (sec.burnedLp === false) {
    score -= 8;
    signal(signals, 'LP tokens NOT burned — liquidity can be removed', -8, 'security');
  }

  // ── Transfer fee (Token-2022) ──────────────────────────────────
  if (sec.transferFeeEnable === true && sec.transferFeeData) {
    labels.push('transfer-fee');
    const bps = sec.transferFeeData.newerTransferFee.transferFeeBasisPoints;
    const { TRANSFER_FEE } = THRESHOLDS;
    if (bps > TRANSFER_FEE.EXTREME) {
      score -= 25;
      labels.push('honeypot-risk');
      signal(signals, `Transfer fee is ${(bps / 100).toFixed(1)}% — potential honeypot`, -25, 'security');
    } else if (bps > TRANSFER_FEE.SUSPICIOUS) {
      score -= 15;
      signal(signals, `Transfer fee is ${(bps / 100).toFixed(1)}% — suspicious`, -15, 'security');
    } else {
      signal(signals, `Transfer fee ${(bps / 100).toFixed(1)}% — acceptable`, -3, 'security');
      score -= 3;
    }
  }

  // ── Non-transferable ──────────────────────────────────────────
  if (sec.nonTransferable === true) {
    score -= 20;
    labels.push('honeypot-risk');
    signal(signals, 'Token is non-transferable — likely honeypot or soul-bound', -20, 'security');
  }

  return { score: clamp(score), signals, labels, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 3 — Risk Score (0–100, higher = LESS risky)
// Aggregates security, liquidity, and holder health
// ─────────────────────────────────────────────────────────────────────────────

function scoreRisk(
  input: ScoringInput,
  secScore: number,
  liqScore: number,
): DimResult {
  const signals: ScoringSignal[] = [];
  const labels: ScoreLabel[] = [];
  const { HOLDERS } = THRESHOLDS;

  // Start from a blend of security + liquidity
  let score = secScore * 0.5 + liqScore * 0.5;

  // ── Holder count ──────────────────────────────────────────────
  if (input.holders < HOLDERS.VERY_LOW) {
    score = clamp(score - 20);
    labels.push('low-holders');
    signal(signals, `Only ${input.holders} holders — very thin community`, -20, 'risk');
  } else if (input.holders < HOLDERS.LOW) {
    score = clamp(score - 10);
    labels.push('low-holders');
    signal(signals, `${input.holders} holders — limited adoption`, -10, 'risk');
  } else if (input.holders >= HOLDERS.HEALTHY) {
    signal(signals, `${input.holders.toLocaleString()} holders — healthy community`, +8, 'risk');
  } else if (input.holders >= HOLDERS.STRONG) {
    signal(signals, `${input.holders.toLocaleString()} holders — strong community`, +15, 'risk');
  }

  // ── Token age ─────────────────────────────────────────────────
  // Brand-new tokens (<30 min) carry inherently more risk
  if (input.ageMinutes < 30) {
    score = clamp(score - 15);
    labels.push('new-token');
    signal(signals, `Token is only ${input.ageMinutes}m old — very new, high risk`, -15, 'risk');
  } else if (input.ageMinutes < 120) {
    score = clamp(score - 8);
    labels.push('new-token');
    signal(signals, `Token is ${input.ageMinutes}m old — early stage`, -8, 'risk');
  }

  // ── Whale activity ────────────────────────────────────────────
  if (input.whaleActivityRatio !== null) {
    if (input.whaleActivityRatio > 0.5) {
      score = clamp(score - 10);
      labels.push('whale-activity');
      signal(signals, `Whales control ${(input.whaleActivityRatio * 100).toFixed(0)}% of recent volume — manipulation risk`, -10, 'risk');
    } else if (input.whaleActivityRatio < 0.1) {
      signal(signals, 'Low whale dominance — organic retail volume', +5, 'risk');
    }
  }

  // ── Extreme price crash ────────────────────────────────────────
  if (input.priceChange24h < THRESHOLDS.PRICE_CHANGE.CRASH) {
    score = clamp(score - 10);
    signal(signals, `Price down ${input.priceChange24h.toFixed(1)}% in 24h — possible exit`, -10, 'risk');
  }

  return { score: clamp(score), signals, labels };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 4 — Momentum Score (0–100)
// Measures short-term buying pressure
// ─────────────────────────────────────────────────────────────────────────────

function scoreMomentum(input: ScoringInput): DimResult {
  const signals: ScoringSignal[] = [];
  const labels: ScoreLabel[] = [];
  const { PRICE_CHANGE } = THRESHOLDS;

  let score = 50; // neutral baseline

  // ── Price change ──────────────────────────────────────────────
  const pc = input.priceChange24h;
  if (pc >= PRICE_CHANGE.PARABOLIC) {
    score += 40;
    labels.push('price-breakout');
    signal(signals, `Price +${pc.toFixed(0)}% in 24h — parabolic momentum`, +40, 'momentum');
  } else if (pc >= PRICE_CHANGE.EXTREME) {
    score += 30;
    labels.push('price-breakout');
    signal(signals, `Price +${pc.toFixed(0)}% in 24h — breakout momentum`, +30, 'momentum');
  } else if (pc >= PRICE_CHANGE.STRONG_UP) {
    score += 18;
    labels.push('trending');
    signal(signals, `Price +${pc.toFixed(0)}% in 24h — strong uptrend`, +18, 'momentum');
  } else if (pc >= PRICE_CHANGE.SLIGHT_UP) {
    score += 8;
    signal(signals, `Price +${pc.toFixed(0)}% in 24h — mild positive`, +8, 'momentum');
  } else if (pc < PRICE_CHANGE.CRASH) {
    score -= 30;
    signal(signals, `Price ${pc.toFixed(0)}% in 24h — severe downtrend`, -30, 'momentum');
  } else if (pc < PRICE_CHANGE.DOWN) {
    score -= 15;
    signal(signals, `Price ${pc.toFixed(0)}% in 24h — downtrend`, -15, 'momentum');
  }

  // ── Volume level ──────────────────────────────────────────────
  const { VOLUME } = THRESHOLDS;
  if (input.volume24h >= VOLUME.EXTREME) {
    score += 20;
    labels.push('high-volume');
    signal(signals, `$${(input.volume24h / 1e6).toFixed(1)}M volume — extreme activity`, +20, 'momentum');
  } else if (input.volume24h >= VOLUME.HIGH) {
    score += 12;
    labels.push('high-volume');
    signal(signals, `$${(input.volume24h / 1e6).toFixed(1)}M volume — high activity`, +12, 'momentum');
  } else if (input.volume24h >= VOLUME.MEDIUM) {
    score += 5;
    signal(signals, `$${(input.volume24h / 1e3).toFixed(0)}K volume — moderate activity`, +5, 'momentum');
  } else if (input.volume24h < VOLUME.MINIMAL) {
    score -= 15;
    signal(signals, 'Volume < $5K — near-zero trading activity', -15, 'momentum');
  }

  // ── Volume change (acceleration) ──────────────────────────────
  if (input.volumeChange24h > 100) {
    score += 10;
    labels.push('volume-spike');
    signal(signals, `Volume up ${input.volumeChange24h.toFixed(0)}% vs yesterday — volume surge`, +10, 'momentum');
  } else if (input.volumeChange24h < -50) {
    score -= 8;
    signal(signals, `Volume down ${Math.abs(input.volumeChange24h).toFixed(0)}% — fading interest`, -8, 'momentum');
  }

  // ── Volume confirms price ──────────────────────────────────────
  // Price up + volume up = strong signal. Price up + volume down = weak.
  const priceUp   = input.priceChange24h > PRICE_CHANGE.SLIGHT_UP;
  const volumeUp  = input.volumeChange24h > 20;
  const volumeDown = input.volumeChange24h < -20;

  if (priceUp && volumeUp) {
    score += 8;
    labels.push('breakout');
    signal(signals, 'Price + volume both rising — confirmed breakout signal', +8, 'momentum');
  } else if (priceUp && volumeDown) {
    score -= 5;
    signal(signals, 'Price rising on falling volume — weak, unconfirmed move', -5, 'momentum');
  }

  return { score: clamp(score), signals, labels };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 5 — Opportunity Score (0–100)
// Combination of risk-adjusted upside and market positioning
// ─────────────────────────────────────────────────────────────────────────────

function scoreOpportunity(
  input: ScoringInput,
  riskScore: number,
  momentumScore: number,
): DimResult {
  const signals: ScoringSignal[] = [];
  const labels: ScoreLabel[] = [];

  // Base = blend of momentum and risk. The higher the risk, the more it
  // discounts pure momentum (high gain on a rug is still bad opportunity).
  let score = momentumScore * 0.6 + riskScore * 0.4;

  // ── Low mcap premium — asymmetric upside ──────────────────────
  const { MC } = THRESHOLDS;
  if (input.marketCap > 0 && input.marketCap < MC.MICRO) {
    score += 15;
    labels.push('low-mcap-gem');
    signal(signals, `Micro-cap (${(input.marketCap / 1e3).toFixed(0)}K mcap) — high upside potential`, +15, 'opportunity');
  } else if (input.marketCap < MC.SMALL) {
    score += 8;
    labels.push('low-mcap-gem');
    signal(signals, `Small-cap — room to grow vs large caps`, +8, 'opportunity');
  } else if (input.marketCap >= MC.MID) {
    score -= 5;
    signal(signals, 'Large-cap — limited explosive upside', -5, 'opportunity');
  }

  // ── New token bonus — early entry advantage ───────────────────
  if (input.ageMinutes < 60 && riskScore >= 50) {
    // Only reward newness if it's not already flagged as high-risk
    score += 10;
    signal(signals, 'Early entry opportunity — token < 1h old', +10, 'opportunity');
  }

  // ── Whale activity as a POSITIVE signal ───────────────────────
  // Whale accumulation (not only volatility) can foreshadow pumps
  if (input.whaleActivityRatio !== null && input.whaleActivityRatio > 0.3 && riskScore > 55) {
    score += 8;
    labels.push('whale-activity');
    signal(signals, 'Whale accumulation detected on a relatively safe token', +8, 'opportunity');
  }

  // ── Penalise high-risk tokens — bad risk/reward ────────────────
  if (riskScore < 30) {
    score = clamp(score - 20);
    signal(signals, 'Very high risk significantly reduces opportunity rating', -20, 'opportunity');
  } else if (riskScore < 50) {
    score = clamp(score - 10);
    signal(signals, 'Elevated risk discounts opportunity score', -10, 'opportunity');
  }

  return { score: clamp(score), signals, labels };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict engine
// ─────────────────────────────────────────────────────────────────────────────

function computeVerdict(
  overall:     number,
  risk:        number,
  opportunity: number,
  momentum:    number,
  security:    number,
  labels:      ScoreLabel[],
): { verdict: Verdict; reason: string } {
  // Hard AVOID conditions — regardless of other scores
  if (labels.includes('honeypot-risk')) {
    return { verdict: 'AVOID', reason: 'Honeypot or non-transferable token detected.' };
  }
  if (security < 25) {
    return { verdict: 'AVOID', reason: 'Critical security flags (mintable, freezeable, extreme concentration).' };
  }
  if (risk < 20) {
    return { verdict: 'AVOID', reason: 'Risk score critically low — extreme rug-pull probability.' };
  }
  if (labels.includes('concentrated-supply') && labels.includes('mintable')) {
    return { verdict: 'AVOID', reason: 'Concentrated supply combined with active mint authority.' };
  }

  // BUY conditions — must clear a safety floor first
  if (risk >= 60 && security >= 55 && opportunity >= 70 && momentum >= 65) {
    return { verdict: 'BUY', reason: 'Strong opportunity signal backed by healthy risk profile and momentum.' };
  }
  if (overall >= 72 && risk >= 55 && !labels.includes('low-liquidity')) {
    return { verdict: 'BUY', reason: 'High composite score with acceptable liquidity and risk.' };
  }
  if (labels.includes('breakout') && labels.includes('lp-burned') && risk >= 60) {
    return { verdict: 'BUY', reason: 'Confirmed breakout with burned LP — strong early signal.' };
  }

  // AVOID conditions below BUY threshold
  if (overall < 30) {
    return { verdict: 'AVOID', reason: 'Low composite score across all dimensions.' };
  }
  if (labels.includes('low-liquidity') && labels.includes('high-risk')) {
    return { verdict: 'AVOID', reason: 'Low liquidity combined with high risk flags.' };
  }

  // WATCH — everything in between
  const watchReasons: string[] = [];
  if (opportunity >= 60) watchReasons.push('decent opportunity upside');
  if (risk >= 55)        watchReasons.push('manageable risk');
  if (momentum >= 60)    watchReasons.push('positive momentum');
  if (labels.includes('new-token')) watchReasons.push('very new token needs monitoring');

  const reason = watchReasons.length
    ? `Monitor closely — ${watchReasons.join(', ')}.`
    : 'Mixed signals — insufficient confidence for entry.';

  return { verdict: 'WATCH', reason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — scoreToken()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a full TokenScore for a given input.
 *
 * @example
 * const input = buildScoringInput(birdeyeToken, securityData);
 * const score = scoreToken(input);
 * console.log(score.verdict);       // "BUY" | "WATCH" | "AVOID"
 * console.log(score.overall);       // 0–100
 * console.log(score.signals);       // human-readable explanation array
 */
export function scoreToken(input: ScoringInput): TokenScore {
  // ── Compute each dimension ────────────────────────────────────
  const liqDim  = scoreLiquidity(input);
  const secDim  = scoreSecurity(input);
  const riskDim = scoreRisk(input, secDim.score, liqDim.score);
  const momDim  = scoreMomentum(input);
  const oppDim  = scoreOpportunity(input, riskDim.score, momDim.score);

  // ── Weighted composite ────────────────────────────────────────
  const overall = clamp(
    Math.round(
      riskDim.score        * WEIGHTS.risk        +
      oppDim.score         * WEIGHTS.opportunity  +
      momDim.score         * WEIGHTS.momentum     +
      liqDim.score         * WEIGHTS.liquidity    +
      secDim.score         * WEIGHTS.security,
    ),
  );

  // ── Merge labels (deduplicate) ────────────────────────────────
  const labelSet = new Set<ScoreLabel>([
    ...liqDim.labels,
    ...secDim.labels,
    ...riskDim.labels,
    ...momDim.labels,
    ...oppDim.labels,
  ]);
  const labels = Array.from(labelSet);

  // ── Merge signals with category markers ──────────────────────
  const signals: ScoringSignal[] = [
    ...liqDim.signals,
    ...secDim.signals,
    ...riskDim.signals,
    ...momDim.signals,
    ...oppDim.signals,
  ];

  // ── Verdict ───────────────────────────────────────────────────
  const { verdict, reason } = computeVerdict(
    overall,
    riskDim.score,
    oppDim.score,
    momDim.score,
    secDim.score,
    labels,
  );

  return {
    address:       input.address,
    overall,
    risk:          Math.round(riskDim.score),
    opportunity:   Math.round(oppDim.score),
    momentum:      Math.round(momDim.score),
    liquidity:     Math.round(liqDim.score),
    security:      Math.round(secDim.score),
    verdict,
    verdictReason: reason,
    labels,
    signals,
    confidence:    clamp(secDim.confidence, 0, 1),
    computedAt:    Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch helper — score multiple tokens, sorted by overall descending
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score an array of inputs and return them sorted best-first.
 * Useful for ranking dashboards and leaderboards.
 */
export function scoreTokenBatch(inputs: ScoringInput[]): TokenScore[] {
  return inputs
    .map(scoreToken)
    .sort((a, b) => b.overall - a.overall);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: compute score delta between two snapshots
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreDelta {
  overall:     number;
  risk:        number;
  opportunity: number;
  momentum:    number;
  verdictChanged: boolean;
}

/**
 * Compare two snapshots of the same token's score (e.g. now vs 30s ago).
 * Positive delta means score improved.
 */
export function computeScoreDelta(prev: TokenScore, curr: TokenScore): ScoreDelta {
  return {
    overall:        curr.overall     - prev.overall,
    risk:           curr.risk        - prev.risk,
    opportunity:    curr.opportunity - prev.opportunity,
    momentum:       curr.momentum    - prev.momentum,
    verdictChanged: curr.verdict !== prev.verdict,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types expected by consumers
// ─────────────────────────────────────────────────────────────────────────────

export type { TokenScore, ScoringSignal, ScoreLabel, Verdict };
