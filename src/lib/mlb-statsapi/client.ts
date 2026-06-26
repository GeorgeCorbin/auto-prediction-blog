import axios from 'axios';
import { z } from 'zod';

const BASE = 'https://statsapi.mlb.com/api/v1';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const TeamHittingStatSchema = z.object({
  avg: z.string().optional(),
  obp: z.string().optional(),
  slg: z.string().optional(),
  ops: z.string().optional(),
  runs: z.number().optional(),
  gamesPlayed: z.number().optional(),
  homeRuns: z.number().optional(),
  strikeOuts: z.number().optional(),
  baseOnBalls: z.number().optional(),
});

const TeamPitchingStatSchema = z.object({
  era: z.string().optional(),
  whip: z.string().optional(),
  strikeOuts: z.number().optional(),
  inningsPitched: z.string().optional(),
  strikeoutsPer9Inn: z.string().optional(),
  baseOnBalls: z.number().optional(),
  hits: z.number().optional(),
  homeRuns: z.number().optional(),
  gamesPlayed: z.number().optional(),
  battersFaced: z.number().optional(),
  avg: z.string().optional(),
});

const CombinedStatSchema = TeamHittingStatSchema.merge(TeamPitchingStatSchema);

const SplitSchema = z.object({
  stat: CombinedStatSchema.optional(),
});

const TeamStatsResponseSchema = z.object({
  stats: z.array(
    z.object({
      splits: z.array(SplitSchema).optional(),
    }),
  ).optional(),
});

const StandingsTeamSchema = z.object({
  team: z.object({ id: z.number().optional(), name: z.string().optional() }).optional(),
  wins: z.number().optional(),
  losses: z.number().optional(),
  winningPercentage: z.string().optional(),
  gamesBack: z.string().optional(),
  wildCardGamesBack: z.string().optional(),
  streak: z.object({ streakCode: z.string().optional() }).optional(),
  records: z.object({
    splitRecords: z.array(
      z.object({
        wins: z.number().optional(),
        losses: z.number().optional(),
        type: z.string().optional(),
      }),
    ).optional(),
  }).optional(),
});

const StandingsRecordSchema = z.object({
  teamRecords: z.array(StandingsTeamSchema).optional(),
});

const StandingsResponseSchema = z.object({
  records: z.array(StandingsRecordSchema).optional(),
});

const PitcherSeasonStatSchema = z.object({
  era: z.string().optional(),
  whip: z.string().optional(),
  wins: z.number().optional(),
  losses: z.number().optional(),
  strikeOuts: z.number().optional(),
  baseOnBalls: z.number().optional(),
  inningsPitched: z.string().optional(),
  hits: z.number().optional(),
  homeRuns: z.number().optional(),
  gamesStarted: z.number().optional(),
  avg: z.string().optional(),
});

const PitcherStatsSplitSchema = z.object({
  stat: PitcherSeasonStatSchema.optional(),
  season: z.string().optional(),
});

const PitcherStatsResponseSchema = z.object({
  stats: z.array(
    z.object({
      splits: z.array(PitcherStatsSplitSchema).optional(),
    }),
  ).optional(),
});

const PeoplePersonSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().optional(),
  pitchHand: z.object({ code: z.string().optional() }).optional(),
});

const PeopleResponseSchema = z.object({
  people: z.array(PeoplePersonSchema).optional(),
});

const ScheduleGameSchema = z.object({
  gamePk: z.number().optional(),
  teams: z.object({
    away: z.object({
      team: z.object({ id: z.number().optional() }).optional(),
      score: z.number().optional(),
      isWinner: z.boolean().optional(),
    }).optional(),
    home: z.object({
      team: z.object({ id: z.number().optional() }).optional(),
      score: z.number().optional(),
      isWinner: z.boolean().optional(),
    }).optional(),
  }).optional(),
  status: z.object({ abstractGameState: z.string().optional() }).optional(),
});

const ScheduleResponseSchema = z.object({
  dates: z.array(
    z.object({
      games: z.array(ScheduleGameSchema).optional(),
    }),
  ).optional(),
});

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MlbTeamStats {
  avg: string | null;
  obp: string | null;
  slg: string | null;
  ops: string | null;
  runsPerGame: string | null;
  homeRuns: number | null;
  era: string | null;
  whip: string | null;
  kPer9: string | null;
  oppAvg: string | null;
}

