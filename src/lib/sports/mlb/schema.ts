import { z } from 'zod';

export const MlbSportDataSchema = z.object({
  homePitcher: z.string().nullable().optional(),
  awayPitcher: z.string().nullable().optional(),
  homePitcherStats: z.record(z.string(), z.unknown()).nullable().optional(),
  awayPitcherStats: z.record(z.string(), z.unknown()).nullable().optional(),
  broadcasts: z.array(z.string()).optional(),
  venueName: z.string().nullable().optional(),
  venueCity: z.string().nullable().optional(),
  venueCountry: z.string().nullable().optional(),
});

export type MlbSportData = z.infer<typeof MlbSportDataSchema>;

export function parseMlbSportData(raw: unknown): MlbSportData {
  const parsed = MlbSportDataSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}
