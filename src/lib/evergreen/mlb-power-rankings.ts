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

export interface PowerRankingEntry {
  rank: number;
  teamId: number;
  teamName: string;
  wins: number;
  losses: number;
  winPct: string;
  gamesBack: string;
  wildCardBack: string;
  streak: string;
  last10: string;
  divisionName: string;
  leagueName: string;
  stats: MlbTeamStats | null;
  rankChange: number; // positive = moved up, negative = moved down (0 if first run)
}

export interface MlbPowerRankingsContext {
  season: number;
  weekNumber: number;
  generatedAt: Date;
  rankings: PowerRankingEntry[];
  leagueLeaders: MlbLeagueLeaders;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Composite score used to rank teams 1–30. Higher = better. */
function scoreTeam(entry: MlbStandingsEntry, stats: MlbTeamStats | null): number {
  let score = 0;

  // Win percentage is the primary signal (0–1, scale to 0–500)
  const wp = parseFloat(entry.winPct);
  if (isFinite(wp)) score += wp * 500;

  // Last-10 form (0–10 wins, scale to 0–100)
  if (entry.last10) {
    const [w] = entry.last10.split('-').map(Number);
    if (isFinite(w)) score += w * 10;
  }

  // Streak bonus/penalty (±5 per game in streak)
  if (entry.streak) {
    const m = entry.streak.match(/^([WL])(\d+)$/);
    if (m) {
      const n = parseInt(m[2], 10);
      score += m[1] === 'W' ? n * 5 : -n * 5;
    }
  }

  // Team OPS (scale 0–100, league avg ~.720)
  if (stats?.ops) {
    const ops = parseFloat(stats.ops);
    if (isFinite(ops)) score += (ops - 0.65) * 200;
  }

  // Team ERA — lower is better (scale: league avg ~4.20)
  if (stats?.era) {
    const era = parseFloat(stats.era);
    if (isFinite(era)) score += (5.5 - era) * 15;
  }

  // Team WHIP — lower is better (league avg ~1.30)
  if (stats?.whip) {
    const whip = parseFloat(stats.whip);
    if (isFinite(whip)) score += (1.6 - whip) * 20;
  }

  // Runs per game (league avg ~4.5)
  if (stats?.runsPerGame) {
    const rpg = parseFloat(stats.runsPerGame);
    if (isFinite(rpg)) score += (rpg - 3.5) * 10;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

export async function buildMlbPowerRankingsContext(
  season: number,
): Promise<MlbPowerRankingsContext> {
  const [divisions, leagueLeaders] = await Promise.all([
    fetchAllMlbStandings(season),
    fetchMlbLeagueLeaders(season, 5),
  ]);

  // Collect all 30 team entries with division metadata
  const allTeams: Array<{
    entry: MlbStandingsEntry;
    divisionName: string;
    leagueName: string;
  }> = [];

  for (const div of divisions) {
    for (const team of div.teams) {
      allTeams.push({ entry: team, divisionName: div.divisionName, leagueName: div.leagueName });
    }
  }

  // Fetch team stats in parallel (cap at 30 concurrent requests, all MLB teams)
  const statsResults = await Promise.all(
    allTeams.map(({ entry }) => fetchMlbTeamStats(entry.teamId, season)),
  );

  // Score and sort
  const scored = allTeams.map((t, i) => ({
    ...t,
    stats: statsResults[i] ?? null,
    score: scoreTeam(t.entry, statsResults[i] ?? null),
  }));

  scored.sort((a, b) => b.score - a.score);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );

  const rankings: PowerRankingEntry[] = scored.map((t, idx) => ({
    rank: idx + 1,
    teamId: t.entry.teamId,
    teamName: t.entry.teamName,
    wins: t.entry.wins,
    losses: t.entry.losses,
    winPct: t.entry.winPct,
    gamesBack: t.entry.gamesBack,
    wildCardBack: t.entry.wildCardBack,
    streak: t.entry.streak,
    last10: t.entry.last10,
    divisionName: t.divisionName,
    leagueName: t.leagueName,
    stats: t.stats,
    rankChange: 0,
  }));

  return { season, weekNumber, generatedAt: now, rankings, leagueLeaders };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function leaderLine(
  leaders: Array<{ rank: number; name: string; team: string; value: string }>,
  limit = 5,
): string {
  return leaders
    .slice(0, limit)
    .map((l) => `${l.rank}. ${l.name} (${l.team}): ${l.value}`)
    .join(', ');
}

function rankingDataBlock(rankings: PowerRankingEntry[]): string {
  return rankings
    .map((r) => {
      const ops = r.stats?.ops ?? '—';
      const era = r.stats?.era ?? '—';
      const whip = r.stats?.whip ?? '—';
      const rpg = r.stats?.runsPerGame ?? '—';
      return `${r.rank}. ${r.teamName} (${r.wins}-${r.losses}, ${r.winPct}) | Last 10: ${r.last10 || '—'} | Streak: ${r.streak || '—'} | GB: ${r.gamesBack} | OPS: ${ops} | ERA: ${era} | WHIP: ${whip} | R/G: ${rpg} | ${r.leagueName} ${r.divisionName}`;
    })
    .join('\n');
}

export function buildPowerRankingsPrompt(ctx: MlbPowerRankingsContext): string {
  const ll = ctx.leagueLeaders;

  const systemPrompt = `You are a professional MLB analyst writing a power rankings article for a sports prediction blog. Your style is authoritative, analytical, and engaging — like ESPN or The Athletic. Write in the third person.

CRITICAL RULE — NO STAT HALLUCINATION:
You will be given a DATA BLOCK with the only statistics you may cite. Do NOT invent, estimate, or approximate any figure not listed there. If a stat is missing, use general language ("strong ERA", "potent lineup") instead.

ANTI-REPETITION:
- Open with a strong analytical hook about the state of the MLB, not a generic intro.
- Do NOT start with "In what promises to be" or similar filler.
- Vary paragraph lengths and structures throughout.`;

  const userPrompt = `Write a 700–900 word MLB Power Rankings article for Week ${ctx.weekNumber} of the ${ctx.season} season. Output ONLY the article text.

FORMAT:
- Line 1: Article title in this style: "MLB Power Rankings Week ${ctx.weekNumber}: ${ctx.season} Rankings, Risers & Fallers"
  Do NOT add any markdown (#) to the title line.
- Line 2: Empty line
- Line 3 onward: Article body

MARKDOWN FORMATTING RULES:
- Use ## for major section headings (e.g., "## Top 5", "## Risers", "## Fallers", "## Statistical Leaders")
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold team names with **Team Name** on first mention in each section
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. Opening paragraph: sharp analytical take on the overall league landscape this week
2. ## Top 5 — write 2–3 sentences on each of the top 5 teams as a numbered list (1. **Team** (W-L)...) — use their specific W-L, OPS, ERA, and last-10 record from the DATA BLOCK
3. ## Risers — highlight 2–3 teams from ranks 6–15 showing momentum (strong last-10, hot streak) — cite specific stats. Use - bullet format.
4. ## Fallers — 2–3 teams from ranks 16–30 on a concerning slide — cite stats. Use - bullet format.
5. ## Statistical Leaders — weave in 2–3 league leaders from the LEAGUE LEADERS block as bullet points
6. Closing paragraph: forward-looking take on playoff implications

━━━ DATA BLOCK — cite ONLY these numbers ━━━

RANKINGS (Rank. Team | W-L, WPct | Last 10 | Streak | GB | OPS | ERA | WHIP | R/G | League Division):
${rankingDataBlock(ctx.rankings)}

LEAGUE LEADERS:
Batting Average: ${leaderLine(ll.battingAvg)}
Home Runs: ${leaderLine(ll.homeRuns)}
RBI: ${leaderLine(ll.rbi)}
OPS: ${leaderLine(ll.ops)}
ERA: ${leaderLine(ll.era)}
Strikeouts: ${leaderLine(ll.strikeouts)}
Wins: ${leaderLine(ll.wins)}
WHIP: ${leaderLine(ll.whip)}

━━━ END DATA BLOCK ━━━

Write the article now. Every statistic you cite must appear exactly as shown in the DATA BLOCK.`;

  return `${systemPrompt}\n\n${userPrompt}`;
}

export function buildPowerRankingsMetaDescription(ctx: MlbPowerRankingsContext): string {
  const top3 = ctx.rankings
    .slice(0, 3)
    .map((r) => r.teamName)
    .join(', ');
  const desc = `MLB Power Rankings Week ${ctx.weekNumber} (${ctx.season}): ${top3} lead our latest 1–30 rankings. Full analysis, risers, fallers, and stats.`;
  return desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
}

export function buildPowerRankingsSlug(season: number, weekNumber: number): string {
  return `mlb-power-rankings-week-${weekNumber}-${season}`;
}
