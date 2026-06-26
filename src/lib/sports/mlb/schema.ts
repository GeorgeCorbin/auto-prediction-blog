import { z } from 'zod';

const MlbRichTeamStatsSchema = z.object({
  avg: z.string().nullable().optional(),
  obp: z.string().nullable().optional(),
  slg: z.string().nullable().optional(),
  ops: z.string().nullable().optional(),
  runsPerGame: z.string().nullable().optional(),
  homeRuns: z.number().nullable().optional(),
  era: z.string().nullable().optional(),
  whip: z.string().nullable().optional(),
  kPer9: z.string().nullable().optional(),
  oppAvg: z.string().nullable().optional(),
});

const MlbStandingsEntrySchema = z.object({
  wins: z.number().optional(),
  losses: z.number().optional(),
  winPct: z.string().optional(),
  gamesBack: z.string().optional(),
  wildCardBack: z.string().optional(),
  streak: z.string().optional(),
  last10: z.string().optional(),
});

const MlbPlayerLeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

const MlbTeamLeadersSchema = z.object({
  battingAvg: z.array(MlbPlayerLeaderSchema).optional(),
  homeRuns: z.array(MlbPlayerLeaderSchema).optional(),
  rbi: z.array(MlbPlayerLeaderSchema).optional(),
  ops: z.array(MlbPlayerLeaderSchema).optional(),
  era: z.array(MlbPlayerLeaderSchema).optional(),
  strikeouts: z.array(MlbPlayerLeaderSchema).optional(),
});

const MlbILPlayerSchema = z.object({
  name: z.string(),
  ilType: z.string(),
});

export type MlbTeamLeadersData = z.infer<typeof MlbTeamLeadersSchema>;
export type MlbILPlayerData = z.infer<typeof MlbILPlayerSchema>;

export const MlbSportDataSchema = z.object({
  homePitcher: z.string().nullable().optional(),
  awayPitcher: z.string().nullable().optional(),
  homePitcherStats: z.record(z.string(), z.unknown()).nullable().optional(),
  awayPitcherStats: z.record(z.string(), z.unknown()).nullable().optional(),
  broadcasts: z.array(z.string()).optional(),
  venueName: z.string().nullable().optional(),
  venueCity: z.string().nullable().optional(),
  venueCountry: z.string().nullable().optional(),
  homeRichStats: MlbRichTeamStatsSchema.nullable().optional(),
  awayRichStats: MlbRichTeamStatsSchema.nullable().optional(),
  homeStandings: MlbStandingsEntrySchema.nullable().optional(),
  awayStandings: MlbStandingsEntrySchema.nullable().optional(),
  homeLast10: z.string().nullable().optional(),
  awayLast10: z.string().nullable().optional(),
  homeStreak: z.string().nullable().optional(),
  awayStreak: z.string().nullable().optional(),
  homeLeaders: MlbTeamLeadersSchema.nullable().optional(),
  awayLeaders: MlbTeamLeadersSchema.nullable().optional(),
  homeIL: z.array(MlbILPlayerSchema).nullable().optional(),
  awayIL: z.array(MlbILPlayerSchema).nullable().optional(),
});

export type MlbSportData = z.infer<typeof MlbSportDataSchema>;

export function parseMlbSportData(raw: unknown): MlbSportData {
  const parsed = MlbSportDataSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}
