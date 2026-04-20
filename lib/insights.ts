/**
 * lib/insights.ts — AlphaScope AI Insight Engine
 *
 * Generates human-readable token insights in two modes:
 *
 *   1. Real AI  — Calls Google Gemini (gemini-1.5-flash, free tier) when
 *                 GEMINI_API_KEY is present. The prompt is carefully structured
 *                 to produce concise, professional analyst prose.
 *
 *   2. Rule-based fallback — A rich deterministic engine that covers the full
 *                 insight space from the five scoring dimensions. Produces
 *                 coherent, specific sentences using the actual score numbers
 *                 and security flags. Works with zero API keys.
 *
 * Usage:
 *   import { generateInsight, buildInsightInput } from '@/lib/insights';
 *
 *   const input  = buildInsightInput(token, security, score);
 *   const result = await generateInsight(input);
 *   console.log(result.text);   // "Liquidity is strong…"
 *   console.log(result.source); // "gemini" | "rule-based"
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TokenScore, BirdeyeToken, BirdeyeTokenSecurity } from '@/lib/types';

// ─── Input / output types ─────────────────────────────────────────────────────

export type PriceTrend = 'strong-up' | 'up' | 'flat' | 'down' | 'strong-down';

export interface InsightInput {
  // Core scores from the scoring engine (all 0–100)
  riskScore:        number;
  opportunityScore: number;
  securityScore:    number;
  momentumScore:    number;
  liquidityScore:   number;
  overallScore:     number;
  confidence:       number;   // 0–1

  // Price data
  priceTrend:       PriceTrend;
  priceChange24h:   number;   // % (signed)
  volumeChange24h:  number;   // % change in 24h volume
  volume24h:        number;   // USD

  // Market data
  liquidity:        number;   // USD
  marketCap:        number;   // USD
  holders:          number;

  // Verdict
  verdict:          'BUY' | 'WATCH' | 'AVOID';
  verdictReason:    string;

  // Security flags (all nullable — engine handles missing data gracefully)
  security: {
    mintable:             boolean | null;
    freezeable:           boolean | null;
    burnedLp:             boolean | null;
    isMutable:            boolean | null;
    nonTransferable:      boolean | null;
    top10HolderPercent:   number | null;   // 0–1
    transferFeeEnabled:   boolean | null;
    transferFeeBps:       number | null;   // basis points
  } | null;

  // Optional metadata for richer AI prompts
  tokenName?:  string;
  symbol?:     string;
  ageMinutes?: number;
  labels?:     string[];    // ScoreLabel[]
}

export interface InsightOutput {
  text:    string;
  source:  'gemini' | 'rule-based';
  model?:  string;          // e.g. "gemini-1.5-flash"
}

// ─── Factory: build InsightInput from native types ────────────────────────────

/**
 * Convert the raw Birdeye + scoring data into a clean InsightInput.
 * Pass this to generateInsight().
 */
