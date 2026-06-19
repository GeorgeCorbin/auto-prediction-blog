import type { AiPresetName } from '@/lib/ai/config';

/**
 * All app settings live here. Restart scan/generate/scheduler after changes.
 * API keys belong in .env — everything else belongs here.
 */

// ─── AI Model ─────────────────────────────────────────────────────────────────
//
//  'production'  OpenAI GPT-4o          → needs OPENAI_API_KEY in .env
//  'claude'      Anthropic Claude Sonnet → needs ANTHROPIC_API_KEY in .env
//  'local'       Ollama on your machine  → no API key needed, run: ollama serve
//
export const aiModel: AiPresetName = 'local';

// ─── Picks ────────────────────────────────────────────────────────────────────
//
//  false  Odds required — games without odds are skipped (default)
//  true   Generate without odds, picking a winner from stats and pitching
//
export const statsPickWithoutOdds = true;

// ─────────────────────────────────────────────────────────────────────────────

export function isStatsPickWithoutOddsEnabled(): boolean {
  return statsPickWithoutOdds;
}
