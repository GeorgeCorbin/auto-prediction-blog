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
  form: z.string().optional(),
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

const VenueAddressSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

const VenueScoreboardSchema = z.object({
  fullName: z.string().optional(),
  address: VenueAddressSchema.optional(),
});

const GeoBroadcastSchema = z.object({
  media: z.object({ shortName: z.string().optional() }).optional(),
  market: z.object({ type: z.string().optional() }).optional(),
  type: z.object({ shortName: z.string().optional() }).optional(),
});

const BroadcastMarketSchema = z.object({
  market: z.string().optional(),
  names: z.array(z.string()).optional(),
});

const CompetitionSchema = z.object({
  competitors: z.array(CompetitorSchema).optional(),
  notes: z.array(z.object({ headline: z.string().optional() })).optional(),
  altGameNote: z.string().optional(),
  type: z.object({
    abbreviation: z.string().optional(),
    name: z.string().optional(),
  }).optional(),
  venue: VenueScoreboardSchema.optional(),
  geoBroadcasts: z.array(GeoBroadcastSchema).optional(),
  broadcasts: z.array(BroadcastMarketSchema).optional(),
});

const EventSeasonSchema = z.object({
  slug: z.string().optional(),
  type: z.union([
    z.number(),
    z.object({ name: z.string().optional(), abbreviation: z.string().optional() }),
  ]).optional(),
});

