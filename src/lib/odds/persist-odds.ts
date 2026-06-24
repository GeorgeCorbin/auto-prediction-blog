import { prisma } from '@/lib/db';
import { isOddsApiEnabled } from '@/lib/feature-flags';
import { oddsProvider } from '@/lib/odds';
import type { GameOdds } from '@/lib/odds/provider';

export interface GameOddsInput {
  espnEventId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: Date;
}

/** Fetches odds from the provider and writes matched lines onto Game rows. */
export async function fetchAndPersistOddsForGames(
  games: GameOddsInput[],
  sportOddsKey: string,
): Promise<Map<string, GameOdds>> {
  if (games.length === 0) return new Map();
  if (!isOddsApiEnabled()) return new Map();

  const oddsMap = await oddsProvider.getOddsForGames(games, sportOddsKey);

  for (const [espnEventId, odds] of oddsMap.entries()) {
    await prisma.game.update({
      where: { espnEventId },
      data: {
        moneylineHome: odds.homeMoneyline,
        moneylineAway: odds.awayMoneyline,
        moneylineDraw: odds.moneylineDraw,
        spreadHome: odds.spreadHome,
        spreadAway: odds.spreadAway,
        spreadHomePrice: odds.spreadHomePrice,
        spreadAwayPrice: odds.spreadAwayPrice,
        total: odds.total,
        overPrice: odds.overPrice,
        underPrice: odds.underPrice,
      },
    });
  }

  return oddsMap;
}
