/**
 * MLB Award Races — bi-weekly May–Oct
 * Covers MVP, Cy Young, Rookie of the Year, and Manager of the Year races.
 */

import {
  fetchMlbLeagueLeaders,
  type MlbLeagueLeaders,
} from '@/lib/mlb-statsapi/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MlbAwardRacesContext {
  season: number;
  generatedAt: Date;
  periodLabel: string;
  leagueLeaders: MlbLeagueLeaders;
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

export async function buildMlbAwardRacesContext(season: number): Promise<MlbAwardRacesContext> {
  const leagueLeaders = await fetchMlbLeagueLeaders(season, 10);
  const now = new Date();
  const periodLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return { season, generatedAt: now, periodLabel, leagueLeaders };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function leaderBlock(
  leaders: Array<{ rank: number; name: string; team: string; value: string }>,
  limit = 7,
): string {
  return leaders
    .slice(0, limit)
    .map((l) => `${l.rank}. ${l.name} (${l.team}): ${l.value}`)
    .join('\n');
}

export function buildAwardRacesPrompt(ctx: MlbAwardRacesContext): string {
  const system = `You are a veteran MLB award tracker writing a bi-weekly award races column for a sports prediction blog. Your style is analytical and opinionated — like Jayson Stark or ESPN's award tracker. You make bold takes on frontrunners and darkhorse candidates.

CRITICAL: Do NOT invent any statistic not in the DATA BLOCK. If a relevant stat is missing, use general language ("excellent contact rate", "lockdown closer").`;

  const ll = ctx.leagueLeaders;

  const user = `Write a 650–850 word MLB Award Races column as of ${ctx.periodLabel} in the ${ctx.season} season. Output ONLY the article text.

FORMAT:
- Line 1: Title like "MLB Award Races Update: MVP, Cy Young, and Rookie of the Year Frontrunners"
  No markdown (#).
- Line 2: Empty
- Line 3+: Body

MARKDOWN FORMATTING RULES:
- Use ## for major section headings (e.g., "## AL MVP Race", "## NL Cy Young Race", "## Rookie of the Year Watch")
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold player names with **Player Name** on first mention in each section
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. Opening paragraph: brief state of the season and why these award races matter right now
2. ## AL MVP Race: 2–3 paragraphs on the frontrunner and challenger — use HR, RBI, OPS from DATA BLOCK. Name the candidate, their team, and their case.
3. ## NL MVP Race: same treatment
4. ## AL Cy Young Race: focus on ERA, strikeouts, wins from DATA BLOCK leaders
5. ## NL Cy Young Race: same
6. ## Rookie of the Year Watch: highlight 1–2 names from the stats leaders if first-year players can be inferred, or note which teams have standout rookies based on performance context
7. Closing: one bold prediction per award — who wins if the season ended today

━━━ DATA BLOCK — only cite these statistics ━━━

BATTING AVERAGE (top 7):
${leaderBlock(ll.battingAvg)}

HOME RUNS (top 7):
${leaderBlock(ll.homeRuns)}

RBI (top 7):
${leaderBlock(ll.rbi)}

OPS (top 7):
${leaderBlock(ll.ops)}

ERA (top 7):
${leaderBlock(ll.era)}

STRIKEOUTS (top 7):
${leaderBlock(ll.strikeouts)}

WINS (top 7):
${leaderBlock(ll.wins)}

WHIP (top 7):
${leaderBlock(ll.whip)}

━━━ END DATA BLOCK ━━━

Write now. Every stat must match the DATA BLOCK exactly. Do not split AL/NL by guessing — use player names from the data.`;

  return `${system}\n\n${user}`;
}

export function buildAwardRacesMetaDescription(ctx: MlbAwardRacesContext): string {
  const mvpLeader = ctx.leagueLeaders.ops[0]?.name ?? 'MLB';
  const cyLeader = ctx.leagueLeaders.era[0]?.name ?? 'pitching';
  return `MLB award races update for ${ctx.periodLabel}: ${mvpLeader} leads MVP conversation, ${cyLeader} atop Cy Young. Full breakdown of every major award race.`.slice(0, 160);
}

export function buildAwardRacesSlug(season: number, now: Date): string {
  const month = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const half = now.getDate() <= 15 ? 'early' : 'late';
  return `mlb-award-races-${month}-${half}-${season}`;
}
