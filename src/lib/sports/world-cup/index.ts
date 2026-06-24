import type { Game, Prisma } from '@prisma/client';
import { fetchEspnScoreboard } from '@/lib/espn/client';
import type { EspnGame, EspnGameSummary } from '@/lib/espn/client';
import {
  getEspnDateRange,
  getScanLookaheadDays,
  isWithinArticleLeadWindow,
  getArticleLeadDays,
} from '@/lib/games/game-day';
import { prisma } from '@/lib/db';
import type { SportConfig } from '@/lib/sports/config';
import { getSportConfig, isSportInSeason } from '@/lib/sports/config';
import { safeJsonRecord } from '@/lib/sports/helpers';
import type { SportModule, SportPickResult } from '@/lib/sports/types';
import {
  formatVenueString,
  formatWatchString,
  parseWorldCupSportData,
} from './schema';
import { hasUsableOdds, resolveWorldCupPick } from './picks';
import {
  buildWorldCupMetaDescription,
  buildWorldCupPrompt,
  type WorldCupGameContext,
} from './prompts';

function mergeBroadcasts(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b].filter(Boolean))];
}

function buildWorldCupSportDataFromEspn(g: EspnGame): Prisma.InputJsonValue {
  return {
    formHome: g.homeForm ?? null,
    formAway: g.awayForm ?? null,
    recordHome: g.homeRecord ?? null,
    recordAway: g.awayRecord ?? null,
    groupName: g.groupName ?? null,
    stage: g.stage ?? 'Group Stage',
    gameNote: g.gameNote ?? null,
    broadcasts: g.broadcasts,
    venueName: g.venueName,
    venueCity: g.venueCity,
    venueCountry: g.venueCountry,
  };
}

export async function scanWorldCupGameDay(
  sport: SportConfig,
  _todayDateStr: string,
): Promise<void> {
  if (!isSportInSeason(sport)) {
    console.log(`[scan-games] Skipping ${sport.label} — outside tournament window`);
    return;
  }

  const now = new Date();
  const lookaheadDays = getScanLookaheadDays(sport);
  const dateRange = getEspnDateRange(lookaheadDays, now);

  console.log(
    `\n[scan-games] Fetching ESPN scoreboard for ${sport.label} (${dateRange.join(', ')}, Eastern)`,
  );

  const games = await fetchEspnScoreboard(sport, dateRange);
  const leadDays = getArticleLeadDays(sport);
  const windowGames = games.filter((g) =>
    isWithinArticleLeadWindow(g.scheduledAt, leadDays, now),
  );

  console.log(
    `[scan-games] ESPN returned ${games.length} ${sport.label} games, ${windowGames.length} within ${leadDays}-day publishing window`,
  );

  if (windowGames.length === 0) return;

  for (const g of windowGames) {
    const sportData = buildWorldCupSportDataFromEspn(g);
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

  for (const g of windowGames) {
    if (!isWorldCupReady(g, now, sport)) continue;

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
    `[scan-games] Processed ${windowGames.length} ${sport.label} games, ${readyCount} marked READY`,
  );
}

export function isWorldCupReady(espnGame: EspnGame, now: Date, sport: SportConfig): boolean {
  return isWithinArticleLeadWindow(espnGame.scheduledAt, getArticleLeadDays(sport), now);
}

function buildPickInput(game: Game) {
  const homeStats = safeJsonRecord(game.homeStats);
  const awayStats = safeJsonRecord(game.awayStats);
  const wcData = parseWorldCupSportData(game.sportData);

  return {
    seed: game.espnEventId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeRecord: wcData.recordHome ?? homeStats.record ?? '',
    awayRecord: wcData.recordAway ?? awayStats.record ?? '',
    homeStats,
    awayStats,
    formHome: wcData.formHome ?? '',
    formAway: wcData.formAway ?? '',
    moneylineHome: game.moneylineHome,
    moneylineAway: game.moneylineAway,
    moneylineDraw: game.moneylineDraw,
    total: game.total,
    overPrice: game.overPrice,
    underPrice: game.underPrice,
  };
}

export function worldCupGameHasUsableOdds(game: Game): boolean {
  return hasUsableOdds(buildPickInput(game));
}

export function resolveWorldCupGamePick(
  game: Game,
  options: { allowStatsFallback: boolean },
): SportPickResult | null {
  return resolveWorldCupPick(buildPickInput(game), options);
}

export function buildWorldCupPromptContext(
  game: Game,
  pick: SportPickResult,
): WorldCupGameContext {
  const homeStats = safeJsonRecord(game.homeStats);
  const awayStats = safeJsonRecord(game.awayStats);
  const wcData = parseWorldCupSportData(game.sportData);

  return {
    variationSeed: game.espnEventId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeTeamAbbr: game.homeTeamAbbr,
    awayTeamAbbr: game.awayTeamAbbr,
    scheduledAt: game.scheduledAt,
    homeRecord: wcData.recordHome ?? homeStats.record ?? '',
    awayRecord: wcData.recordAway ?? awayStats.record ?? '',
    homeStats,
    awayStats,
    formHome: wcData.formHome ?? '',
    formAway: wcData.formAway ?? '',
    groupName: wcData.groupName ?? '',
    stage: wcData.stage ?? 'Group Stage',
    gameNote: wcData.gameNote ?? '',
    venueName: wcData.venueName ?? '',
    venueCity: wcData.venueCity ?? '',
    venueCountry: wcData.venueCountry ?? '',
    watchString: formatWatchString(wcData.broadcasts),
    homeMoneyline: game.moneylineHome ?? 0,
    awayMoneyline: game.moneylineAway ?? 0,
    drawMoneyline: game.moneylineDraw ?? 0,
    total: game.total ?? 0,
    favoredTeam: pick.favoredTeam,
    hasOdds: pick.hasOdds,
    pickLabel: pick.pickLabel,
  };
}

export function enrichWorldCupFromSummary(
  game: Game,
  summary: EspnGameSummary,
): { sportData: Record<string, unknown> } | null {
  const current = parseWorldCupSportData(game.sportData);
  const broadcasts = mergeBroadcasts(current.broadcasts ?? [], summary.broadcasts);

  const sportData: Record<string, unknown> = {
    ...current,
    broadcasts: broadcasts.length > 0 ? broadcasts : current.broadcasts,
    venueName: current.venueName ?? summary.venueName,
    venueCity: current.venueCity ?? summary.venueCity,
    venueCountry: current.venueCountry ?? summary.venueCountry,
  };

  const changed =
    sportData.broadcasts !== current.broadcasts ||
    sportData.venueName !== current.venueName ||
    sportData.venueCity !== current.venueCity ||
    sportData.venueCountry !== current.venueCountry;

  return changed ? { sportData } : null;
}

export const worldCupModule: SportModule<WorldCupGameContext> = {
  key: 'world-cup',
  scanGameDay: scanWorldCupGameDay,
  isReady: (espnGame, now) => {
    const sport = getSportConfig('world-cup');
    return sport ? isWorldCupReady(espnGame, now, sport) : false;
  },
  gameHasUsableOdds: worldCupGameHasUsableOdds,
  resolvePick: resolveWorldCupGamePick,
  buildPromptContext: buildWorldCupPromptContext,
  buildPrompt: buildWorldCupPrompt,
  buildMetaDescription: buildWorldCupMetaDescription,
  enrichFromSummary: enrichWorldCupFromSummary,
};
