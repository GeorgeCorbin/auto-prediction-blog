import 'dotenv/config';
import { fetchEspnScoreboard } from '@/lib/espn/client';
import {
  filterGameDayGames,
  getTodayEspnDateStr,
  isGameDay,
} from '@/lib/games/game-day';
import { oddsProvider } from '@/lib/odds';
import { ENABLED_SPORTS } from '@/lib/sports/config';
import { prisma } from '@/lib/db';
import { isStatsPickWithoutOddsEnabled } from '@/lib/feature-flags';

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

export async function scanGames(): Promise<void> {
  const todayDateStr = getTodayEspnDateStr();

  // Demote games that were marked READY before their game day (legacy early scans)
  const earlyReady = await prisma.game.findMany({
    where: { status: 'READY' },
    select: { id: true, scheduledAt: true },
  });
  for (const g of earlyReady) {
    if (!isGameDay(g.scheduledAt)) {
      await prisma.game.update({ where: { id: g.id }, data: { status: 'SCHEDULED' } });
    }
  }

  for (const sport of ENABLED_SPORTS) {
    console.log(
      `\n[scan-games] Fetching ESPN scoreboard for ${sport.label} (${todayDateStr}, Eastern)`,
    );

    const games = await fetchEspnScoreboard(sport, [todayDateStr]);
    const gameDayGames = filterGameDayGames(games);

    console.log(
      `[scan-games] ESPN returned ${games.length} ${sport.label} games, ${gameDayGames.length} on today's slate`,
    );

    if (gameDayGames.length === 0) continue;

    // ------------------------------------------------------------------
    // Step 1: Upsert today's games (pitchers + team stats)
    // ------------------------------------------------------------------
    for (const g of gameDayGames) {
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
          homePitcher: g.homePitcher,
          awayPitcher: g.awayPitcher,
          homePitcherStats: g.homePitcherStats ?? undefined,
          awayPitcherStats: g.awayPitcherStats ?? undefined,
          homeStats: g.homeStats,
          awayStats: g.awayStats,
        },
        update: {
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          homeTeamAbbr: g.homeTeamAbbr,
          awayTeamAbbr: g.awayTeamAbbr,
          scheduledAt: g.scheduledAt,
          homePitcher: g.homePitcher,
          awayPitcher: g.awayPitcher,
          homePitcherStats: g.homePitcherStats ?? undefined,
          awayPitcherStats: g.awayPitcherStats ?? undefined,
          homeStats: g.homeStats,
          awayStats: g.awayStats,
        },
      });
    }

    // ------------------------------------------------------------------
    // Step 2: Fetch odds for today's games only
    // ------------------------------------------------------------------
    console.log(`[scan-games] Fetching odds for ${gameDayGames.length} ${sport.label} games`);

    const oddsMap = await oddsProvider.getOddsForGames(
      gameDayGames.map((g) => ({
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        scheduledAt: g.scheduledAt,
        espnEventId: g.espnEventId,
      })),
      sport.oddsApiKey,
    );

    console.log(`[scan-games] Odds matched for ${oddsMap.size} of ${gameDayGames.length} games`);

    // ------------------------------------------------------------------
    // Step 3: Update odds on each game record
    // ------------------------------------------------------------------
    for (const [espnEventId, odds] of oddsMap.entries()) {
      await prisma.game.update({
        where: { espnEventId },
        data: {
          moneylineHome: odds.homeMoneyline,
          moneylineAway: odds.awayMoneyline,
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

    // ------------------------------------------------------------------
    // Step 4: Mark eligible games as READY
    // ------------------------------------------------------------------
    const now = new Date();
    let readyCount = 0;
    const allowStatsFallback = isStatsPickWithoutOddsEnabled();

    for (const g of gameDayGames) {
      const odds = oddsMap.get(g.espnEventId);

      const hasOdds = odds?.homeMoneyline !== null && odds?.homeMoneyline !== undefined;
      const hasPitchers = g.homePitcher !== null && g.awayPitcher !== null;
      const isFuture = g.scheduledAt > now;

      if (!hasPitchers || !isFuture) continue;
      if (!hasOdds && !allowStatsFallback) continue;

      // Only promote SCHEDULED games — never re-process PUBLISHED ones
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

  console.log('\n[scan-games] Done.');
}

// ---------------------------------------------------------------------------
// Standalone entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  scanGames()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
