import type { Prisma } from '@prisma/client';
import type { Game } from '@prisma/client';
import { fetchEspnScoreboard } from '@/lib/espn/client';
import type { EspnGame, EspnGameSummary } from '@/lib/espn/client';
import {
  getEspnDateRange,
  getScanLookaheadDays,
} from '@/lib/games/game-day';
import { prisma } from '@/lib/db';
import type { SportConfig } from '@/lib/sports/config';
import { safeJsonRecord } from '@/lib/sports/helpers';
import { isWithinMlbArticleLeadWindow } from './publish-schedule';
import { parseMlbSportData } from './schema';
import { hasUsableOdds, resolveMlbPick } from './picks';
import { buildMlbMetaDescription, buildMlbPrompt, type MlbGameContext } from './prompts';
import type { SportModule, SportPickResult } from '@/lib/sports/types';
import {
  espnAbbrToMlbTeamId,
  fetchMlbTeamStats,
  fetchMlbStandingsForTeam,
  fetchMlbTeamRecentRecord,
  fetchMlbTeamLeaders,
  fetchMlbInjuredPlayers,
} from '@/lib/mlb-statsapi/client';

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

function normalizeRichStats(
  s: {
    avg?: string | null;
    obp?: string | null;
    slg?: string | null;
    ops?: string | null;
    runsPerGame?: string | null;
    homeRuns?: number | null;
    era?: string | null;
    whip?: string | null;
    kPer9?: string | null;
    oppAvg?: string | null;
  } | null | undefined,
): {
  avg: string | null;
  obp: string | null;
  slg: string | null;
  ops: string | null;
  runsPerGame: string | null;
  homeRuns: number | null;
  era: string | null;
  whip: string | null;
  kPer9: string | null;
  oppAvg: string | null;
} | null {
  if (!s) return null;
  return {
    avg: s.avg ?? null,
    obp: s.obp ?? null,
    slg: s.slg ?? null,
    ops: s.ops ?? null,
    runsPerGame: s.runsPerGame ?? null,
    homeRuns: s.homeRuns ?? null,
    era: s.era ?? null,
    whip: s.whip ?? null,
    kPer9: s.kPer9 ?? null,
    oppAvg: s.oppAvg ?? null,
  };
}

function mergePitcherStats(
  current: Record<string, unknown> | null | undefined,
  rich: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(current ?? {}), ...rich };
}

