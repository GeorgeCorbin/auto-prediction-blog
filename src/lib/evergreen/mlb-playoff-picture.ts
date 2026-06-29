/**
 * MLB Playoff Picture & Bubble Watch — weekly Aug–Oct
 * Covers division leaders, wild card standings, bubble teams, and elimination scenarios.
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

export interface PlayoffEntry {
  teamId: number;
  teamName: string;
  wins: number;
  losses: number;
  winPct: string;
  gamesBack: string;
  wildCardBack: string;
  last10: string;
  streak: string;
  divisionName: string;
  leagueName: string;
  ops: string | null;
  era: string | null;
  clinched: boolean;
  eliminated: boolean;
}

export interface MlbPlayoffPictureContext {
  season: number;
  weekNumber: number;
  generatedAt: Date;
  alDivisionLeaders: PlayoffEntry[];
  nlDivisionLeaders: PlayoffEntry[];
  alWildCard: PlayoffEntry[];     // next 3 non-division-leaders in AL
  nlWildCard: PlayoffEntry[];     // next 3 non-division-leaders in NL
  bubbleTeams: PlayoffEntry[];    // teams within 5 GB of a wild card spot
  leagueLeaders: MlbLeagueLeaders;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPlayoffEntry(
  entry: MlbStandingsEntry,
  div: MlbDivisionStandings,
  stats: MlbTeamStats | null,
): PlayoffEntry {
  const gb = parseFloat(entry.gamesBack) || 0;
  const wcb = parseFloat(entry.wildCardBack) || 0;
  return {
    teamId: entry.teamId,
    teamName: entry.teamName,
    wins: entry.wins,
    losses: entry.losses,
    winPct: entry.winPct,
    gamesBack: entry.gamesBack,
    wildCardBack: entry.wildCardBack,
    last10: entry.last10,
    streak: entry.streak,
    divisionName: div.divisionName,
    leagueName: div.leagueName,
    ops: stats?.ops ?? null,
    era: stats?.era ?? null,
    clinched: gb === 0 && entry.wins > 70, // rough heuristic
    eliminated: wcb > 15,
  };
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

export async function buildMlbPlayoffPictureContext(season: number): Promise<MlbPlayoffPictureContext> {
  const [divisions, leagueLeaders] = await Promise.all([
    fetchAllMlbStandings(season),
    fetchMlbLeagueLeaders(season, 5),
  ]);

  const allWithDiv: Array<{ entry: MlbStandingsEntry; div: MlbDivisionStandings }> = divisions.flatMap(
    (div) => div.teams.map((entry) => ({ entry, div })),
  );

  const statsMap = new Map<number, MlbTeamStats | null>();
  await Promise.all(
    allWithDiv.map(async ({ entry }) => {
      statsMap.set(entry.teamId, await fetchMlbTeamStats(entry.teamId, season));
    }),
  );

  const alDivs = divisions.filter((d) => d.leagueName.includes('American'));
  const nlDivs = divisions.filter((d) => d.leagueName.includes('National'));

  const divLeader = (divs: MlbDivisionStandings[]): PlayoffEntry[] =>
    divs
      .map((div) => {
        const leader = div.teams[0];
        if (!leader) return null;
        return toPlayoffEntry(leader, div, statsMap.get(leader.teamId) ?? null);
      })
      .filter((e): e is PlayoffEntry => e !== null);

  const nonLeaders = (divs: MlbDivisionStandings[]): PlayoffEntry[] =>
    divs
      .flatMap((div) =>
        div.teams.slice(1).map((entry) => toPlayoffEntry(entry, div, statsMap.get(entry.teamId) ?? null)),
      )
      .sort((a, b) => parseFloat(a.wildCardBack) - parseFloat(b.wildCardBack));

  const alLeaders = divLeader(alDivs);
  const nlLeaders = divLeader(nlDivs);
  const alWC = nonLeaders(alDivs).slice(0, 3);
  const nlWC = nonLeaders(nlDivs).slice(0, 3);

  // Bubble: teams 4–8 in wild card, within 5 GB
  const alBubble = nonLeaders(alDivs)
    .slice(3, 8)
    .filter((t) => parseFloat(t.wildCardBack) <= 5);
  const nlBubble = nonLeaders(nlDivs)
    .slice(3, 8)
    .filter((t) => parseFloat(t.wildCardBack) <= 5);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );

  return {
    season,
    weekNumber,
    generatedAt: now,
    alDivisionLeaders: alLeaders,
    nlDivisionLeaders: nlLeaders,
    alWildCard: alWC,
    nlWildCard: nlWC,
    bubbleTeams: [...alBubble, ...nlBubble],
    leagueLeaders,
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function entryRow(e: PlayoffEntry): string {
  return `${e.teamName} (${e.wins}-${e.losses}, ${e.winPct}) | GB: ${e.gamesBack} | WC-GB: ${e.wildCardBack} | Last 10: ${e.last10} | Streak: ${e.streak} | OPS: ${e.ops ?? '—'} | ERA: ${e.era ?? '—'} | ${e.leagueName} ${e.divisionName}`;
}

function leaderLine(
  leaders: Array<{ rank: number; name: string; team: string; value: string }>,
  limit = 3,
): string {
  return leaders.slice(0, limit).map((l) => `${l.name} (${l.team}): ${l.value}`).join(', ');
}

export function buildPlayoffPicturePrompt(ctx: MlbPlayoffPictureContext): string {
  const system = `You are a senior MLB analyst writing a weekly playoff picture and bubble watch column for a sports prediction blog. Your style is authoritative and forward-looking — like Ken Rosenthal or Jeff Passan writing about playoff races. Focus on what's at stake, who's trending right, and which teams are running out of time.

CRITICAL: Do NOT invent any statistic not found in the DATA BLOCK.`;

  const user = `Write a 700–900 word MLB Playoff Picture & Bubble Watch article for Week ${ctx.weekNumber} of the ${ctx.season} season. Output ONLY the article text.

FORMAT:
- Line 1: Title like "MLB Playoff Picture Week ${ctx.weekNumber}: Division Races, Wild Card Battles & Bubble Watch"
  No markdown (#).
- Line 2: Empty
- Line 3+: Body

MARKDOWN FORMATTING RULES:
- Use ## for major section headings (e.g., "## AL Division Leaders", "## Wild Card Watch", "## Bubble Watch")
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold team names with **Team Name** on first mention in each section
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. Opening paragraph: big-picture state of the playoff races — who looks locked in, where the drama is
2. ## AL Division Leaders: brief on each AL division leader's grip on their race — cite W-L, GB, last-10
3. ## NL Division Leaders: same treatment for NL
4. ## Wild Card Watch: cover the 3 AL and 3 NL wild card spots — who's in, who's fading, who's surging
5. ## Bubble Watch: name the 2–3 most interesting bubble teams — how many games back, what they need
6. ## Key Stats: weave in 1–2 individual leaders whose performance is driving their team's race
7. Closing: bold prediction — one team to make a late run and one to fade

━━━ DATA BLOCK ━━━

AL DIVISION LEADERS:
${ctx.alDivisionLeaders.map(entryRow).join('\n')}

NL DIVISION LEADERS:
${ctx.nlDivisionLeaders.map(entryRow).join('\n')}

AL WILD CARD STANDINGS (non-leaders):
${ctx.alWildCard.map(entryRow).join('\n')}

NL WILD CARD STANDINGS (non-leaders):
${ctx.nlWildCard.map(entryRow).join('\n')}

BUBBLE TEAMS (within 5 WC-GB):
${ctx.bubbleTeams.length > 0 ? ctx.bubbleTeams.map(entryRow).join('\n') : 'No teams currently within 5 GB of a wild card spot.'}

LEAGUE LEADERS:
BA: ${leaderLine(ctx.leagueLeaders.battingAvg)}
HR: ${leaderLine(ctx.leagueLeaders.homeRuns)}
ERA: ${leaderLine(ctx.leagueLeaders.era)}

━━━ END DATA BLOCK ━━━

Write now. Every stat must match the DATA BLOCK exactly.`;

  return `${system}\n\n${user}`;
}

export function buildPlayoffPictureMetaDescription(ctx: MlbPlayoffPictureContext): string {
  const alLeader = ctx.alDivisionLeaders[0]?.teamName ?? 'AL';
  const nlLeader = ctx.nlDivisionLeaders[0]?.teamName ?? 'NL';
  return `MLB Playoff Picture Week ${ctx.weekNumber}: ${alLeader} leads the AL, ${nlLeader} the NL. Wild card battles, bubble teams, and predictions for the stretch run.`.slice(0, 160);
}

export function buildPlayoffPictureSlug(season: number, weekNumber: number): string {
  return `mlb-playoff-picture-week-${weekNumber}-${season}`;
}
