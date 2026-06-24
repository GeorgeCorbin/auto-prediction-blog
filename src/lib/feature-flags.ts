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
//  statsPickWithoutOdds toggles the entire odds pipeline:
//
//  false  Odds required — fetch from The Odds API at publish time; value picks from
//         lines; games without odds stay READY until lines appear or kickoff passes
//  true   Stats only — no Odds API calls; picks from records, form, and pitching data
//
export const statsPickWithoutOdds = true;

// ─── Publishing hours (Eastern) ───────────────────────────────────────────────
//
//  Articles are only generated between start (inclusive) and end (exclusive).
//  Default: 6:00 AM through 10:59 PM America/New_York (hour >= 6 && hour < 23).
//
export const publishHoursEt = { start: 6, end: 23 };

// ─── MLB article timing ───────────────────────────────────────────────────────
//
//  Articles may publish up to mlbArticleLeadHours before first pitch when starters
//  are set. If a team played earlier, publishing waits until that game’s start plus
//  mlbPriorGamePublishBufferHours (e.g. Tue 3pm game → Wed preview at 6pm).
//
export const mlbArticleLeadHours = 24;
export const mlbPriorGamePublishBufferHours = 3;

// ─── Odds API cadence ─────────────────────────────────────────────────────────
//
//  The Odds API has no multi-sport odds endpoint — each sport needs its own
//  request (e.g. baseball_mlb, soccer_fifa_world_cup). Within a sport, one
//  request returns every listed game. scan-games runs hourly for ESPN; odds
//  API calls are throttled to this interval. Manual `npm run refresh-odds`
//  bypasses the throttle.
//
export const oddsRefreshIntervalMinutes = 240;

// ─────────────────────────────────────────────────────────────────────────────

export function getOddsRefreshIntervalMs(): number {
  return oddsRefreshIntervalMinutes * 60 * 1000;
}

export function isStatsPickWithoutOddsEnabled(): boolean {
  return statsPickWithoutOdds;
}

/** False when statsPickWithoutOdds is on — blocks all Odds API fetch/persist paths. */
export function isOddsApiEnabled(): boolean {
  return !statsPickWithoutOdds;
}

export function getPickOptions(): PickOptions {
  return { allowStatsFallback: statsPickWithoutOdds };
}
