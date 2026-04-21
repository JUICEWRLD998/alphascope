import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Request shape ────────────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
  /** Optional token context injected by the client */
  context?: {
    symbol?: string;
    name?: string;
    price?: number;
    priceChange24h?: number;
    volume24h?: number;
    liquidity?: number;
    marketCap?: number;
    verdict?: string;
    overallScore?: number;
    riskScore?: number;
    opportunityScore?: number;
    momentumScore?: number;
    liquidityScore?: number;
    labels?: string[];
  };
  /** Conversation history for multi-turn */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const SYSTEM_PROMPT = `You are AlphaScope, a professional on-chain token analyst assistant for the Solana ecosystem. You help traders and investors analyze tokens, understand risk, and make informed decisions.

Guidelines:
- Be concise, specific, and data-driven. Reference actual numbers when context is provided.
- Never give financial advice or recommend buying/selling. Frame insights as analysis, not advice.
- Use terms like "signals suggest", "the data shows", "from an analytical perspective".
- If token context is provided, anchor your response to that data.
- Keep replies to 2-4 sentences unless more detail is explicitly requested.
- If asked about something unrelated to crypto/tokens/DeFi, politely redirect.`;

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json() as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, context, history = [] } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  // Sanitize message length
  const sanitizedMessage = message.slice(0, 500);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Rule-based fallback when no API key
    const reply = buildRuleBasedReply(sanitizedMessage, context);
    return NextResponse.json({ reply, source: 'rule-based' });
  }

  // Build context string if token data is present
  let contextBlock = '';
  if (context) {
    const parts: string[] = [];
    if (context.symbol)           parts.push(`Token: ${context.symbol} (${context.name ?? ''})`);
    if (context.price !== undefined) parts.push(`Price: $${context.price}`);
    if (context.priceChange24h !== undefined) parts.push(`24h Change: ${context.priceChange24h > 0 ? '+' : ''}${context.priceChange24h.toFixed(2)}%`);
    if (context.volume24h !== undefined) parts.push(`Volume 24h: $${formatNum(context.volume24h)}`);
    if (context.liquidity !== undefined) parts.push(`Liquidity: $${formatNum(context.liquidity)}`);
    if (context.marketCap !== undefined) parts.push(`Market Cap: $${formatNum(context.marketCap)}`);
    if (context.verdict)          parts.push(`Verdict: ${context.verdict}`);
    if (context.overallScore !== undefined) parts.push(`Overall Score: ${context.overallScore}/100`);
    if (context.riskScore !== undefined) parts.push(`Risk Score: ${context.riskScore}/100`);
    if (context.opportunityScore !== undefined) parts.push(`Opportunity Score: ${context.opportunityScore}/100`);
    if (context.momentumScore !== undefined) parts.push(`Momentum Score: ${context.momentumScore}/100`);
    if (context.liquidityScore !== undefined) parts.push(`Liquidity Score: ${context.liquidityScore}/100`);
    if (context.labels?.length)   parts.push(`Labels: ${context.labels.join(', ')}`);
    if (parts.length > 0) {
      contextBlock = `\n\nCurrent token context:\n${parts.join('\n')}`;
    }
  }

  const fullMessage = contextBlock
    ? `${sanitizedMessage}\n\n[Context provided above — use it to ground your answer]`
    : sanitizedMessage;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT + contextBlock,
    });

    // Build chat history
    const chatHistory = history.slice(-6).map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(fullMessage);
    const reply = result.response.text();

    return NextResponse.json({ reply, source: 'gemini' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI error';
    return NextResponse.json(
      { reply: buildRuleBasedReply(sanitizedMessage, context), source: 'rule-based', warning: message },
    );
  }
}

// ─── Rule-based fallback ──────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

function buildRuleBasedReply(message: string, ctx?: ChatRequest['context']): string {
  const lower = message.toLowerCase();

  if (ctx?.verdict && ctx?.overallScore !== undefined) {
    const { symbol, verdict, overallScore, riskScore, opportunityScore } = ctx;
    const name = symbol ?? 'This token';

    if (lower.includes('buy') || lower.includes('ape') || lower.includes('invest')) {
      return `${name} has a ${verdict} signal with an overall score of ${overallScore}/100. ` +
        `Risk score is ${riskScore ?? 'N/A'} and opportunity score is ${opportunityScore ?? 'N/A'}. ` +
        `From an analytical standpoint, ${verdict === 'BUY' ? 'the data leans positive but always manage position size carefully.' : verdict === 'AVOID' ? 'signals are cautionary — high risk indicators are present.' : 'signals are mixed — a watchful approach is warranted.'}`;
    }

    if (lower.includes('risk')) {
      return `${name}'s risk score is ${riskScore ?? 'N/A'}/100 (higher = safer). ` +
        `The overall verdict is ${verdict} with a composite score of ${overallScore}/100. ` +
        `Key risk factors would include liquidity depth, holder concentration, and token authority flags.`;
    }

    return `${name} is currently scored at ${overallScore}/100 with a ${verdict} verdict. ` +
      `Opportunity: ${opportunityScore ?? 'N/A'}, Risk: ${riskScore ?? 'N/A'}. ` +
      `Ask me anything specific about this token's liquidity, momentum, or security profile.`;
  }

  if (lower.includes('what') && lower.includes('alphascope')) {
    return 'AlphaScope is a real-time on-chain analytics platform for Solana tokens. It scores every token across 5 dimensions: Risk, Opportunity, Momentum, Liquidity, and Security — then generates a BUY / WATCH / AVOID verdict.';
  }

  if (lower.includes('score') || lower.includes('how') && lower.includes('work')) {
    return 'AlphaScope scores tokens 0–100 across 5 dimensions: Risk (safety), Opportunity (upside potential), Momentum (price/volume trend), Liquidity (pool depth), and Security (on-chain flags). The composite Overall score weights Risk at 30%, Opportunity 25%, Momentum 20%, Liquidity 15%, Security 10%.';
  }

  return 'I'm AlphaScope AI. Open any token detail page and I can analyze its scores, signals, liquidity, and risk profile in real time. What would you like to know?';
}
