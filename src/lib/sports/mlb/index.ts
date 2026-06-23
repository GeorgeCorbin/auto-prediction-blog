import type { Prisma } from '@prisma/client';
import type { Game } from '@prisma/client';
import { fetchEspnScoreboard } from '@/lib/espn/client';
import type { EspnGame, EspnGameSummary } from '@/lib/espn/client';
import { filterGameDayGames } from '@/lib/games/game-day';
import { prisma } from '@/lib/db';
import type { SportConfig } from '@/lib/sports/config';
import { safeJsonRecord } from '@/lib/sports/helpers';
import { parseMlbSportData } from './schema';
import { resolveMlbPick } from './picks';
import { buildMlbMetaDescription, buildMlbPrompt, type MlbGameContext } from './prompts';
import type { SportModule, SportPickResult } from '@/lib/sports/types';

function buildMlbSportDataFromEspn(g: EspnGame): Prisma.InputJsonValue {
  return {
    homePitcher: g.homePitcher,
    awayPitcher: g.awayPitcher,
    homePitcherStats: g.homePitcherStats ?? undefined,
    awayPitcherStats: g.awayPitcherStats ?? undefined,
    broadcasts: g.broadcasts.length > 0 ? g.broadcasts : undefined,
    venueName: g.venueName,
    venueCity: g.venueCity,
    venueCountry: g.venueCountry,
  };
}

function mergePitcherStats(
  current: Record<string, unknown> | null | undefined,
  rich: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(current ?? {}), ...rich };
}

export async function scanMlbGameDay(sport: SportConfig, todayDateStr: string): Promise<void> {
  console.log(
    `\n[scan-games] Fetching ESPN scoreboard for ${sport.label} (${todayDateStr}, Eastern)`,
  );

  const games = await fetchEspnScoreboard(sport, [todayDateStr]);
  const gameDayGames = filterGameDayGames(games);

  console.log(
    `[scan-games] ESPN returned ${games.length} ${sport.label} games, ${gameDayGames.length} on today's slate`,
  );

  if (gameDayGames.length === 0) return;

  for (const g of gameDayGames) {
    const sportData = buildMlbSportDataFromEspn(g);
    await prisma.game.upsert({
      where: { espnEventId: g.espnEventId },
      create: {
        espnEventId: g.espnEventId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        homeTeamAbbr: g.homeTeamAbbr,
        awayTeamAbbr: g.awayTeamAbbr,
        scheduledAt: g.scheduledAt,
        sport: sport.key,
        status: 'SCHEDULED',
        sportData,
        homeStats: g.homeStats,
        awayStats: g.awayStats,
      },
      update: {
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        homeTeamAbbr: g.homeTeamAbbr,
        awayTeamAbbr: g.awayTeamAbbr,
        scheduledAt: g.scheduledAt,
        sportData,
        homeStats: g.homeStats,
        awayStats: g.awayStats,
      },
    });
  }

  let readyCount = 0;

  for (const g of gameDayGames) {
    if (!isMlbReady(g)) continue;

    const updated = await prisma.game.updateMany({
      where: {
        espnEventId: g.espnEventId,
        status: 'SCHEDULED',
      },
      data: { status: 'READY' },
    });

    if (updated.count > 0) readyCount++;
  }

  console.log(
    `[scan-games] Processed ${gameDayGames.length} ${sport.label} games, ${readyCount} marked READY`,
  );
}

export function isMlbReady(espnGame: EspnGame): boolean {
  const hasPitchers = espnGame.homePitcher !== null && espnGame.awayPitcher !== null;
  return hasPitchers && espnGame.scheduledAt > new Date();
}

function buildPickInput(game: Game) {
  const homeStats = safeJsonRecord(game.homeStats);
  const awayStats = safeJsonRecord(game.awayStats);
  const mlbData = parseMlbSportData(game.sportData);
  const homePitcherStats = safeJsonRecord(mlbData.homePitcherStats);
  const awayPitcherStats = safeJsonRecord(mlbData.awayPitcherStats);

  return {
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeRecord: homeStats.record ?? '',
    awayRecord: awayStats.record ?? '',
    homeStats,
    awayStats,
    homePitcherStats,
    awayPitcherStats,
    spreadHome: game.spreadHome,
    spreadAway: game.spreadAway,
    spreadHomePrice: game.spreadHomePrice,
    spreadAwayPrice: game.spreadAwayPrice,
    moneylineHome: game.moneylineHome,
    moneylineAway: game.moneylineAway,
    total: game.total,
    overPrice: game.overPrice,
    underPrice: game.underPrice,
  };
}

