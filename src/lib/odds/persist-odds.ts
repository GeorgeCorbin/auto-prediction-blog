import type { Game } from '@prisma/client';
import { filterGamesForSport } from '@/lib/games/game-day';
import {
  getOddsRefreshIntervalMs,
  isOddsApiEnabled,
} from '@/lib/feature-flags';
import type { SportConfig } from '@/lib/sports/config';
import { prisma } from '@/lib/db';
import { oddsProvider } from '@/lib/odds';
import type { GameOdds } from '@/lib/odds/provider';
import {
  markOddsRefreshed,
  minutesSinceOddsRefresh,
  shouldRefreshOdds,
} from '@/lib/odds/refresh-cache';

export interface GameOddsInput {
  espnEventId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: Date;
}

export interface FetchOddsOptions {
  /** Bypass the refresh throttle (manual refresh-odds script). */
  force?: boolean;
}

function gameOddsFromRow(game: Game): GameOdds {
  return {
    homeMoneyline: game.moneylineHome,
    awayMoneyline: game.moneylineAway,
    moneylineDraw: game.moneylineDraw,
    spreadHome: game.spreadHome,
    spreadAway: game.spreadAway,
    spreadHomePrice: game.spreadHomePrice,
    spreadAwayPrice: game.spreadAwayPrice,
    total: game.total,
    overPrice: game.overPrice,
    underPrice: game.underPrice,
    favoredTeam: null,
  };
}

async function loadPersistedOddsForGames(
  games: GameOddsInput[],
): Promise<Map<string, GameOdds>> {
  if (games.length === 0) return new Map();

  const rows = await prisma.game.findMany({
    where: { espnEventId: { in: games.map((g) => g.espnEventId) } },
  });
  const byEspnId = new Map(rows.map((row) => [row.espnEventId, row]));

  const result = new Map<string, GameOdds>();
  for (const game of games) {
    const row = byEspnId.get(game.espnEventId);
    if (!row) continue;
    result.set(game.espnEventId, gameOddsFromRow(row));
  }
  return result;
}

/** Fetches odds from the provider and writes matched lines onto Game rows. */
export async function fetchAndPersistOddsForGames(
  games: GameOddsInput[],
  sportOddsKey: string,
  options: FetchOddsOptions = {},
): Promise<Map<string, GameOdds>> {
  if (games.length === 0) return new Map();
  if (!isOddsApiEnabled()) return new Map();

  const intervalMs = getOddsRefreshIntervalMs();
  if (!options.force && !shouldRefreshOdds(sportOddsKey, intervalMs)) {
    const minutesAgo = minutesSinceOddsRefresh(sportOddsKey);
    console.log(
      `[odds] Using stored lines for ${sportOddsKey} — API refreshed ${minutesAgo ?? 0}m ago (interval ${intervalMs / 60_000}m)`,
    );
    return loadPersistedOddsForGames(games);
  }

  const oddsMap = await oddsProvider.getOddsForGames(games, sportOddsKey);
  markOddsRefreshed(sportOddsKey);

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

export interface OddsRefreshResult {
  matched: number;
  total: number;
  apiCalled: boolean;
}

/**
 * One Odds API request per sport — refreshes every upcoming SCHEDULED/READY game
 * in the publishing window. Called from scan-games on the hourly cadence.
 */
export async function refreshUpcomingOddsForSport(
  sport: SportConfig,
  now = new Date(),
  options: FetchOddsOptions = {},
): Promise<OddsRefreshResult> {
  if (!isOddsApiEnabled()) {
    return { matched: 0, total: 0, apiCalled: false };
  }

  const games = await prisma.game.findMany({
    where: {
      sport: sport.key,
      status: { in: ['SCHEDULED', 'READY'] },
      scheduledAt: { gt: now },
    },
  });

  const inWindow = filterGamesForSport(games, sport, now);
  if (inWindow.length === 0) {
    return { matched: 0, total: 0, apiCalled: false };
  }

  const intervalMs = getOddsRefreshIntervalMs();
  const willCallApi =
    options.force || shouldRefreshOdds(sport.oddsApiKey, intervalMs, now.getTime());

  const oddsMap = await fetchAndPersistOddsForGames(
    inWindow.map((g) => ({
      espnEventId: g.espnEventId,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      scheduledAt: g.scheduledAt,
    })),
    sport.oddsApiKey,
    options,
  );

  return {
    matched: oddsMap.size,
    total: inWindow.length,
    apiCalled: willCallApi,
  };
}
