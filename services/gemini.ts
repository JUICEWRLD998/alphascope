/**
 * services/gemini.ts — compatibility adapter
 *
 * The canonical insight engine lives in lib/insights.ts.
 * This file re-exports the public API in the original shape so that
 * any existing callers continue to work without changes.
 */

import type { BirdeyeToken, BirdeyeTokenSecurity, TokenScore } from '@/lib/types';
import { buildInsightInput, generateInsight } from '@/lib/insights';

// ─── Preserved public interface (backwards compatible) ───────────────────────

export interface GeminiInsightInput {
  token:    BirdeyeToken;
  security: BirdeyeTokenSecurity | null;
  score:    TokenScore;
}

/**
 * @deprecated Prefer importing generateInsight + buildInsightInput from '@/lib/insights'.
 *
 * Retained for backwards compatibility — delegates to lib/insights.ts.
 */
export async function generateTokenInsight(
  raw: GeminiInsightInput,
): Promise<string> {
  const input  = buildInsightInput(raw.token, raw.security, raw.score);
  const result = await generateInsight(input);
  return result.text;
}
