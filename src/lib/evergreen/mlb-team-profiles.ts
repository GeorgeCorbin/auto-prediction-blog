/**
 * MLB Team Profiles — ~2 per week, April–August
 * Deep-dive season-long profile for one team: strengths, weaknesses,
 * betting angles, win total pace, key contributors.
 */

import {
  fetchMlbStandingsForTeam,
  fetchMlbTeamStats,
  fetchMlbTeamLeaders,
  fetchMlbInjuredPlayers,
  fetchMlbTeamRecentRecord,
  type MlbStandingsEntry,
  type MlbTeamStats,
  type MlbTeamLeaders,
} from '@/lib/mlb-statsapi/client';
import teamConfig from './mlb-team-profiles-config.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MlbTeamProfileContext {
  season: number;
  generatedAt: Date;
  teamId: number;
  teamName: string;
  abbr: string;
  division: string;
  standings: MlbStandingsEntry | null;
  stats: MlbTeamStats | null;
  leaders: MlbTeamLeaders | null;
  injuredCount: number;
  recentRecord: { last10: string; streak: string } | null;
}

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

export async function buildMlbTeamProfileContext(
  teamId: number,
  season: number,
): Promise<MlbTeamProfileContext> {
  const teamMeta = teamConfig.find((t) => t.teamId === teamId);
  const now = new Date();

  const [standings, stats, leaders, injured, recent] = await Promise.all([
    fetchMlbStandingsForTeam(teamId, season),
    fetchMlbTeamStats(teamId, season),
    fetchMlbTeamLeaders(teamId, season),
    fetchMlbInjuredPlayers(teamId, season),
    fetchMlbTeamRecentRecord(teamId, now.toISOString().split('T')[0]),
  ]);

  return {
    season,
    generatedAt: now,
    teamId,
    teamName: teamMeta?.name ?? `Team ${teamId}`,
    abbr: teamMeta?.abbr ?? '',
    division: teamMeta?.division ?? '',
    standings,
    stats,
    leaders,
    injuredCount: injured.length,
    recentRecord: recent ? { last10: recent.last10, streak: recent.streak } : null,
  };
}

/** Return all 30 team IDs in order */
export function getAllTeamIds(): number[] {
  return teamConfig.map((t) => t.teamId);
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export function buildTeamProfilePrompt(ctx: MlbTeamProfileContext): string {
  const s = ctx.standings;
  const st = ctx.stats;
  const l = ctx.leaders;

  const standingsLine = s
    ? `${s.wins}-${s.losses} (${s.winPct} WPct) | GB: ${s.gamesBack} | WC-GB: ${s.wildCardBack} | Streak: ${s.streak} | Last 10: ${s.last10}`
    : 'Standings unavailable';

  const statsLine = st
    ? `Hitting: AVG ${st.avg ?? '—'} | OBP ${st.obp ?? '—'} | SLG ${st.slg ?? '—'} | OPS ${st.ops ?? '—'} | R/G ${st.runsPerGame ?? '—'} | HR ${st.homeRuns ?? '—'}\nPitching: ERA ${st.era ?? '—'} | WHIP ${st.whip ?? '—'} | K/9 ${st.kPer9 ?? '—'} | OppAVG ${st.oppAvg ?? '—'}`
    : 'Team stats unavailable';

  const hittingLeaders = l && l.ops.length > 0
    ? l.ops.slice(0, 3).map((p) => `${p.name}: OPS ${p.value}`).join('\n')
    : l && l.homeRuns.length > 0
    ? l.homeRuns.slice(0, 3).map((p) => `${p.name}: ${p.value} HR`).join('\n')
    : 'N/A';

  const pitchingLeaders = l && l.era.length > 0
    ? l.era.slice(0, 3).map((p) => `${p.name}: ${p.value} ERA`).join('\n')
    : 'N/A';

  const recentLine = ctx.recentRecord
    ? `Last 10: ${ctx.recentRecord.last10} | Current streak: ${ctx.recentRecord.streak}`
    : 'Recent form unavailable';

  const system = `You are a senior MLB analyst writing a comprehensive team season profile for a sports prediction blog. Your style is detailed, analytical, and gives bettors and fantasy players a clear picture of the team — like a Baseball Prospectus team chapter. Cover the whole season arc.

CRITICAL: Do NOT invent any statistic not found in the DATA BLOCK.`;

  const user = `Write a 700–900 word ${ctx.season} season profile for the ${ctx.teamName}. Output ONLY the article text.

FORMAT:
- Line 1: Title like "${ctx.teamName} ${ctx.season} Season Profile: Strengths, Weaknesses & Betting Angles"
  No markdown (#).
- Line 2: Empty
- Line 3+: Body

MARKDOWN FORMATTING RULES:
- Use ## for major section headings (e.g., "## Season Overview", "## Offensive Analysis", "## Pitching Analysis", "## Betting Angle")
- Use - (dash) prefix for bullet/list items, NOT asterisk *
- Bold the team name with **${ctx.teamName}** on first mention
- Separate each section with a blank line before the ## heading

STRUCTURE:
1. ## Season Overview: Where are they in the standings, what kind of team are they running (offense-first, pitching-led, well-balanced)?
2. ## Offensive Analysis: Strengths and weaknesses using OPS, AVG, R/G — cite the top offensive contributors from HITTING LEADERS
3. ## Pitching Analysis: ERA, WHIP, K/9 — cite the top pitchers from PITCHING LEADERS
4. ## Recent Form: Are they heating up or cooling off? Use the last-10 record and streak
5. ## Betting Angle: Are they better as favorites or underdogs? Any home/away splits worth noting based on W-L pace?
6. ## Injury Impact: Note if the injury count (${ctx.injuredCount} players on IL) is significant
7. ## Rest of Season Outlook: What needs to happen for them to reach their ceiling or floor?

━━━ DATA BLOCK ━━━

TEAM: ${ctx.teamName} | ${ctx.division}
STANDINGS: ${standingsLine}
RECENT FORM: ${recentLine}
${statsLine}

TOP HITTERS:
${hittingLeaders}

TOP PITCHERS:
${pitchingLeaders}

INJURED LIST: ${ctx.injuredCount} players currently on IL

━━━ END DATA BLOCK ━━━

Write now. Every stat must match the DATA BLOCK exactly.`;

  return `${system}\n\n${user}`;
}

export function buildTeamProfileMetaDescription(ctx: MlbTeamProfileContext): string {
  const record = ctx.standings ? `${ctx.standings.wins}-${ctx.standings.losses}` : '';
  return `${ctx.teamName} ${ctx.season} season profile: ${record} record, team stats, top performers, betting angles, and rest-of-season outlook.`.slice(0, 160);
}

export function buildTeamProfileSlug(teamAbbr: string, season: number): string {
  return `mlb-${teamAbbr.toLowerCase()}-team-profile-${season}`;
}
