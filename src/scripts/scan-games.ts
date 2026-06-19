import 'dotenv/config';
import { fetchEspnScoreboard } from '@/lib/espn/client';
import { oddsProvider } from '@/lib/odds';
import { ENABLED_SPORTS } from '@/lib/sports/config';
import { prisma } from '@/lib/db';
import { isStatsPickWithoutOddsEnabled } from '@/lib/feature-flags';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

export async function scanGames(): Promise<void> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dates = [toDateStr(today), toDateStr(tomorrow)];

  for (const sport of ENABLED_SPORTS) {
    console.log(`\n[scan-games] Fetching ESPN scoreboard for ${sport.label} (${dates.join(', ')})`);

    const games = await fetchEspnScoreboard(sport, dates);
    console.log(`[scan-games] ESPN returned ${games.length} ${sport.label} games`);

    if (games.length === 0) continue;

    // ------------------------------------------------------------------
    // Step 1: Upsert all games into the DB
    // ------------------------------------------------------------------
    for (const g of games) {
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
    // Step 2: Fetch odds for all games of this sport
    // ------------------------------------------------------------------
    console.log(`[scan-games] Fetching odds for ${games.length} ${sport.label} games`);

    const oddsMap = await oddsProvider.getOddsForGames(
      games.map((g) => ({
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        scheduledAt: g.scheduledAt,
        espnEventId: g.espnEventId,
      })),
      sport.oddsApiKey,
    );

    console.log(`[scan-games] Odds matched for ${oddsMap.size} of ${games.length} games`);

    // ------------------------------------------------------------------
    // Step 3: Update odds on each game record
    // ------------------------------------------------------------------
    for (const [espnEventId, odds] of oddsMap.entries()) {
      await prisma.game.update({
        where: { espnEventId },
        data: {
          moneylineHome: odds.homeMoneyline,
          moneylineAway: odds.awayMoneyline,
          spread: odds.spread,
          total: odds.total,
        },
      });
    }

    // ------------------------------------------------------------------
    // Step 4: Mark eligible games as READY
    // ------------------------------------------------------------------
    const now = new Date();
    let readyCount = 0;
    const allowStatsFallback = isStatsPickWithoutOddsEnabled();

    for (const g of games) {
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
      `[scan-games] Scanned ${games.length} ${sport.label} games, ${readyCount} marked READY`,
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
