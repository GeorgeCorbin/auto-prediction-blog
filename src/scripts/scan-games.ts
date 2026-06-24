import 'dotenv/config';
import {
  getTodayEspnDateStr,
  shouldDemoteReadyGame,
} from '@/lib/games/game-day';
import { getActiveSports, getSportConfig } from '@/lib/sports/config';
import { getSportModule } from '@/lib/sports/registry';
import { isOddsApiEnabled } from '@/lib/feature-flags';
import { refreshUpcomingOddsForSport } from '@/lib/odds/persist-odds';
import { prisma } from '@/lib/db';

export async function scanGames(): Promise<void> {
  const todayDateStr = getTodayEspnDateStr();
  const now = new Date();

  const earlyReady = await prisma.game.findMany({
    where: { status: 'READY' },
    select: { id: true, scheduledAt: true, sport: true },
  });
  for (const g of earlyReady) {
    const sport = getSportConfig(g.sport);
    if (!sport || !shouldDemoteReadyGame(g.scheduledAt, sport, now)) continue;

    await prisma.game.update({ where: { id: g.id }, data: { status: 'SCHEDULED' } });
  }

  for (const sport of getActiveSports()) {
    await getSportModule(sport.key).scanGameDay(sport, todayDateStr);

    if (!isOddsApiEnabled()) continue;

    const oddsResult = await refreshUpcomingOddsForSport(sport, now);
    if (oddsResult.total === 0 || !oddsResult.apiCalled) continue;

    console.log(
      `[scan-games] [${sport.label}] Odds API refreshed — matched ${oddsResult.matched} of ${oddsResult.total} upcoming game(s)`,
    );
  }

  console.log('\n[scan-games] Done.');
}

if (require.main === module) {
  scanGames()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