export function resolveMlbGamePick(
  game: Game,
  options: { allowStatsFallback: boolean },
): SportPickResult | null {
  const pick = resolveMlbPick(buildPickInput(game), options);
  if (!pick) return null;
  return pick;
}

export function buildMlbPromptContext(game: Game, pick: SportPickResult): MlbGameContext {
  const homeStats = safeJsonRecord(game.homeStats);
  const awayStats = safeJsonRecord(game.awayStats);
  const mlbData = parseMlbSportData(game.sportData);
  const homePitcherStats = safeJsonRecord(mlbData.homePitcherStats);
  const awayPitcherStats = safeJsonRecord(mlbData.awayPitcherStats);

  return {
    variationSeed: game.espnEventId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeTeamAbbr: game.homeTeamAbbr,
    awayTeamAbbr: game.awayTeamAbbr,
    scheduledAt: game.scheduledAt,
    homeRecord: homeStats.record ?? '',
    awayRecord: awayStats.record ?? '',
    homeStats,
    awayStats,
    homePitcher: mlbData.homePitcher ?? 'TBD',
    awayPitcher: mlbData.awayPitcher ?? 'TBD',
    homePitcherStats,
    awayPitcherStats,
    homeMoneyline: game.moneylineHome ?? 0,
    awayMoneyline: game.moneylineAway ?? 0,
    spreadHome: game.spreadHome ?? 0,
    spreadAway: game.spreadAway ?? 0,
    total: game.total ?? 0,
    favoredTeam: pick.favoredTeam === 'draw' ? 'home' : pick.favoredTeam,
    hasOdds: pick.hasOdds,
    pickLabel: pick.pickLabel,
  };
}

export function enrichMlbFromSummary(
  game: Game,
  summary: EspnGameSummary,
): { sportData: Record<string, unknown> } | null {
  const { homePitcherStats: richHome, awayPitcherStats: richAway } = summary;
  const current = parseMlbSportData(game.sportData);
  const sportData: Record<string, unknown> = { ...current };
  let changed = false;

  if (richHome) {
    sportData.homePitcherStats = mergePitcherStats(
      sportData.homePitcherStats as Record<string, unknown> | undefined,
      richHome as unknown as Record<string, unknown>,
    );
    changed = true;
  }
  if (richAway) {
    sportData.awayPitcherStats = mergePitcherStats(
      sportData.awayPitcherStats as Record<string, unknown> | undefined,
      richAway as unknown as Record<string, unknown>,
    );
    changed = true;
  }

  if (!current.venueName && summary.venueName) {
    sportData.venueName = summary.venueName;
    changed = true;
  }
  if (!current.venueCity && summary.venueCity) {
    sportData.venueCity = summary.venueCity;
    changed = true;
  }
  if (!current.venueCountry && summary.venueCountry) {
    sportData.venueCountry = summary.venueCountry;
    changed = true;
  }

  const mergedBroadcasts = [
    ...new Set([...(current.broadcasts ?? []), ...summary.broadcasts]),
  ];
  if (mergedBroadcasts.length > (current.broadcasts?.length ?? 0)) {
    sportData.broadcasts = mergedBroadcasts;
    changed = true;
  }

  return changed ? { sportData } : null;
}

export const mlbModule: SportModule<MlbGameContext> = {
  key: 'mlb',
  scanGameDay: scanMlbGameDay,
  isReady: isMlbReady,
  resolvePick: resolveMlbGamePick,
  buildPromptContext: buildMlbPromptContext,
  buildPrompt: buildMlbPrompt,
  buildMetaDescription: buildMlbMetaDescription,
  enrichFromSummary: enrichMlbFromSummary,
};
