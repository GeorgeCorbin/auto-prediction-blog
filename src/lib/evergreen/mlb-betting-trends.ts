/**
 * MLB Betting Trends Report — bi-weekly situational betting angles
 * Covers ATS trends, over/under trends, division game trends, and hot/cold teams.
 */

import {
  fetchAllMlbStandings,
  fetchMlbLeagueLeaders,
  fetchMlbTeamStats,
  type MlbLeagueLeaders,
  type MlbStandingsEntry,
  type MlbTeamStats,
} from '@/lib/mlb-statsapi/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BettingTrendEntry {
  teamId: number;
  teamName: string;
  wins: number;
  losses: number;
  winPct: string;
  last10: string;
  streak: string;
  ops: string | null;
  era: string | null;
  runsPerGame: string | null;
}

export interface MlbBettingTrendsContext {
  season: number;
  generatedAt: Date;
  periodLabel: string;
  hotTeams: BettingTrendEntry[];    // top 5 by last-10 wins
  coldTeams: BettingTrendEntry[];   // bottom 5 by last-10 wins
  highScoringTeams: BettingTrendEntry[]; // top 5 by OPS/RPG
  lowScoringTeams: BettingTrendEntry[];  // bottom 5 by OPS
  allTeams: BettingTrendEntry[];
  leagueLeaders: MlbLeagueLeaders;
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

function entryFromRaw(entry: MlbStandingsEntry, stats: MlbTeamStats | null): BettingTrendEntry {
  return {
    teamId: entry.teamId,
    teamName: entry.teamName,
    wins: entry.wins,
    losses: entry.losses,
    winPct: entry.winPct,
    last10: entry.last10,
    streak: entry.streak,
    ops: stats?.ops ?? null,
    era: stats?.era ?? null,
    runsPerGame: stats?.runsPerGame ?? null,
  };
}

function last10Wins(e: BettingTrendEntry): number {
  return parseInt(e.last10?.split('-')[0] ?? '5', 10);
}

export async function buildMlbBettingTrendsContext(season: number): Promise<MlbBettingTrendsContext> {
  const [divisions, leagueLeaders] = await Promise.all([
    fetchAllMlbStandings(season),
    fetchMlbLeagueLeaders(season, 5),
  ]);

  const allRaw = divisions.flatMap((d) => d.teams);
  const statsResults = await Promise.all(allRaw.map((e) => fetchMlbTeamStats(e.teamId, season)));

  const allTeams: BettingTrendEntry[] = allRaw.map((e, i) =>
    entryFromRaw(e, statsResults[i] ?? null),
  );

  const now = new Date();
  const periodLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const byLast10 = [...allTeams].sort((a, b) => last10Wins(b) - last10Wins(a));
  const byOps = [...allTeams]
    .filter((t) => t.ops != null)
    .sort((a, b) => parseFloat(b.ops!) - parseFloat(a.ops!));

  return {
    season,
    generatedAt: now,
    periodLabel,
    hotTeams: byLast10.slice(0, 5),
    coldTeams: byLast10.slice(-5).reverse(),
    highScoringTeams: byOps.slice(0, 5),
    lowScoringTeams: byOps.slice(-5).reverse(),
    allTeams,
    leagueLeaders,
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function trendRow(e: BettingTrendEntry): string {
  return `${e.teamName} (${e.wins}-${e.losses}) | Last 10: ${e.last10} | Streak: ${e.streak} | OPS: ${e.ops ?? '—'} | ERA: ${e.era ?? '—'} | R/G: ${e.runsPerGame ?? '—'}`;
}

function leaderLine(
  leaders: Array<{ rank: number; name: string; team: string; value: string }>,
  limit = 3,
): string {
  return leaders.slice(0, limit).map((l) => `${l.name} (${l.team}): ${l.value}`).join(', ');
}

export function buildBettingTrendsPrompt(ctx: MlbBettingTrendsContext): string {
  const system = `You are a sharp MLB betting analyst writing a bi-weekly situational betting trends report for a sports prediction blog. Your style is direct, analytical, and gives readers a clear edge — like The Ringer's betting column or Covers.com. Think in terms of situational trends, not just records.

CRITICAL: Do NOT invent any statistic not found in the DATA BLOCK.`;

  const user = `Write a 650–850 word MLB Betting Trends Report for the period ending ${ctx.periodLabel}. Output ONLY the article text.

FORMAT:
- Line 1: Title like "MLB Betting Trends Report: Fading the Cold Teams and Backing the Overs"
  No markdown (#).
- Line 2: Empty
- Line 3+: Body

MARKDOWN FORMATTING RULES:
- Use ## for major section headings (e.g., "## Back the Hot Teams", "## Fade These Teams", "## Totals Angle")
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold team names with **Team Name** on first mention in each section
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. Opening take: 1–2 sentences on the biggest overarching betting trend right now in MLB
2. ## Back the Hot Teams: cover the top 3 hottest teams by last-10 record — cite specific stats, note if they're home/away split worthy of attention. Use - bullet format for each team.
3. ## Fade These Teams: cover the 3 coldest teams — why they're dangerous to back even as favorites. Use - bullet format.
4. ## Totals Angle: identify 2 high-scoring (high OPS) teams where overs may have value, and 2 low-scoring teams where unders are in play — cite OPS and ERA. Use - bullet format.
5. ## Situational Spot: one specific situational angle (e.g., teams on winning streaks of 4+ on the road, division underdogs)
6. Closing with the top 2 team-level betting recommendations for the next two weeks

━━━ DATA BLOCK ━━━

HOT TEAMS (last 10):
${ctx.hotTeams.map(trendRow).join('\n')}

COLD TEAMS (last 10):
${ctx.coldTeams.map(trendRow).join('\n')}

HIGH-SCORING OFFENSES (OPS):
${ctx.highScoringTeams.map(trendRow).join('\n')}

LOW-SCORING OFFENSES (OPS):
${ctx.lowScoringTeams.map(trendRow).join('\n')}

LEAGUE LEADERS:
HR: ${leaderLine(ctx.leagueLeaders.homeRuns)}
ERA: ${leaderLine(ctx.leagueLeaders.era)}
OPS: ${leaderLine(ctx.leagueLeaders.ops)}
WHIP: ${leaderLine(ctx.leagueLeaders.whip)}

━━━ END DATA BLOCK ━━━

Write now. Every stat must match the DATA BLOCK exactly.`;

  return `${system}\n\n${user}`;
}

export function buildBettingTrendsMetaDescription(ctx: MlbBettingTrendsContext): string {
  const hot = ctx.hotTeams[0]?.teamName ?? 'MLB';
  return `MLB betting trends for ${ctx.periodLabel}: ${hot} leads our hot teams. Situational angles, totals picks, and ATS trends for the next two weeks.`.slice(0, 160);
}

export function buildBettingTrendsSlug(season: number, now: Date): string {
  const month = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const half = now.getDate() <= 15 ? 'early' : 'late';
  return `mlb-betting-trends-${month}-${half}-${season}`;
}
