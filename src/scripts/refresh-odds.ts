import 'dotenv/config';
import { prisma } from '@/lib/db';
import { isOddsApiEnabled } from '@/lib/feature-flags';
import { SPORTS } from '@/lib/sports/config';
import { fetchAndPersistOddsForGames } from '@/lib/odds/persist-odds';

/** Re-fetch odds from The Odds API and persist them for all upcoming published games. */
export async function refreshOdds(): Promise<void> {
  if (!isOddsApiEnabled()) {
    console.log('[refresh-odds] Skipping — statsPickWithoutOdds is enabled (odds API disabled).');
    return;
  }

  const now = new Date();

  const publishedGames = await prisma.game.findMany({
    where: {
      status: 'PUBLISHED',
      scheduledAt: { gt: now },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  if (publishedGames.length === 0) {
    console.log('[refresh-odds] No upcoming published games to refresh.');
    return;
  }

  console.log(
    `[refresh-odds] Refreshing odds for ${publishedGames.length} published game(s)...`,
  );

  let totalMatched = 0;

  const sportKeys = [...new Set(publishedGames.map((g) => g.sport))];
  for (const sportKey of sportKeys) {
    const sportConfig = SPORTS.find((s) => s.key === sportKey && s.enabled);
    if (!sportConfig) {
      console.log(`[refresh-odds] Skipping "${sportKey}": no enabled sport config`);
      continue;
    }

    const sportGames = publishedGames.filter((g) => g.sport === sportKey);
    console.log(
      `[refresh-odds] Fetching ${sportConfig.label} odds for ${sportGames.length} game(s)...`,
    );

    const oddsMap = await fetchAndPersistOddsForGames(
      sportGames.map((g) => ({
        espnEventId: g.espnEventId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        scheduledAt: g.scheduledAt,
      })),
      sportConfig.oddsApiKey,
    );

    totalMatched += oddsMap.size;
    console.log(
      `[refresh-odds] ${sportConfig.label}: updated ${oddsMap.size} of ${sportGames.length} game(s)`,
    );

    for (const game of sportGames) {
      if (oddsMap.has(game.espnEventId)) continue;
      console.log(
        `[refresh-odds]   no match: ${game.awayTeam} @ ${game.homeTeam} (${game.scheduledAt.toISOString()})`,
      );
    }
  }

  console.log(
    `\n[refresh-odds] Done. Updated odds for ${totalMatched} of ${publishedGames.length} game(s).`,
  );
}

if (require.main === module) {
  refreshOdds()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
