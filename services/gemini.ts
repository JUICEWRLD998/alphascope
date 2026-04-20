/**
 * services/gemini.ts
 *
 * AI Insight generation via Google Gemini (free tier).
 *
 * Model: gemini-1.5-flash — fast, free-tier capable, low latency.
 *
 * Usage:
 *   const insight = await generateTokenInsight({ ... });
 *
 * Requires:
 *   GEMINI_API_KEY in .env.local
 *   Get yours free at: https://aistudio.google.com/app/apikey
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TokenScore, BirdeyeToken, BirdeyeTokenSecurity } from '@/lib/types';

// ─── Input contract ───────────────────────────────────────────────────────────

export interface GeminiInsightInput {
  token:    BirdeyeToken;
  security: BirdeyeTokenSecurity | null;
  score:    TokenScore;
}

// ─── Fallback: build a deterministic insight from score data when no API key ──

function buildFallbackInsight(input: GeminiInsightInput): string {
  const { token, score, security } = input;
  const parts: string[] = [];

  // Liquidity read
  if (token.liquidity >= 1_000_000) {
    parts.push('Liquidity is strong, providing solid entry and exit depth.');
  } else if (token.liquidity >= 100_000) {
    parts.push('Liquidity is moderate — sufficient for small positions but watch for slippage.');
  } else {
    parts.push('Liquidity is thin — even small trades can move the price significantly.');
  }

  // Security read
  if (security) {
    const flags: string[] = [];
    if (security.mintable)  flags.push('active mint authority');
    if (security.freezeable) flags.push('freeze authority active');
    if (!security.burnedLp)  flags.push('LP not burned');
    if (security.isMutable)  flags.push('mutable metadata');
    if (flags.length === 0) {
      parts.push('Security posture is clean — no major red flags detected.');
    } else {
      parts.push(`Security concerns present: ${flags.join(', ')}.`);
    }
  } else {
    parts.push('Security data is unavailable — treat with caution until audited.');
  }

  // Momentum read
  if (token.priceChange24hPercent > 20) {
    parts.push('Strong upward momentum over the past 24 hours with elevated volume.');
  } else if (token.priceChange24hPercent > 5) {
    parts.push('Early momentum building — watch for a confirmation candle.');
  } else if (token.priceChange24hPercent < -15) {
    parts.push('Significant downward pressure in the last 24 hours — caution advised.');
  } else {
    parts.push('Price action is relatively flat with no decisive directional signal.');
  }

  // Verdict read
  if (score.verdict === 'BUY') {
    parts.push(`Composite score of ${score.overall} qualifies for a BUY signal — ${score.verdictReason}`);
  } else if (score.verdict === 'AVOID') {
    parts.push(`Score of ${score.overall} triggers an AVOID verdict: ${score.verdictReason}`);
  } else {
    parts.push(`Overall score of ${score.overall} places this token in WATCH territory — ${score.verdictReason}`);
  }

  return parts.join(' ');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a natural-language AI insight for a token using Gemini.
 *
 * Gracefully falls back to a deterministic summary if:
 *  - GEMINI_API_KEY is not set
 *  - The Gemini API call fails for any reason
 *
 * Returns the insight string (never throws).
 */
export async function generateTokenInsight(
  input: GeminiInsightInput,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return buildFallbackInsight(input);
  }

  const { token, security, score } = input;

  // ── Build a concise, structured prompt ────────────────────────────────────
  const securitySummary = security
    ? [
        `mintable=${security.mintable ?? 'unknown'}`,
        `freezeable=${security.freezeable ?? 'unknown'}`,
        `LP burned=${security.burnedLp ?? 'unknown'}`,
        `mutable metadata=${security.isMutable ?? 'unknown'}`,
        `top-10 holder concentration=${
          security.top10HolderPercent != null
            ? `${(security.top10HolderPercent * 100).toFixed(0)}%`
            : 'unknown'
        }`,
      ].join(', ')
    : 'not available';

  const signalSummary = score.signals
    .slice(0, 6)
    .map((s) => `${s.label} (${s.impact}, ${s.delta > 0 ? '+' : ''}${s.delta}pts)`)
    .join('; ');

  const prompt = `
You are a concise, professional crypto analyst writing a brief insight for an analytics dashboard.

Token: ${token.name} (${token.symbol})
Price: $${token.price} | 24h change: ${token.priceChange24hPercent.toFixed(2)}%
Market cap: $${(token.mc / 1e6).toFixed(2)}M | Liquidity: $${(token.liquidity / 1e3).toFixed(0)}K
Volume 24h: $${(token.v24hUSD / 1e3).toFixed(0)}K | Holders: ${token.holder.toLocaleString()}

Scores (0–100, higher is better):
- Overall: ${score.overall} | Risk: ${score.risk} | Opportunity: ${score.opportunity}
- Momentum: ${score.momentum} | Liquidity: ${score.liquidity} | Security: ${score.security}
- Verdict: ${score.verdict} — ${score.verdictReason}
- Confidence: ${Math.round(score.confidence * 100)}%

Security flags: ${securitySummary}
Key signals: ${signalSummary || 'none'}

Write a 3–4 sentence analyst insight in plain prose (no bullet points, no markdown, no headers).
Be specific — reference actual numbers. Mention what to watch. Be direct and professional.
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    // Sanity check — must not be empty
    if (text.length < 20) {
      return buildFallbackInsight(input);
    }

    return text;
  } catch {
    // Never surface Gemini errors to the UI — fall back silently
    return buildFallbackInsight(input);
  }
}
