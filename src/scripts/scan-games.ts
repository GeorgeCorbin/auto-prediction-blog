import 'dotenv/config';
import {
  getTodayEspnDateStr,
  shouldDemoteReadyGame,
} from '@/lib/games/game-day';
import { getActiveSports, getSportConfig } from '@/lib/sports/config';
import { getSportModule } from '@/lib/sports/registry';
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
