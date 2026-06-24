/**
 * Sport-agnostic ESPN ↔ Odds API team name matching.
 *
 * Add new alias groups to TEAM_ALIAS_GROUPS when a sport uses different
 * names across providers (common for international soccer).
 */

/** Equivalent names for the same team — first entry is the canonical form. */
export const TEAM_ALIAS_GROUPS: readonly string[][] = [
  ['united states', 'usa', 'us'],
  ['turkey', 'turkiye', 'türkiye'],
  ['czech republic', 'czechia'],
  ['bosnia and herzegovina', 'bosnia herzegovina', 'bosnia & herzegovina'],
  ['ivory coast', "cote d'ivoire", 'côte d\'ivoire', 'cote divoire'],
  ['dr congo', 'congo dr', 'democratic republic of the congo', 'congo kinshasa'],
  ['republic of ireland', 'ireland'],
  ['south korea', 'korea republic', 'republic of korea'],
  ['north korea', 'korea dpr', 'korea democratic peoples republic'],
  ['cape verde', 'cabo verde'],
  ['curacao', 'curaçao'],
  ['iran', 'ir iran'],
  ['netherlands', 'holland'],
  ['macedonia', 'north macedonia'],
];

/** Strip accents and punctuation; split hyphens/slashes into word boundaries. */
export function normalizeTeamName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Meaningful word tokens (length > 1). */
export function teamTokens(name: string): string[] {
  return normalizeTeamName(name)
    .split(' ')
    .filter((w) => w.length > 1);
}

function aliasCanonical(name: string): string | null {
  const base = normalizeTeamName(name);
  for (const group of TEAM_ALIAS_GROUPS) {
    const normalized = group.map(normalizeTeamName);
    if (normalized.includes(base)) {
      return normalized[0];
    }
  }
  return null;
}

/**
 * True when every token of the shorter name appears in the longer name.
 * Handles "Red Sox" ↔ "Boston Red Sox" but not "South Korea" ↔ "South Africa".
 */
export function tokenSubsetMatch(a: string, b: string): boolean {
  const ta = teamTokens(a);
  const tb = teamTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const longerSet = new Set(longer);
  return shorter.every((t) => longerSet.has(t));
}

/**
 * Match strength in [0, 1]: share of the shorter name's tokens found in the other.
 * A score of 1 means the shorter name is fully contained in the longer.
 */
export function teamMatchScore(a: string, b: string): number {
  const ca = aliasCanonical(a);
  const cb = aliasCanonical(b);
  if (ca && cb && ca === cb) return 1;
  if (normalizeTeamName(a) === normalizeTeamName(b)) return 1;

  const ta = teamTokens(a);
  const tb = teamTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const tbSet = new Set(tb);
  const taSet = new Set(ta);
  const intersection =
    ta.length <= tb.length
      ? ta.filter((t) => tbSet.has(t)).length
      : tb.filter((t) => taSet.has(t)).length;
  const shorterLen = Math.min(ta.length, tb.length);
  return intersection / shorterLen;
}

/** Whether two team labels refer to the same side (game-level or outcome-level). */
export function teamsMatch(a: string, b: string): boolean {
  const ca = aliasCanonical(a);
  const cb = aliasCanonical(b);
  if (ca && cb && ca === cb) return true;
  if (normalizeTeamName(a) === normalizeTeamName(b)) return true;
  return tokenSubsetMatch(a, b);
}

/**
 * Assign a bookmaker outcome label to home or away.
 * Requires a perfect subset match (score 1) and a clear winner over the other side.
 */
export function assignOutcomeTeam(
  outcomeName: string,
  homeTeam: string,
  awayTeam: string,
): 'home' | 'away' | null {
  const homeScore = teamMatchScore(outcomeName, homeTeam);
  const awayScore = teamMatchScore(outcomeName, awayTeam);

  if (homeScore >= 1 && homeScore > awayScore) return 'home';
  if (awayScore >= 1 && awayScore > homeScore) return 'away';
  return null;
}

/** True when both team pairs match (home/away may be swapped). */
export function teamsMatchGame(
  oddsHome: string,
  oddsAway: string,
  espnHome: string,
  espnAway: string,
): boolean {
  return (
    (teamsMatch(oddsHome, espnHome) && teamsMatch(oddsAway, espnAway)) ||
    (teamsMatch(oddsHome, espnAway) && teamsMatch(oddsAway, espnHome))
  );
}

/** Whether the odds API home side aligns with ESPN's home team (not swapped). */
export function oddsHomeMatchesEspnHome(oddsHome: string, espnHome: string): boolean {
  return teamsMatch(oddsHome, espnHome);
}
