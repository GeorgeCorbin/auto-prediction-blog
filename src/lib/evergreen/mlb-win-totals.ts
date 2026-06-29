import {
  fetchMlbStandingsForTeam,
  type MlbStandingsEntry,
} from '@/lib/mlb-statsapi/client';
import winTotalsConfig from './mlb-win-totals-config.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WinTotalEntry {
  teamId: number;
  teamName: string;
  abbr: string;
  preseasonTotal: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  projectedWins: number;
  pace: 'over' | 'under' | 'push';
  paceAmount: number;       // how many wins over/under the line at current pace
  last10: string;
  streak: string;
  gamesBack: string;
  wildCardBack: string;
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

const SEASON_GAMES = 162;

function projectWins(wins: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((wins / gamesPlayed) * SEASON_GAMES);
}

function paceVsTotal(
  projectedWins: number,
  preseasonTotal: number,
): { pace: 'over' | 'under' | 'push'; paceAmount: number } {
  const diff = projectedWins - preseasonTotal;
  if (Math.abs(diff) < 0.5) return { pace: 'push', paceAmount: 0 };
  return { pace: diff > 0 ? 'over' : 'under', paceAmount: Math.abs(Math.round(diff)) };
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

export interface MlbWinTotalsContext {
  season: number;
  generatedAt: Date;
  entries: WinTotalEntry[];
  topOverPace: WinTotalEntry[];
  topUnderPace: WinTotalEntry[];
}

export async function buildMlbWinTotalsContext(
  season: number,
): Promise<MlbWinTotalsContext> {
  const config = winTotalsConfig as {
    season: number;
    teams: Array<{ teamId: number; teamName: string; abbr: string; preseasonTotal: number }>;
  };

  const standingsResults = await Promise.all(
    config.teams.map((t) => fetchMlbStandingsForTeam(t.teamId, season)),
  );

  const entries: WinTotalEntry[] = config.teams.map((t, i) => {
    const s: MlbStandingsEntry | null = standingsResults[i];
    const wins = s?.wins ?? 0;
    const losses = s?.losses ?? 0;
    const gamesPlayed = wins + losses;
    const projected = projectWins(wins, gamesPlayed);
    const { pace, paceAmount } = paceVsTotal(projected, t.preseasonTotal);

    return {
      teamId: t.teamId,
      teamName: t.teamName,
      abbr: t.abbr,
      preseasonTotal: t.preseasonTotal,
      wins,
      losses,
      gamesPlayed,
      projectedWins: projected,
      pace,
      paceAmount,
      last10: s?.last10 ?? '—',
      streak: s?.streak ?? '—',
      gamesBack: s?.gamesBack ?? '-',
      wildCardBack: s?.wildCardBack ?? '-',
    };
  });

  const topOverPace = [...entries]
    .filter((e) => e.pace === 'over')
    .sort((a, b) => b.paceAmount - a.paceAmount)
    .slice(0, 5);

  const topUnderPace = [...entries]
    .filter((e) => e.pace === 'under')
    .sort((a, b) => b.paceAmount - a.paceAmount)
    .slice(0, 5);

  return {
    season,
    generatedAt: new Date(),
    entries,
    topOverPace,
    topUnderPace,
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function entryLine(e: WinTotalEntry): string {
  const paceStr =
    e.pace === 'push'
      ? 'on pace (push)'
      : `${e.paceAmount}W ${e.pace.toUpperCase()}`;
  return `${e.teamName}: ${e.wins}-${e.losses} (${e.gamesPlayed} GP) | O/U: ${e.preseasonTotal} | Projected: ${e.projectedWins}W | ${paceStr} | Last 10: ${e.last10} | Streak: ${e.streak}`;
}

export function buildWinTotalsPrompt(ctx: MlbWinTotalsContext): string {
  const systemPrompt = `You are a professional MLB analyst writing a win-total tracker article for a sports betting blog. Your style is authoritative, analytical, and engaging. Write in the third person.

CRITICAL RULE — NO STAT HALLUCINATION:
Cite ONLY numbers provided in the DATA BLOCK below. Do not invent projected win totals, pace figures, or records.

ANTI-REPETITION:
- Start with a sharp, specific take about which teams are most surprising relative to expectations.
- Do NOT use filler openers like "As the season progresses..."`;

  const month = ctx.generatedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const userPrompt = `Write a 650–850 word MLB Win-Total Tracker article for ${month} of the ${ctx.season} season. Output ONLY the article text.

FORMAT:
- Line 1: Title — "MLB Win Total Tracker (${month}): Who's On Pace to Cash Their Over/Under?"
  Do NOT add any markdown (#) to the title line.
- Line 2: Empty line
- Line 3 onward: Article body

MARKDOWN FORMATTING RULES:
- Use ## for major section headings (e.g., "## Biggest Over-Paced Teams", "## Under-Paced Teams", "## Betting Implications")
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold team names with **Team Name** on first mention in each section
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. Opening paragraph: headline take on the biggest over/under surprises so far this season
2. ## Biggest Over-Paced Teams (2–3 paragraphs): analyze each team in the TOP OVER PACE list — cite W-L, projected wins, preseason total, and last-10 record
3. ## Biggest Under-Paced Teams (2–3 paragraphs): analyze each team in the TOP UNDER PACE list with the same depth
4. ## Middle of the Pack: 1 paragraph on 2–3 teams hovering right at their total — what needs to change
5. ## Betting Implications: closing paragraph — which over/unders look most bettable now given the data

━━━ DATA BLOCK — cite ONLY these numbers ━━━

TOP OVER PACE (projected to exceed their preseason win total):
${ctx.topOverPace.map(entryLine).join('\n')}

TOP UNDER PACE (projected to fall short of their preseason win total):
${ctx.topUnderPace.map(entryLine).join('\n')}

ALL TEAMS (for reference — Team: W-L | O/U Line | Projected Wins | Pace | Last 10 | Streak):
${ctx.entries.map(entryLine).join('\n')}

━━━ END DATA BLOCK ━━━

Write the article now. Every number you cite must match the DATA BLOCK exactly.`;

  return `${systemPrompt}\n\n${userPrompt}`;
}

export function buildWinTotalsMetaDescription(ctx: MlbWinTotalsContext): string {
  const month = ctx.generatedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const topOver = ctx.topOverPace[0]?.teamName ?? '';
  const topUnder = ctx.topUnderPace[0]?.teamName ?? '';
  const desc = `MLB win total tracker for ${month}: ${topOver} is on pace for the biggest over while ${topUnder} trails their projection. Full 30-team analysis.`;
  return desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
}

export function buildWinTotalsSlug(season: number, generatedAt: Date): string {
  const month = generatedAt.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const year = generatedAt.getFullYear();
  const day = generatedAt.getDate();
  return `mlb-win-total-tracker-${month}-${day}-${year}`;
}
