import axios from 'axios';
import { z } from 'zod';
import type { SportConfig } from '@/lib/sports/config';

// ---------------------------------------------------------------------------
// Zod schemas — validated loosely so ESPN schema variation doesn't break us
// ---------------------------------------------------------------------------

const StatSchema = z.object({
  name: z.string().optional(),
  abbreviation: z.string().optional(),
  displayValue: z.string().optional(),
});

const AthleteSchema = z.object({
  displayName: z.string().optional(),
});

const ProbableSchema = z.object({
  athlete: AthleteSchema.optional(),
  statistics: z.array(StatSchema).optional(),
  record: z.string().optional(),
});

const RecordSchema = z.object({
  summary: z.string().optional(),
});

const TeamSchema = z.object({
  displayName: z.string().optional(),
  abbreviation: z.string().optional(),
});

const CompetitorSchema = z.object({
  homeAway: z.string().optional(),
  team: TeamSchema.optional(),
  records: z.array(RecordSchema).optional(),
  statistics: z.array(StatSchema).optional(),
  probables: z.array(ProbableSchema).optional(),
});

const StatusTypeSchema = z.object({
  state: z.string().optional(),
});

const StatusSchema = z.object({
  type: StatusTypeSchema.optional(),
});

const CompetitionSchema = z.object({
  competitors: z.array(CompetitorSchema).optional(),
});

const EventSchema = z.object({
  id: z.string().optional(),
  date: z.string().optional(),
  status: StatusSchema.optional(),
  competitions: z.array(CompetitionSchema).optional(),
});

const ScoreboardResponseSchema = z.object({
  events: z.array(EventSchema).optional(),
});

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PitcherStats {
  record?: string;
  [statAbbr: string]: string | undefined;
}

export interface EspnGame {
  espnEventId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  scheduledAt: Date;
  homeRecord: string | null;
  awayRecord: string | null;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  homePitcher: string | null;
  awayPitcher: string | null;
  homePitcherStats: PitcherStats | null;
  awayPitcherStats: PitcherStats | null;
  status: 'pre' | 'in' | 'post' | string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildStatMap(
  stats: Array<{ name?: string; abbreviation?: string; displayValue?: string }> | undefined,
  keyField: 'name' | 'abbreviation' = 'name',
): Record<string, string> {
  if (!stats) return {};
  const map: Record<string, string> = {};
  for (const s of stats) {
    const key = keyField === 'abbreviation' ? s.abbreviation : s.name;
    if (key && s.displayValue !== undefined) {
      map[key] = s.displayValue;
    }
  }
  return map;
}

function buildPitcherStats(probable: z.infer<typeof ProbableSchema> | undefined): PitcherStats | null {
  if (!probable) return null;
  const stats = buildStatMap(probable.statistics, 'abbreviation');
  if (probable.record) {
    stats['record'] = probable.record;
  }
  return Object.keys(stats).length > 0 ? stats : null;
}

function parseEvent(event: z.infer<typeof EventSchema>): EspnGame | null {
  if (!event.id) return null;

  const competition = event.competitions?.[0];
  if (!competition) return null;

  const competitors = competition.competitors ?? [];

  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');

  if (!home || !away) return null;

  return {
    espnEventId: event.id,
    homeTeam: home.team?.displayName ?? 'Unknown',
    awayTeam: away.team?.displayName ?? 'Unknown',
    homeTeamAbbr: home.team?.abbreviation ?? '',
    awayTeamAbbr: away.team?.abbreviation ?? '',
    scheduledAt: event.date ? new Date(event.date) : new Date(),
    homeRecord: home.records?.[0]?.summary ?? null,
    awayRecord: away.records?.[0]?.summary ?? null,
    homeStats: buildStatMap(home.statistics, 'name'),
    awayStats: buildStatMap(away.statistics, 'name'),
    homePitcher: home.probables?.[0]?.athlete?.displayName ?? null,
    awayPitcher: away.probables?.[0]?.athlete?.displayName ?? null,
    homePitcherStats: buildPitcherStats(home.probables?.[0]),
    awayPitcherStats: buildPitcherStats(away.probables?.[0]),
    status: event.status?.type?.state ?? 'pre',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches ESPN scoreboard for the given sport and one or more YYYYMMDD date strings.
 * Deduplicates events by espnEventId across multiple date fetches.
 */
export async function fetchEspnScoreboard(
  sport: SportConfig,
  dates: string[],
): Promise<EspnGame[]> {
  const url = `http://site.api.espn.com/apis/site/v2/sports/${sport.espnSport}/${sport.espnLeague}/scoreboard`;

  const gamesById = new Map<string, EspnGame>();

  for (const date of dates) {
    let data: unknown;
    try {
      const response = await axios.get(url, {
        params: { limit: 1000, dates: date },
        timeout: 15_000,
      });
      data = response.data;
    } catch (err) {
      console.error(`[espn-client] Failed to fetch ${sport.key} scoreboard for ${date}:`, err);
      continue;
    }

    const parsed = ScoreboardResponseSchema.safeParse(data);
    if (!parsed.success) {
      console.warn(`[espn-client] Unexpected response shape for ${sport.key} / ${date}:`, parsed.error.issues);
      continue;
    }

    for (const event of parsed.data.events ?? []) {
      const game = parseEvent(event);
      if (game && !gamesById.has(game.espnEventId)) {
        gamesById.set(game.espnEventId, game);
      }
    }
  }

  return Array.from(gamesById.values());
}
