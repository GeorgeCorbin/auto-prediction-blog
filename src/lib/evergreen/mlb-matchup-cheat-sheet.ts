/**
 * MLB Matchup Cheat Sheet — weekly series-level preview
 * Covers the top 5 most compelling series of the week with
 * betting angles, team stats, and key players.
 */

import {
  fetchAllMlbStandings,
  fetchMlbLeagueLeaders,
  fetchMlbTeamStats,
  type MlbDivisionStandings,
  type MlbLeagueLeaders,
  type MlbStandingsEntry,
  type MlbTeamStats,
} from '@/lib/mlb-statsapi/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheatSheetMatchup {
  homeTeam: { id: number; name: string; wins: number; losses: number; winPct: string; streak: string; last10: string; ops: string | null; era: string | null; whip: string | null };
  awayTeam: { id: number; name: string; wins: number; losses: number; winPct: string; streak: string; last10: string; ops: string | null; era: string | null; whip: string | null };
  divisionRival: boolean;
  series: string;
}

export interface MlbMatchupCheatSheetContext {
  season: number;
  weekNumber: number;
  generatedAt: Date;
  matchups: CheatSheetMatchup[];
  leagueLeaders: MlbLeagueLeaders;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEntry(
  entry: MlbStandingsEntry,
  stats: MlbTeamStats | null,
): CheatSheetMatchup['homeTeam'] {
  return {
    id: entry.teamId,
    name: entry.teamName,
    wins: entry.wins,
    losses: entry.losses,
    winPct: entry.winPct,
    streak: entry.streak,
    last10: entry.last10,
    ops: stats?.ops ?? null,
    era: stats?.era ?? null,
    whip: stats?.whip ?? null,
  };
}

/** Score how "compelling" a matchup is for the cheat sheet (higher = more interesting) */
function matchupScore(a: MlbStandingsEntry, b: MlbStandingsEntry): number {
  let score = 0;
  const wp = (e: MlbStandingsEntry) => parseFloat(e.winPct) || 0;
  // Both teams near .500 or above — competitive
  score += (wp(a) + wp(b)) * 50;
  // Close W-L records
  score -= Math.abs(a.wins - b.wins) * 2;
  // Recent form excitement (one hot, one cold)
  const last10Wins = (e: MlbStandingsEntry) => parseInt(e.last10?.split('-')[0] ?? '5', 10);
  score += Math.abs(last10Wins(a) - last10Wins(b)) * 3;
  return score;
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

export async function buildMlbMatchupCheatSheetContext(
  season: number,
): Promise<MlbMatchupCheatSheetContext> {
  const [divisions, leagueLeaders] = await Promise.all([
    fetchAllMlbStandings(season),
    fetchMlbLeagueLeaders(season, 5),
  ]);

  const allTeams: Array<{ entry: MlbStandingsEntry; div: MlbDivisionStandings }> = divisions.flatMap(
    (div) => div.teams.map((entry) => ({ entry, div })),
  );

  // Fetch all team stats
  const statsMap = new Map<number, MlbTeamStats | null>();
  await Promise.all(
    allTeams.map(async ({ entry }) => {
      statsMap.set(entry.teamId, await fetchMlbTeamStats(entry.teamId, season));
    }),
  );

  // Build a diverse set of 5 compelling matchups
  // Strategy: pair division leaders vs their closest rivals + 1-2 wild-card battles
  const pairs: Array<[MlbStandingsEntry, MlbStandingsEntry, boolean]> = [];

  for (const div of divisions) {
    if (div.teams.length >= 2) {
      const [first, second] = div.teams;
      pairs.push([first, second, true]);
    }
  }

  // Sort by matchup score and take top 5
  pairs.sort((a, b) => matchupScore(b[0], b[1]) - matchupScore(a[0], a[1]));
  const top5 = pairs.slice(0, 5);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );

  const matchups: CheatSheetMatchup[] = top5.map(([away, home, divRival]) => ({
    homeTeam: toEntry(home, statsMap.get(home.teamId) ?? null),
    awayTeam: toEntry(away, statsMap.get(away.teamId) ?? null),
    divisionRival: divRival,
    series: `${away.teamName} @ ${home.teamName}`,
  }));

  return { season, weekNumber, generatedAt: now, matchups, leagueLeaders };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function matchupBlock(m: CheatSheetMatchup): string {
  const a = m.awayTeam;
  const h = m.homeTeam;
  return `${a.name} (${a.wins}-${a.losses}, ${a.winPct}) @ ${h.name} (${h.wins}-${h.losses}, ${h.winPct})
  Away — Last 10: ${a.last10} | Streak: ${a.streak} | OPS: ${a.ops ?? '—'} | ERA: ${a.era ?? '—'} | WHIP: ${a.whip ?? '—'}
  Home — Last 10: ${h.last10} | Streak: ${h.streak} | OPS: ${h.ops ?? '—'} | ERA: ${h.era ?? '—'} | WHIP: ${h.whip ?? '—'}${m.divisionRival ? ' | [DIVISION RIVAL]' : ''}`;
}

function leaderLine(
  leaders: Array<{ rank: number; name: string; team: string; value: string }>,
  limit = 3,
): string {
  return leaders.slice(0, limit).map((l) => `${l.name} (${l.team}): ${l.value}`).join(', ');
}

export function buildMatchupCheatSheetPrompt(ctx: MlbMatchupCheatSheetContext): string {
  const system = `You are a sharp MLB betting analyst writing a weekly matchup cheat sheet for a sports prediction blog. Your style is punchy, opinionated, and data-driven — like The Action Network or FantasyLabs. Write as a trusted expert giving readers an edge.

CRITICAL: Do NOT invent any statistic not found in the DATA BLOCK. If a stat is missing, use directional language ("strong rotation", "struggling offense").`;

  const user = `Write a 600–800 word MLB Matchup Cheat Sheet for Week ${ctx.weekNumber} of the ${ctx.season} season. Output ONLY the article text.

FORMAT:
- Line 1: Article title like "MLB Matchup Cheat Sheet: Week ${ctx.weekNumber} Series Previews, Betting Angles & Picks"
  No markdown (#) on the title line.
- Line 2: Empty
- Line 3+: Article body

MARKDOWN FORMATTING RULES:
- Use ## for the league snapshot heading and ## for each matchup heading (e.g., "## Yankees vs Red Sox")
- Use ### for "Best Bet of the Week"
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold team names with **Team Name** on first mention
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. One-paragraph league snapshot (2–3 sentences on current trends)
2. For each of the 5 matchups: ## heading with team names, then 3–4 sentences with specific stats — identify the key betting angle (fade the favorite, back the hot team, target the over/under based on ERA/OPS)
3. ### Best Bet of the Week — paragraph naming one series to prioritize

━━━ DATA BLOCK ━━━

WEEK ${ctx.weekNumber} MATCHUPS:
${ctx.matchups.map(matchupBlock).join('\n\n')}

LEAGUE LEADERS:
HR: ${leaderLine(ctx.leagueLeaders.homeRuns)}
ERA: ${leaderLine(ctx.leagueLeaders.era)}
OPS: ${leaderLine(ctx.leagueLeaders.ops)}

━━━ END DATA BLOCK ━━━

Write now. Every stat must match the DATA BLOCK exactly.`;

  return `${system}\n\n${user}`;
}

export function buildMatchupCheatSheetMetaDescription(ctx: MlbMatchupCheatSheetContext): string {
  const teams = ctx.matchups.slice(0, 2).map((m) => `${m.awayTeam.name} vs ${m.homeTeam.name}`).join(', ');
  return `MLB Week ${ctx.weekNumber} matchup cheat sheet: ${teams} and more. Series previews, betting angles, and top picks for the week.`.slice(0, 160);
}

export function buildMatchupCheatSheetSlug(season: number, weekNumber: number): string {
  return `mlb-matchup-cheat-sheet-week-${weekNumber}-${season}`;
}
