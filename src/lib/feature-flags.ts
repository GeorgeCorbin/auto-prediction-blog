import type { AiPresetName } from '@/lib/ai/config';
import type { PickOptions } from '@/lib/sports/types';

/**
 * All app settings live here. Restart scan/generate/scheduler after changes.
 * API keys belong in .env — everything else belongs here.
 */

// ─── AI Model ─────────────────────────────────────────────────────────────────
//
//  'production'  OpenAI GPT-4o          → needs OPENAI_API_KEY in .env
//  'claude'      Anthropic Claude Haiku 4.5 → needs ANTHROPIC_API_KEY in .env
//  'local'       Ollama on your machine  → no API key needed, run: ollama serve
//
export const aiModel: AiPresetName = 'local';

// ─── Picks ────────────────────────────────────────────────────────────────────
//
//  statsPickWithoutOdds controls whether article generation may proceed without
//  usable betting odds:
//
//  false  Odds required — resolvePick returns null when no odds; game stays READY
//  true   Stats fallback — pick a winner from records, form, and pitching data
//
//  When odds ARE present, odds-based value logic always runs regardless of this flag.
//  Prompts receive hasOdds from the pick result so articles skip betting-line copy
//  when only stats were used.
//
export const statsPickWithoutOdds = false;

// ─── Publishing hours (Eastern) ───────────────────────────────────────────────
//
//  Articles are only generated between start (inclusive) and end (exclusive).
//  Default: 6:00 AM through 10:59 PM America/New_York (hour >= 6 && hour < 23).
//
export const publishHoursEt = { start: 6, end: 23 };

// ─────────────────────────────────────────────────────────────────────────────

export function isStatsPickWithoutOddsEnabled(): boolean {
  return statsPickWithoutOdds;
}

export function getPickOptions(): PickOptions {
  return { allowStatsFallback: statsPickWithoutOdds };
}