const EventSchema = z.object({
  id: z.string().optional(),
  date: z.string().optional(),
  status: StatusSchema.optional(),
  season: EventSeasonSchema.optional(),
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
  /** Recent form string (e.g. "WWDLW") — used by soccer modules */
  homeForm?: string | null;
  awayForm?: string | null;
  /** Competition note headline (group, knockout round, etc.) */
  gameNote?: string | null;
  groupName: string | null;
  stage: string | null;
  /** Deduplicated broadcaster short names (e.g. FOX, Peacock) */
  broadcasts: string[];
  venueName: string | null;
  venueCity: string | null;
  venueCountry: string | null;
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

function extractBroadcastNames(
  geoBroadcasts: z.infer<typeof GeoBroadcastSchema>[] | undefined,
  broadcasts: z.infer<typeof BroadcastMarketSchema>[] | undefined,
): string[] {
  const names = new Set<string>();

  for (const gb of geoBroadcasts ?? []) {
    const name = gb.media?.shortName?.trim();
    if (name) names.add(name);
  }

  for (const b of broadcasts ?? []) {
    for (const name of b.names ?? []) {
      const trimmed = name.trim();
      if (trimmed) names.add(trimmed);
    }
  }

  return Array.from(names);
}

function buildPitcherStats(probable: z.infer<typeof ProbableSchema> | undefined): PitcherStats | null {
  if (!probable) return null;
  const stats = buildStatMap(probable.statistics, 'abbreviation');
  if (probable.record) {
    stats['record'] = probable.record;
  }
  return Object.keys(stats).length > 0 ? stats : null;
}

const WDL_FORM_RE = /^[WDL]+$/i;
const WDL_RECORD_RE = /^\d+\s*-\s*\d+\s*-\s*\d+$/;

function extractCompetitorForm(
  competitor: z.infer<typeof CompetitorSchema>,
): string | null {
  if (competitor.form?.trim()) {
    return competitor.form.trim();
  }

  const statForm = competitor.statistics
    ?.find((s) => s.name?.toLowerCase() === 'form')
    ?.displayValue?.trim();
  if (statForm && WDL_FORM_RE.test(statForm)) {
    return statForm;
  }

  const recordForm = competitor.records
    ?.find((r) => r.summary && WDL_FORM_RE.test(r.summary))
    ?.summary?.trim();
  return recordForm ?? null;
}

function extractCompetitorRecord(
  records: z.infer<typeof RecordSchema>[] | undefined,
): string | null {
  const wdlRecord = records?.find((r) => r.summary && WDL_RECORD_RE.test(r.summary.trim()));
  if (wdlRecord?.summary) {
    return wdlRecord.summary.trim();
  }
  return records?.[0]?.summary?.trim() ?? null;
}

function slugToTitleCase(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseEvent(event: z.infer<typeof EventSchema>): EspnGame | null {
  if (!event.id) return null;

  const competition = event.competitions?.[0];
  if (!competition) return null;

  const competitors = competition.competitors ?? [];

  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');

  if (!home || !away) return null;

  const noteHeadline = competition.notes?.[0]?.headline?.trim() ?? '';
  const altGameNote = competition.altGameNote?.trim() ?? '';
  const contextNote = noteHeadline || altGameNote;
  const groupMatch = contextNote.match(/Group\s+([A-Z0-9]+)/i);
  const groupName = groupMatch ? `Group ${groupMatch[1].toUpperCase()}` : null;

  const compTypeLabel =
    competition.type?.name?.trim() ||
    competition.type?.abbreviation?.trim() ||
    null;
  const seasonType =
    typeof event.season?.type === 'object'
      ? event.season.type.name?.trim() || event.season.type.abbreviation?.trim() || null
      : null;
  const seasonSlug = event.season?.slug?.trim();

  let stage: string | null = null;
  if (compTypeLabel) {
    stage = compTypeLabel;
  } else if (seasonType) {
    stage = seasonType;
  } else if (seasonSlug) {
    stage = slugToTitleCase(seasonSlug);
  } else if (/knockout|round of|quarter|semi|final/i.test(contextNote)) {
    stage = contextNote || 'Knockout Stage';
  } else if (groupName) {
    stage = 'Group Stage';
  }

  const homeForm = extractCompetitorForm(home);
  const awayForm = extractCompetitorForm(away);

  const venue = competition.venue;
  const broadcasts = extractBroadcastNames(competition.geoBroadcasts, competition.broadcasts);

  return {
    espnEventId: event.id,
    homeTeam: home.team?.displayName ?? 'Unknown',
    awayTeam: away.team?.displayName ?? 'Unknown',
    homeTeamAbbr: home.team?.abbreviation ?? '',
    awayTeamAbbr: away.team?.abbreviation ?? '',
    scheduledAt: event.date ? new Date(event.date) : new Date(),
    homeRecord: extractCompetitorRecord(home.records),
    awayRecord: extractCompetitorRecord(away.records),
    homeStats: buildStatMap(home.statistics, 'name'),
    awayStats: buildStatMap(away.statistics, 'name'),
    homePitcher: home.probables?.[0]?.athlete?.displayName ?? null,
    awayPitcher: away.probables?.[0]?.athlete?.displayName ?? null,
    homePitcherStats: buildPitcherStats(home.probables?.[0]),
    awayPitcherStats: buildPitcherStats(away.probables?.[0]),
    homeForm,
    awayForm,
    gameNote: contextNote || null,
    groupName,
    stage,
    broadcasts,
    venueName: venue?.fullName ?? null,
    venueCity: venue?.address?.city ?? null,
    venueCountry: venue?.address?.country ?? venue?.address?.state ?? null,
    status: event.status?.type?.state ?? 'pre',
  };
}

// ---------------------------------------------------------------------------
// Summary API schemas (venue + probable pitchers)
// ---------------------------------------------------------------------------

const VenueImageSchema = z.object({
  href: z.string().optional(),
});

const VenueSchema = z.object({
  fullName: z.string().optional(),
  address: VenueAddressSchema.optional(),
  images: z.array(VenueImageSchema).optional(),
});

const SummaryBroadcastSchema = z.object({
  media: z.object({ shortName: z.string().optional(), name: z.string().optional() }).optional(),
});

const SummaryBroadcastsSchema = z.array(SummaryBroadcastSchema).optional();

const GameInfoSchema = z.object({
  venue: VenueSchema.optional(),
});

// Summary probable pitcher stats come back as a splits.categories array
const SummaryStatSchema = z.object({
  abbreviation: z.string().optional(),
  displayValue: z.string().optional(),
  value: z.number().optional(),
});

const SummarySplitsSchema = z.object({
  categories: z.array(SummaryStatSchema).optional(),
});

const SummaryStatisticsSchema = z.object({
  splits: SummarySplitsSchema.optional(),
}).passthrough();

const ThrowsSchema = z.union([
  z.string(),
  z.object({ abbreviation: z.string().optional() }),
]);

const SummaryAthleteSchema = z.object({
  id: z.string().optional(),
  displayName: z.string().optional(),
  throws: ThrowsSchema.optional(),
});

const SummaryProbableSchema = z.object({
  athlete: SummaryAthleteSchema.optional(),
  record: z.string().optional(),
  statistics: SummaryStatisticsSchema.optional(),
});

const SummaryCompetitorSchema = z.object({
  homeAway: z.string().optional(),
  team: z.object({ abbreviation: z.string().optional() }).optional(),
  probables: z.array(SummaryProbableSchema).optional(),
});

const SummaryCompetitionSchema = z.object({
  competitors: z.array(SummaryCompetitorSchema).optional(),
});

const SummaryHeaderSchema = z.object({
  competitions: z.array(SummaryCompetitionSchema).optional(),
});

const SummaryResponseSchema = z.object({
  gameInfo: GameInfoSchema.optional(),
  header: SummaryHeaderSchema.optional(),
  broadcasts: SummaryBroadcastsSchema,
});

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EspnVenueImage {
  imageUrl: string | null;
  imageAlt: string;
  imageCredit: string;
}

export interface EspnRichPitcherStats {
  /** W-L record string, e.g. "8-2" */
  record: string | null;
  throws: string | null;  // "L" | "R"
  ERA: string | null;
  WHIP: string | null;
  IP: string | null;
  K: string | null;
  BB: string | null;
  H: string | null;
  HR: string | null;
  W: string | null;
  L: string | null;
}

export interface EspnGameSummary {
  venueImage: EspnVenueImage;
  venueName: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  broadcasts: string[];
  homePitcherStats: EspnRichPitcherStats | null;
  awayPitcherStats: EspnRichPitcherStats | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRichPitcherStats(
  probable: z.infer<typeof SummaryProbableSchema> | undefined,
): EspnRichPitcherStats | null {
  if (!probable) return null;

  const cats = probable.statistics?.splits?.categories ?? [];
  const statMap: Record<string, string> = {};
  for (const s of cats) {
    if (s.abbreviation && s.displayValue !== undefined) {
      statMap[s.abbreviation] = s.displayValue;
    }
  }

  // IP = fullInnings + partialInnings/3
  const fi = parseFloat(statMap['FI'] ?? '0');
  const pi = parseFloat(statMap['PI'] ?? '0');
  const ipNum = fi + pi / 3;
  const ipStr = ipNum > 0 ? ipNum.toFixed(1) : null;

  // Record string from existing "(W-L, ERA)" format or build from W/L
  let record: string | null = null;
  if (probable.record) {
    const m = probable.record.match(/\(?([\d-]+)/);
    record = m ? m[1] : null;
  } else if (statMap['W'] && statMap['L']) {
    record = `${statMap['W']}-${statMap['L']}`;
  }

  const throwsRaw = probable.athlete?.throws;
  const throwsAbbr = typeof throwsRaw === 'string'
    ? throwsRaw
    : (throwsRaw as { abbreviation?: string } | undefined)?.abbreviation ?? null;

  return {
    record,
    throws: throwsAbbr,
    ERA: statMap['ERA'] ?? null,
    WHIP: statMap['WHIP'] ?? null,
    IP: ipStr,
    K: statMap['K'] ?? null,
    BB: statMap['BB'] ?? null,
    H: statMap['H'] ?? null,
    HR: statMap['HR'] ?? null,
    W: statMap['W'] ?? null,
    L: statMap['L'] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches venue image + rich probable pitcher stats from the ESPN summary API.
 * Never throws — returns null fields on any error.
 */
export async function fetchEspnGameSummary(
  espnEventId: string,
  sport: SportConfig,
  awayTeam: string,
  homeTeam: string,
): Promise<EspnGameSummary> {
  const url = `http://site.api.espn.com/apis/site/v2/sports/${sport.espnSport}/${sport.espnLeague}/summary`;
  const fallbackVenue: EspnVenueImage = {
    imageUrl: null,
    imageAlt: `${awayTeam} at ${homeTeam}`,
    imageCredit: 'ESPN',
  };

  let data: unknown;
  try {
    const response = await axios.get(url, {
      params: { event: espnEventId },
      timeout: 15_000,
    });
    data = response.data;
  } catch (err) {
    console.warn(`[espn-client] Failed to fetch summary for event ${espnEventId}:`, err);
    return {
      venueImage: fallbackVenue,
      venueName: null,
      venueCity: null,
      venueCountry: null,
      broadcasts: [],
      homePitcherStats: null,
      awayPitcherStats: null,
    };
  }

  const parsed = SummaryResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[espn-client] Unexpected summary shape for event ${espnEventId}:`, parsed.error.issues);
    return {
      venueImage: fallbackVenue,
      venueName: null,
      venueCity: null,
      venueCountry: null,
      broadcasts: [],
      homePitcherStats: null,
      awayPitcherStats: null,
    };
  }

  // Venue image + location
  const venue = parsed.data.gameInfo?.venue;
  const imageUrl = venue?.images?.[0]?.href ?? null;
  const venueName = venue?.fullName ?? null;
  const venueCity = venue?.address?.city ?? null;
  const venueCountry = venue?.address?.country ?? venue?.address?.state ?? null;
  const venueImage: EspnVenueImage = {
    imageUrl,
    imageAlt: venueName
      ? `${venueName} — ${awayTeam} at ${homeTeam}`
      : `${awayTeam} at ${homeTeam}`,
    imageCredit: 'ESPN',
  };

  const summaryBroadcasts = (parsed.data.broadcasts ?? [])
    .map((b) => b.media?.shortName ?? b.media?.name)
    .filter((n): n is string => Boolean(n?.trim()))
    .map((n) => n.trim());

  // Pitcher stats from header
  const competitors = parsed.data.header?.competitions?.[0]?.competitors ?? [];
  const homeComp = competitors.find((c) => c.homeAway === 'home');
  const awayComp = competitors.find((c) => c.homeAway === 'away');

  return {
    venueImage,
    venueName,
    venueCity,
    venueCountry,
    broadcasts: [...new Set(summaryBroadcasts)],
    homePitcherStats: extractRichPitcherStats(homeComp?.probables?.[0]),
    awayPitcherStats: extractRichPitcherStats(awayComp?.probables?.[0]),
  };
}

/** @deprecated Use fetchEspnGameSummary instead */
export async function fetchEspnVenueImage(
  espnEventId: string,
  sport: SportConfig,
  awayTeam: string,
  homeTeam: string,
): Promise<EspnVenueImage> {
  const { venueImage } = await fetchEspnGameSummary(espnEventId, sport, awayTeam, homeTeam);
  return venueImage;
}

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