export async function scanMlbGameDay(sport: SportConfig, _todayDateStr: string): Promise<void> {
  const now = new Date();
  const lookaheadDays = getScanLookaheadDays(sport);
  const dateRange = getEspnDateRange(lookaheadDays, now);

  console.log(
    `\n[scan-games] Fetching ESPN scoreboard for ${sport.label} (${dateRange.join(', ')}, Eastern)`,
  );

  const games = await fetchEspnScoreboard(sport, dateRange);
  const windowGames = games.filter((g) =>
    isWithinMlbArticleLeadWindow(g.scheduledAt, now),
  );

  console.log(
    `[scan-games] ESPN returned ${games.length} ${sport.label} games, ${windowGames.length} within 24-hour publishing window`,
  );

  if (games.length === 0) return;

  const existingStatuses = await prisma.game.findMany({
    where: { espnEventId: { in: games.map((g) => g.espnEventId) } },
    select: { espnEventId: true, status: true },
  });
  const statusByEventId = new Map(existingStatuses.map((r) => [r.espnEventId, r.status]));

  for (const g of games) {
    const existingStatus = statusByEventId.get(g.espnEventId);
    const isPublished = existingStatus === 'PUBLISHED';

    const espnSportData = buildMlbSportDataFromEspn(g);

    let sportData: Prisma.InputJsonValue;

    if (isPublished) {
      sportData = espnSportData;
    } else {
      const season = g.scheduledAt.getFullYear();
      const gameDate = g.scheduledAt.toISOString().slice(0, 10);
      const homeTeamId = espnAbbrToMlbTeamId(g.homeTeamAbbr);
      const awayTeamId = espnAbbrToMlbTeamId(g.awayTeamAbbr);

      const [
        homeRichStats, awayRichStats,
        homeStandings, awayStandings,
        homeRecent, awayRecent,
        homeLeaders, awayLeaders,
        homeIL, awayIL,
      ] = await Promise.all([
        homeTeamId ? fetchMlbTeamStats(homeTeamId, season) : Promise.resolve(null),
        awayTeamId ? fetchMlbTeamStats(awayTeamId, season) : Promise.resolve(null),
        homeTeamId ? fetchMlbStandingsForTeam(homeTeamId, season) : Promise.resolve(null),
        awayTeamId ? fetchMlbStandingsForTeam(awayTeamId, season) : Promise.resolve(null),
        homeTeamId ? fetchMlbTeamRecentRecord(homeTeamId, gameDate) : Promise.resolve(null),
        awayTeamId ? fetchMlbTeamRecentRecord(awayTeamId, gameDate) : Promise.resolve(null),
        homeTeamId ? fetchMlbTeamLeaders(homeTeamId, season) : Promise.resolve(null),
        awayTeamId ? fetchMlbTeamLeaders(awayTeamId, season) : Promise.resolve(null),
        homeTeamId ? fetchMlbInjuredPlayers(homeTeamId, season) : Promise.resolve([]),
        awayTeamId ? fetchMlbInjuredPlayers(awayTeamId, season) : Promise.resolve([]),
      ]);

      sportData = {
        ...(espnSportData as Record<string, unknown>),
        homeRichStats: homeRichStats ? (homeRichStats as unknown as Prisma.InputJsonObject) : undefined,
        awayRichStats: awayRichStats ? (awayRichStats as unknown as Prisma.InputJsonObject) : undefined,
        homeStandings: homeStandings
          ? {
              wins: homeStandings.wins,
              losses: homeStandings.losses,
              winPct: homeStandings.winPct,
              gamesBack: homeStandings.gamesBack,
              wildCardBack: homeStandings.wildCardBack,
              streak: homeStandings.streak,
              last10: homeStandings.last10,
            }
          : undefined,
        awayStandings: awayStandings
          ? {
              wins: awayStandings.wins,
              losses: awayStandings.losses,
              winPct: awayStandings.winPct,
              gamesBack: awayStandings.gamesBack,
              wildCardBack: awayStandings.wildCardBack,
              streak: awayStandings.streak,
              last10: awayStandings.last10,
            }
          : undefined,
        homeLast10: homeRecent?.last10 ?? homeStandings?.last10 ?? undefined,
        awayLast10: awayRecent?.last10 ?? awayStandings?.last10 ?? undefined,
        homeStreak: homeRecent?.streak ?? homeStandings?.streak ?? undefined,
        awayStreak: awayRecent?.streak ?? awayStandings?.streak ?? undefined,
        homeLeaders: homeLeaders ? (homeLeaders as unknown as Prisma.InputJsonObject) : undefined,
        awayLeaders: awayLeaders ? (awayLeaders as unknown as Prisma.InputJsonObject) : undefined,
        homeIL: homeIL && homeIL.length > 0 ? (homeIL as unknown as Prisma.InputJsonArray) : undefined,
        awayIL: awayIL && awayIL.length > 0 ? (awayIL as unknown as Prisma.InputJsonArray) : undefined,
      };
    }

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
      update: isPublished
        ? {}
        : {
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
    if (!isMlbReady(g, now)) continue;

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

export function isMlbReady(espnGame: EspnGame, now = new Date()): boolean {
  const hasPitchers = espnGame.homePitcher !== null && espnGame.awayPitcher !== null;
  return (
    hasPitchers &&
    espnGame.scheduledAt > now &&
    isWithinMlbArticleLeadWindow(espnGame.scheduledAt, now)
  );
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

export function mlbGameHasUsableOdds(game: Game): boolean {
  return hasUsableOdds(buildPickInput(game));
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
    homeRichStats: normalizeRichStats(mlbData.homeRichStats),
    awayRichStats: normalizeRichStats(mlbData.awayRichStats),
    homeStandings: mlbData.homeStandings ?? null,
    awayStandings: mlbData.awayStandings ?? null,
    homeLast10: mlbData.homeLast10 ?? null,
    awayLast10: mlbData.awayLast10 ?? null,
    homeStreak: mlbData.homeStreak ?? null,
    awayStreak: mlbData.awayStreak ?? null,
    homeLeaders: mlbData.homeLeaders ?? null,
    awayLeaders: mlbData.awayLeaders ?? null,
    homeIL: mlbData.homeIL ?? null,
    awayIL: mlbData.awayIL ?? null,
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
  gameHasUsableOdds: mlbGameHasUsableOdds,
  resolvePick: resolveMlbGamePick,
  buildPromptContext: buildMlbPromptContext,
  buildPrompt: buildMlbPrompt,
  buildMetaDescription: buildMlbMetaDescription,
  enrichFromSummary: enrichMlbFromSummary,
};
