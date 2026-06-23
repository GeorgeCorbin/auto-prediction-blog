import { z } from 'zod';

export const WorldCupSportDataSchema = z.object({
  formHome: z.string().nullable().optional(),
  formAway: z.string().nullable().optional(),
  recordHome: z.string().nullable().optional(),
  recordAway: z.string().nullable().optional(),
  groupName: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  gameNote: z.string().nullable().optional(),
  broadcasts: z.array(z.string()).optional(),
  venueName: z.string().nullable().optional(),
  venueCity: z.string().nullable().optional(),
  venueCountry: z.string().nullable().optional(),
});

export type WorldCupSportData = z.infer<typeof WorldCupSportDataSchema>;

export function parseWorldCupSportData(raw: unknown): WorldCupSportData {
  const parsed = WorldCupSportDataSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function formatWatchString(broadcasts: string[] | undefined | null): string {
  if (!broadcasts || broadcasts.length === 0) return 'N/A';
  return broadcasts.join(', ');
}

export function formatVenueString(data: WorldCupSportData): string {
  const parts = [data.venueName, data.venueCity, data.venueCountry].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
}
