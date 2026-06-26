import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { prisma } from '@/lib/db';
import { getActiveSports } from '@/lib/sports/config';
import { oddsProvider } from '@/lib/odds';

const OUTPUT_DIR = join(process.cwd(), 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'odds-api-dump.json');

interface RawOddsGame {
  id: string;
  sport_key?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    key: string;
    title?: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price?: number; point?: number }>;
    }>;
  }>;
}

async function fetchRawOdds(sportOddsKey: string): Promise<RawOddsGame[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    throw new Error('THE_ODDS_API_KEY is not set in .env');
  }

  const response = await axios.get(
    `https://api.the-odds-api.com/v4/sports/${sportOddsKey}/odds`,
    {
      params: {
        apiKey,
        regions: 'us',
        markets: 'h2h,spreads,totals',
        oddsFormat: 'american',
        dateFormat: 'iso',
      },
      timeout: 30_000,
    },
  );

  return response.data as RawOddsGame[];
}

export async function dumpOdds(): Promise<string> {
  const sports = getActiveSports();
  const now = new Date();

  const dbGames = await prisma.game.findMany({
    where: {
      sport: { in: sports.map((s) => s.key) },
      scheduledAt: { gte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      espnEventId: true,
      sport: true,
      homeTeam: true,
      awayTeam: true,
      scheduledAt: true,
      status: true,
      moneylineHome: true,
      moneylineAway: true,
      moneylineDraw: true,
      spreadHome: true,
      spreadAway: true,
      spreadHomePrice: true,
      spreadAwayPrice: true,
      total: true,
      overPrice: true,
      underPrice: true,
    },
  });

  const dump: Record<string, unknown> = {
    generatedAt: now.toISOString(),
    note:
      'rawApiResponse is the full The Odds API payload. extractedForDbGames is what our matcher stores per ESPN game (first bookmaker only). storedOnGame is what is currently in the database.',
    sports: [],
  };

  for (const sport of sports) {
    console.log(`[dump-odds] Fetching raw odds for ${sport.label} (${sport.oddsApiKey})...`);
    const rawApiResponse = await fetchRawOdds(sport.oddsApiKey);

    const sportDbGames = dbGames.filter((g) => g.sport === sport.key);
    const extractedForDbGames =
      sportDbGames.length > 0
        ? Object.fromEntries(
            (
              await oddsProvider.getOddsForGames(
                sportDbGames.map((g) => ({
                  espnEventId: g.espnEventId,
                  homeTeam: g.homeTeam,
                  awayTeam: g.awayTeam,
                  scheduledAt: g.scheduledAt,
                })),
                sport.oddsApiKey,
              )
            ).entries(),
          )
        : {};

    (dump.sports as unknown[]).push({
      sportKey: sport.key,
      sportLabel: sport.label,
      oddsApiKey: sport.oddsApiKey,
      rawGameCount: rawApiResponse.length,
      rawApiResponse,
      dbGameCount: sportDbGames.length,
      dbGames: sportDbGames,
      extractedForDbGames,
    });
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(dump, null, 2), 'utf8');

  console.log(`[dump-odds] Wrote ${OUTPUT_FILE}`);
  return OUTPUT_FILE;
}

if (require.main === module) {
  dumpOdds()
    .then((path) => {
      console.log(`[dump-odds] Done → ${path}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