export function buildInsightInput(
  token:    BirdeyeToken,
  security: BirdeyeTokenSecurity | null,
  score:    TokenScore,
): InsightInput {
  const pct = token.priceChange24hPercent;
  const trend: PriceTrend =
    pct >= 30  ? 'strong-up'   :
    pct >= 5   ? 'up'          :
    pct <= -20 ? 'strong-down' :
    pct <= -5  ? 'down'        :
                 'flat';

  return {
    riskScore:        score.risk,
    opportunityScore: score.opportunity,
    securityScore:    score.security,
    momentumScore:    score.momentum,
    liquidityScore:   score.liquidity,
    overallScore:     score.overall,
    confidence:       score.confidence,

    priceTrend:       trend,
    priceChange24h:   token.priceChange24hPercent,
    volumeChange24h:  token.v24hChangePercent,
    volume24h:        token.v24hUSD,

    liquidity:        token.liquidity,
    marketCap:        token.mc,
    holders:          token.holder,

    verdict:          score.verdict,
    verdictReason:    score.verdictReason,

    security: security
      ? {
          mintable:           security.mintable,
          freezeable:         security.freezeable,
          burnedLp:           security.burnedLp,
          isMutable:          security.isMutable,
          nonTransferable:    security.nonTransferable,
          top10HolderPercent: security.top10HolderPercent ?? security.top10UserPercent,
          transferFeeEnabled: security.transferFeeEnable,
          transferFeeBps:     security.transferFeeData?.newerTransferFee.transferFeeBasisPoints ?? null,
        }
      : null,

    tokenName:  token.name,
    symbol:     token.symbol,
    ageMinutes: token.lastTradeUnixTime
      ? Math.floor((Date.now() / 1000 - token.lastTradeUnixTime) / 60)
      : undefined,
    labels: score.labels,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Rule-based insight engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Five independent sentence generators — one per scoring dimension.
 * Each returns a specific, number-anchored sentence.
 */

function liquiditySentence(input: InsightInput): string {
  const liq = input.liquidity;
  if (liq >= 5_000_000)
    return `Liquidity is excellent at $${(liq / 1e6).toFixed(1)}M — deep enough to absorb large orders without meaningful slippage.`;
  if (liq >= 1_000_000)
    return `Liquidity of $${(liq / 1e6).toFixed(1)}M is solid, providing reliable entry and exit depth for most position sizes.`;
  if (liq >= 250_000)
    return `Liquidity stands at $${(liq / 1e3).toFixed(0)}K — sufficient for small to mid-sized positions, but watch for widening spreads on larger trades.`;
  if (liq >= 50_000)
    return `Liquidity is thin at $${(liq / 1e3).toFixed(0)}K — even moderate buy or sell pressure can cause notable price impact.`;
  return `Liquidity is critically low at $${(liq / 1e3).toFixed(0)}K — exit risk is very high; treat any entry with extreme caution.`;
}

function securitySentence(input: InsightInput): string {
  if (!input.security) {
    return 'Security data is unavailable — treat this token with extra caution until on-chain flags can be verified.';
  }
  const s = input.security;
  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (s.mintable === true)    redFlags.push('active mint authority (supply can inflate)');
  if (s.freezeable === true)  redFlags.push('freeze authority active (wallets can be frozen)');
  if (s.burnedLp === false)   redFlags.push('LP not burned (liquidity is removable)');
  if (s.isMutable === true)   redFlags.push('mutable metadata');
  if (s.nonTransferable)      redFlags.push('non-transferable token (potential honeypot)');

  if (s.mintable === false)   greenFlags.push('fixed supply');
  if (s.freezeable === false) greenFlags.push('no freeze authority');
  if (s.burnedLp === true)    greenFlags.push('LP burned');

  const concPct = s.top10HolderPercent;
  if (concPct !== null) {
    const pct = (concPct * 100).toFixed(0);
    if (concPct >= 0.9)     redFlags.push(`top-10 wallets hold ${pct}% of supply — extreme concentration`);
    else if (concPct >= 0.7) redFlags.push(`top-10 wallets control ${pct}% — high concentration`);
    else if (concPct >= 0.5) redFlags.push(`top-10 concentration at ${pct}% — elevated`);
    else                     greenFlags.push(`supply reasonably distributed (top-10: ${pct}%)`);
  }

  if (s.transferFeeEnabled && s.transferFeeBps) {
    const feePct = (s.transferFeeBps / 100).toFixed(2);
    if (s.transferFeeBps > 300) redFlags.push(`transfer fee of ${feePct}% on every transaction`);
  }

  if (redFlags.length === 0 && greenFlags.length > 0) {
    return `Security posture is clean: ${greenFlags.slice(0, 3).join(', ')} — no major red flags detected.`;
  }
  if (redFlags.length === 0) {
    return 'Security score looks clean with no critical authority flags.';
  }
  const flagText = redFlags.slice(0, 3).join('; ');
  return `Security concerns require attention: ${flagText}.`;
}

function priceSentence(input: InsightInput): string {
  const pct  = input.priceChange24h;
  const volCh = input.volumeChange24h;

  if (input.priceTrend === 'strong-up') {
    if (volCh > 50)
      return `Price has surged ${pct.toFixed(1)}% in 24 hours on ${volCh.toFixed(0)}% rising volume — a strong, volume-confirmed breakout signal.`;
    return `Price is up a sharp ${pct.toFixed(1)}% over 24 hours, though the volume increase is modest — watch for a pullback.`;
  }
  if (input.priceTrend === 'up') {
    if (volCh > 30)
      return `Early upward momentum with a ${pct.toFixed(1)}% gain and ${volCh.toFixed(0)}% volume increase — building a bullish structure.`;
    return `Price is up ${pct.toFixed(1)}% over 24 hours with steady but unremarkable volume — monitor for acceleration.`;
  }
  if (input.priceTrend === 'strong-down') {
    return `Price has declined ${Math.abs(pct).toFixed(1)}% in 24 hours — significant selling pressure; avoid catching a falling knife without clear reversal signals.`;
  }
  if (input.priceTrend === 'down') {
    return `Price is down ${Math.abs(pct).toFixed(1)}% over 24 hours — moderate bearish pressure; wait for stabilisation before considering entry.`;
  }
  return `Price action is flat (${pct.toFixed(1)}%) over 24 hours — consolidating range with no decisive directional signal yet.`;
}

function opportunitySentence(input: InsightInput): string {
  const opp = input.opportunityScore;
  const mc  = input.marketCap;

  const capStr =
    mc >= 100_000_000 ? `$${(mc / 1e6).toFixed(0)}M market cap` :
    mc >= 1_000_000   ? `$${(mc / 1e6).toFixed(1)}M market cap` :
                        `$${(mc / 1e3).toFixed(0)}K market cap`;

  if (opp >= 75) {
    return `Opportunity score of ${opp}/100 is high — the ${capStr} and current momentum suggest meaningful upside for early participants.`;
  }
  if (opp >= 55) {
    return `Opportunity scores at ${opp}/100 — moderate upside potential with a ${capStr}; entry timing will be key.`;
  }
  if (opp >= 35) {
    return `Opportunity is limited (${opp}/100) at the current ${capStr} — risk/reward is not compelling without further catalyst.`;
  }
  return `Opportunity score of ${opp}/100 is low — the current profile does not offer a favourable asymmetric setup.`;
}

function riskSentence(input: InsightInput): string {
  const risk = input.riskScore;
  const h    = input.holders;

  const holderStr =
    h >= 10_000 ? `${(h / 1e3).toFixed(1)}K holders` :
    h >= 1_000  ? `${h.toLocaleString()} holders` :
    h > 0       ? `only ${h} holders` :
                  'holder data unavailable';

  if (risk >= 72) {
    return `Risk score of ${risk}/100 is healthy — ${holderStr} and the overall profile suggest a relatively lower probability of sudden collapse.`;
  }
  if (risk >= 50) {
    return `Risk score of ${risk}/100 is moderate — ${holderStr}; position sizing discipline and tight stops are recommended.`;
  }
  if (risk >= 30) {
    return `Risk is elevated at ${risk}/100 — ${holderStr} and the risk profile point to meaningful rug or dump probability.`;
  }
  return `Risk score of ${risk}/100 is critically low — ${holderStr}. High probability of adverse outcome; the scoring engine flags this as a significant danger.`;
}

function verdictSentence(input: InsightInput): string {
  const confPct = Math.round(input.confidence * 100);
  switch (input.verdict) {
    case 'BUY':
      return `Net verdict: BUY (confidence ${confPct}%) — ${input.verdictReason}`;
    case 'AVOID':
      return `Net verdict: AVOID (confidence ${confPct}%) — ${input.verdictReason}`;
    case 'WATCH':
      return `Net verdict: WATCH (confidence ${confPct}%) — ${input.verdictReason}`;
  }
}

/**
 * Pure rule-based insight — no network, no randomness.
 * Always returns a coherent 4–5 sentence paragraph.
 */
export function buildRuleBasedInsight(input: InsightInput): string {
  const sentences = [
    liquiditySentence(input),
    securitySentence(input),
    priceSentence(input),
    opportunitySentence(input),
    riskSentence(input),
    verdictSentence(input),
  ];
  return sentences.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Gemini AI prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildGeminiPrompt(input: InsightInput): string {
  const sec = input.security;

  const securityBlock = sec
    ? [
        `mint authority=${sec.mintable ?? 'unknown'}`,
        `freeze=${sec.freezeable ?? 'unknown'}`,
        `LP burned=${sec.burnedLp ?? 'unknown'}`,
        `mutable metadata=${sec.isMutable ?? 'unknown'}`,
        `top-10 concentration=${
          sec.top10HolderPercent != null
            ? `${(sec.top10HolderPercent * 100).toFixed(0)}%`
            : 'unknown'
        }`,
        sec.transferFeeEnabled && sec.transferFeeBps
          ? `transfer fee=${(sec.transferFeeBps / 100).toFixed(2)}%`
          : 'no transfer fee',
      ].join(', ')
    : 'not available';

  const labelBlock = input.labels?.length
    ? input.labels.join(', ')
    : 'none';

  const ageBlock = input.ageMinutes != null
    ? `${input.ageMinutes < 60
        ? `${input.ageMinutes}m old`
        : `${Math.floor(input.ageMinutes / 60)}h old`}`
    : 'unknown age';

  return `
You are a concise, professional crypto analyst writing a brief insight shown on an analytics dashboard.

Token: ${input.tokenName ?? 'Unknown'} (${input.symbol ?? '?'}) · ${ageBlock}
Price trend: ${input.priceTrend} (${input.priceChange24h.toFixed(2)}% 24h)
Volume 24h: $${(input.volume24h / 1e3).toFixed(0)}K (${input.volumeChange24h.toFixed(0)}% change)
Liquidity: $${(input.liquidity / 1e3).toFixed(0)}K | Market cap: $${(input.marketCap / 1e6).toFixed(2)}M
Holders: ${input.holders.toLocaleString()}

Scores (0–100, higher is better for all dimensions):
  Overall=${input.overallScore}  Risk=${input.riskScore}  Opportunity=${input.opportunityScore}
  Momentum=${input.momentumScore}  Liquidity=${input.liquidityScore}  Security=${input.securityScore}
  Confidence=${Math.round(input.confidence * 100)}%

Verdict: ${input.verdict} — ${input.verdictReason}
Security: ${securityBlock}
Labels: ${labelBlock}

Write a 3–4 sentence analyst insight in plain prose. Rules:
- No bullet points, headers, or markdown formatting
- Be specific — reference actual numbers from the data
- Mention the primary risk if any
- Mention what the trader should watch for
- End with the net recommendation aligned with the verdict
- Professional but approachable tone
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Main export
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-1.5-flash';

/**
 * Generate a human-readable insight for a token.
 *
 * Tries Gemini when GEMINI_API_KEY is set; falls back to the rule-based engine
 * if the key is missing or the API call fails for any reason.
 *
 * @example
 * const input  = buildInsightInput(birdeyeToken, securityData, tokenScore);
 * const result = await generateInsight(input);
 * console.log(result.text);    // "Liquidity is excellent…"
 * console.log(result.source);  // "gemini" | "rule-based"
 */
export async function generateInsight(input: InsightInput): Promise<InsightOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { text: buildRuleBasedInsight(input), source: 'rule-based' };
  }

  try {
    const genAI  = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = buildGeminiPrompt(input);

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    if (text.length < 30) {
      // Suspiciously short — fall through to rule-based
      throw new Error('Gemini returned an unusually short response');
    }

    return { text, source: 'gemini', model: GEMINI_MODEL };
  } catch {
    // Silent fallback — UI always gets a useful insight
    return { text: buildRuleBasedInsight(input), source: 'rule-based' };
  }
}