export interface MlbStandingsEntry {
  teamId: number;
  teamName: string;
  wins: number;
  losses: number;
  winPct: string;
  gamesBack: string;
  wildCardBack: string;
  streak: string;
  last10: string;
}

export interface MlbPlayerLeader {
  name: string;
  value: string;
}

export interface MlbTeamLeaders {
  battingAvg: MlbPlayerLeader[];
  homeRuns: MlbPlayerLeader[];
  rbi: MlbPlayerLeader[];
  ops: MlbPlayerLeader[];
  era: MlbPlayerLeader[];
  strikeouts: MlbPlayerLeader[];
}

export interface MlbILPlayer {
  name: string;
  ilType: string;
}

export interface MlbPitcherSeasonStats {
  era: string | null;
  whip: string | null;
  wins: number | null;
  losses: number | null;
  strikeOuts: number | null;
  baseOnBalls: number | null;
  inningsPitched: string | null;
  kPer9: string | null;
  bbPer9: string | null;
  oppAvg: string | null;
  gamesStarted: number | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function safeGet<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

function computeKPer9(strikeOuts: number | undefined, ip: string | undefined): string | null {
  const k = strikeOuts ?? 0;
  const innings = parseFloat(ip ?? '0');
  if (!innings || innings === 0) return null;
  return ((k / innings) * 9).toFixed(2);
}

function computeRunsPerGame(runs: number | undefined, games: number | undefined): string | null {
  if (runs === undefined || !games || games === 0) return null;
  return (runs / games).toFixed(2);
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Fetch season hitting + pitching stats for a given MLB team.
 * teamId: MLB Stats API numeric team ID (e.g. 119 = Dodgers).
 */
export async function fetchMlbTeamStats(teamId: number, season: number): Promise<MlbTeamStats> {
  const empty: MlbTeamStats = {
    avg: null, obp: null, slg: null, ops: null, runsPerGame: null,
    homeRuns: null, era: null, whip: null, kPer9: null, oppAvg: null,
  };

  try {
    const [hittingResp, pitchingResp] = await Promise.all([
      axios.get(`${BASE}/teams/${teamId}/stats`, {
        params: { season, group: 'hitting', stats: 'season', sportId: 1 },
        timeout: 8000,
      }),
      axios.get(`${BASE}/teams/${teamId}/stats`, {
        params: { season, group: 'pitching', stats: 'season', sportId: 1 },
        timeout: 8000,
      }),
    ]);

    const hittingData = safeGet(TeamStatsResponseSchema, hittingResp.data);
    const pitchingData = safeGet(TeamStatsResponseSchema, pitchingResp.data);

    const hitting = hittingData?.stats?.[0]?.splits?.[0]?.stat;
    const pitching = pitchingData?.stats?.[0]?.splits?.[0]?.stat;

    return {
      avg: hitting?.avg ?? null,
      obp: hitting?.obp ?? null,
      slg: hitting?.slg ?? null,
      ops: hitting?.ops ?? null,
      runsPerGame: computeRunsPerGame(hitting?.runs, hitting?.gamesPlayed),
      homeRuns: hitting?.homeRuns ?? null,
      era: pitching?.era ?? null,
      whip: pitching?.whip ?? null,
      kPer9: pitching?.strikeoutsPer9Inn ?? computeKPer9(pitching?.strikeOuts, pitching?.inningsPitched),
      oppAvg: pitching?.avg ?? null,
    };
  } catch {
    return empty;
  }
}

/**
 * Fetch current standings entry for a team from the MLB Stats API.
 * leagueId: 103 = AL, 104 = NL.
 */
export async function fetchMlbStandingsForTeam(
  teamId: number,
  season: number,
): Promise<MlbStandingsEntry | null> {
  try {
    const resp = await axios.get(`${BASE}/standings`, {
      params: { leagueId: '103,104', season, hydrate: 'team' },
      timeout: 8000,
    });

    const data = safeGet(StandingsResponseSchema, resp.data);
    if (!data) return null;

    for (const division of data.records ?? []) {
      for (const entry of division.teamRecords ?? []) {
        if (entry.team?.id !== teamId) continue;

        const last10Split = entry.records?.splitRecords?.find((r) => r.type === 'lastTen');
        const last10 = last10Split
          ? `${last10Split.wins ?? 0}-${last10Split.losses ?? 0}`
          : null;

        return {
          teamId,
          teamName: entry.team?.name ?? '',
          wins: entry.wins ?? 0,
          losses: entry.losses ?? 0,
          winPct: entry.winningPercentage ?? '',
          gamesBack: entry.gamesBack ?? '-',
          wildCardBack: entry.wildCardGamesBack ?? '-',
          streak: entry.streak?.streakCode ?? '',
          last10: last10 ?? '',
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch season stats for a pitcher by their MLB person ID.
 */
export async function fetchMlbPitcherStats(
  personId: number,
  season: number,
): Promise<MlbPitcherSeasonStats | null> {
  const empty: MlbPitcherSeasonStats = {
    era: null, whip: null, wins: null, losses: null, strikeOuts: null,
    baseOnBalls: null, inningsPitched: null, kPer9: null, bbPer9: null,
    oppAvg: null, gamesStarted: null,
  };

  try {
    const resp = await axios.get(`${BASE}/people/${personId}/stats`, {
      params: { stats: 'season', group: 'pitching', season },
      timeout: 8000,
    });

    const data = safeGet(PitcherStatsResponseSchema, resp.data);
    const split = data?.stats?.[0]?.splits?.[0]?.stat;
    if (!split) return empty;

    const kPer9 = computeKPer9(split.strikeOuts, split.inningsPitched);
    const bbPer9 = computeKPer9(split.baseOnBalls, split.inningsPitched);

    return {
      era: split.era ?? null,
      whip: split.whip ?? null,
      wins: split.wins ?? null,
      losses: split.losses ?? null,
      strikeOuts: split.strikeOuts ?? null,
      baseOnBalls: split.baseOnBalls ?? null,
      inningsPitched: split.inningsPitched ?? null,
      kPer9,
      bbPer9,
      oppAvg: split.avg ?? null,
      gamesStarted: split.gamesStarted ?? null,
    };
  } catch {
    return empty;
  }
}

const TeamLeadersResponseSchema = z.object({
  teamLeaders: z.array(
    z.object({
      leaderCategory: z.string().optional(),
      statGroup: z.string().optional(),
      leaders: z.array(
        z.object({
          rank: z.number().optional(),
          value: z.string().optional(),
          person: z.object({ fullName: z.string().optional() }).optional(),
        }),
      ).optional(),
    }),
  ).optional(),
});

const RosterPlayerSchema = z.object({
  person: z.object({ fullName: z.string().optional() }).optional(),
  status: z.object({ code: z.string().optional(), description: z.string().optional() }).optional(),
  position: z.object({ abbreviation: z.string().optional(), type: z.string().optional() }).optional(),
});

const RosterResponseSchema = z.object({
  roster: z.array(RosterPlayerSchema).optional(),
});

/**
 * Fetch top offensive and pitching leaders for a team this season.
 * Returns up to 3 leaders per category.
 */
export async function fetchMlbTeamLeaders(
  teamId: number,
  season: number,
): Promise<MlbTeamLeaders> {
  const empty: MlbTeamLeaders = { battingAvg: [], homeRuns: [], rbi: [], ops: [], era: [], strikeouts: [] };
  try {
    const resp = await axios.get(`${BASE}/teams/${teamId}/leaders`, {
      params: {
        leaderCategories: 'battingAverage,homeRuns,rbi,onBasePlusSlugging,earnedRunAverage,strikeouts',
        season,
        leaderGameTypes: 'R',
        limit: 3,
      },
      timeout: 8000,
    });

    const data = safeGet(TeamLeadersResponseSchema, resp.data);
    if (!data) return empty;

    const extract = (category: string): MlbPlayerLeader[] =>
      data.teamLeaders
        ?.find((l) => l.leaderCategory === category)
        ?.leaders
        ?.map((l) => ({ name: l.person?.fullName ?? '', value: l.value ?? '' }))
        .filter((l) => l.name) ?? [];

    return {
      battingAvg: extract('battingAverage'),
      homeRuns: extract('homeRuns'),
      rbi: extract('rbi'),
      ops: extract('onBasePlusSlugging'),
      era: extract('earnedRunAverage'),
      strikeouts: extract('strikeouts'),
    };
  } catch {
    return empty;
  }
}

/**
 * Fetch players currently on the IL (10-Day, 15-Day, 60-Day) for a team.
 * Uses the fullRoster endpoint and filters by injury status codes.
 */
export async function fetchMlbInjuredPlayers(
  teamId: number,
  season: number,
): Promise<MlbILPlayer[]> {
  try {
    const resp = await axios.get(`${BASE}/teams/${teamId}/roster`, {
      params: { rosterType: 'fullRoster', season },
      timeout: 8000,
    });

    const data = safeGet(RosterResponseSchema, resp.data);
    const IL_CODES = new Set(['D10', 'D15']);

    return (
      data?.roster
        ?.filter((p) => IL_CODES.has(p.status?.code ?? ''))
        .map((p) => ({
          name: p.person?.fullName ?? '',
          ilType: p.status?.description ?? '',
        }))
        .filter((p) => p.name) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Look up an MLB player ID by full name. Returns the first match.
 */
export async function lookupMlbPlayerId(fullName: string): Promise<number | null> {
  try {
    const resp = await axios.get(`${BASE}/people/search`, {
      params: { names: fullName, sportId: 1 },
      timeout: 8000,
    });
    const data = safeGet(PeopleResponseSchema, resp.data);
    return data?.people?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch recent game results for a team (last N games before a given date)
 * to derive recent form. Returns wins/losses as a string like "7-3" (last 10).
 */
export async function fetchMlbTeamRecentRecord(
  teamId: number,
  beforeDate: string,
  lookbackDays = 14,
): Promise<{ last10: string; streak: string } | null> {
  try {
    const end = new Date(beforeDate);
    const start = new Date(end);
    start.setDate(start.getDate() - lookbackDays);

    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

    const resp = await axios.get(`${BASE}/schedule`, {
      params: {
        sportId: 1,
        teamId,
        startDate: fmt(start),
        endDate: fmt(end),
        gameType: 'R',
        fields: 'dates,games,gamePk,teams,away,home,score,isWinner,team,id,status,abstractGameState',
      },
      timeout: 8000,
    });

    const data = safeGet(ScheduleResponseSchema, resp.data);
    const games: Array<{ won: boolean }> = [];

    for (const dateEntry of data?.dates ?? []) {
      for (const game of dateEntry.games ?? []) {
        if (game.status?.abstractGameState !== 'Final') continue;
        const side =
          game.teams?.home?.team?.id === teamId ? game.teams?.home : game.teams?.away;
        if (side?.isWinner !== undefined) {
          games.push({ won: side.isWinner });
        }
      }
    }

    if (games.length === 0) return null;

    const recent = games.slice(-10);
    const wins = recent.filter((g) => g.won).length;
    const losses = recent.length - wins;

    let streak = '';
    const lastResult = games[games.length - 1];
    if (lastResult) {
      const char = lastResult.won ? 'W' : 'L';
      let count = 0;
      for (let i = games.length - 1; i >= 0; i--) {
        if (games[i].won === lastResult.won) count++;
        else break;
      }
      streak = `${char}${count}`;
    }

    return { last10: `${wins}-${losses}`, streak };
  } catch {
    return null;
  }
}

/**
 * Map an ESPN team abbreviation to an MLB Stats API team ID.
 * Covers all 30 MLB teams.
 */
export function espnAbbrToMlbTeamId(abbr: string): number | null {
  const map: Record<string, number> = {
    // AL East
    BAL: 110, BOS: 111, NYY: 147, TB: 139, TOR: 141,
    // AL Central
    CWS: 145, CLE: 114, DET: 116, KC: 118, MIN: 142,
    // AL West
    HOU: 117, LAA: 108, OAK: 133, SEA: 136, TEX: 140,
    // NL East
    ATL: 144, MIA: 146, NYM: 121, PHI: 143, WSH: 120,
    // NL Central
    CHC: 112, CIN: 113, MIL: 158, PIT: 134, STL: 138,
    // NL West
    ARI: 109, COL: 115, LAD: 119, SD: 135, SF: 137,
  };
  return map[abbr.toUpperCase()] ?? null;
}
