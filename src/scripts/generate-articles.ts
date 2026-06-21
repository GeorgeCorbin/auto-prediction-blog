import 'dotenv/config';
import { prisma } from '@/lib/db';
import { SPORTS } from '@/lib/sports/config';
import { describeAiConfig, getActiveAiConfig } from '@/lib/ai';
import { generateArticle } from '@/lib/ai/generator';
import { MlbGameContext } from '@/lib/ai/prompts/mlb';
import { isStatsPickWithoutOddsEnabled } from '@/lib/feature-flags';
import { filterGameDayGames } from '@/lib/games/game-day';
import { fetchAndPersistOddsForGames } from '@/lib/odds/persist-odds';
import { resolveMlbPick } from '@/lib/picks/mlb';
import { pickAuthorForGame } from '@/lib/authors';
import { fetchEspnGameSummary } from '@/lib/espn/client';

function buildSlug(
  awayTeamAbbr: string,
  homeTeamAbbr: string,
  scheduledAt: Date
): string {
  const month = scheduledAt.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const day = scheduledAt.getDate();
  const year = scheduledAt.getFullYear();
  return `${awayTeamAbbr.toLowerCase()}-vs-${homeTeamAbbr.toLowerCase()}-prediction-${month}-${day}-${year}`;
}

function safeJsonRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)])
  );
}

export async function generateArticles(): Promise<void> {
  const readyGames = await prisma.game.findMany({
    where: { status: 'READY' },
  });

  if (readyGames.length === 0) {
    console.log('No READY games found.');
    return;
  }

  const gameDayReady = filterGameDayGames(readyGames);

  if (gameDayReady.length === 0) {
    console.log(
      `[generate-articles] Skipping — ${readyGames.length} READY game(s) but none on today's slate`,
    );
    return;
  }

  if (gameDayReady.length < readyGames.length) {
    console.log(
      `[generate-articles] Ignoring ${readyGames.length - gameDayReady.length} READY game(s) not on today's slate`,
    );
  }

  console.log(`AI config: ${describeAiConfig(getActiveAiConfig())}`);
  console.log(`Found ${gameDayReady.length} game-day READY game(s).`);

  const sportKeys = [...new Set(gameDayReady.map((g) => g.sport))];
  for (const sportKey of sportKeys) {
    const sportConfig = SPORTS.find((s) => s.key === sportKey && s.enabled);
    if (!sportConfig) continue;

    const sportGames = gameDayReady.filter((g) => g.sport === sportKey);
    console.log(
      `[generate-articles] Fetching fresh odds for ${sportGames.length} ${sportConfig.label} game(s)`,
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

    console.log(
      `[generate-articles] Odds matched for ${oddsMap.size} of ${sportGames.length} game(s)`,
    );
  }

  const refreshedById = new Map(
    (
      await prisma.game.findMany({
        where: { id: { in: gameDayReady.map((g) => g.id) } },
      })
    ).map((g) => [g.id, g]),
  );

  const allowStatsFallback = isStatsPickWithoutOddsEnabled();

  for (const game of gameDayReady) {
    const refreshed = refreshedById.get(game.id) ?? game;
    const sportConfig = SPORTS.find((s) => s.key === game.sport && s.enabled);
    if (!sportConfig) {
      console.log(`Skipping game ${game.id}: no enabled sport config for "${game.sport}"`);
      continue;
    }

    const homeStats = safeJsonRecord(refreshed.homeStats);
    const awayStats = safeJsonRecord(refreshed.awayStats);
    const homePitcherStats = safeJsonRecord(refreshed.homePitcherStats);
    const awayPitcherStats = safeJsonRecord(refreshed.awayPitcherStats);

    const pick = resolveMlbPick(
      {
        homeTeam: refreshed.homeTeam,
        awayTeam: refreshed.awayTeam,
        homeRecord: homeStats.record ?? '',
        awayRecord: awayStats.record ?? '',
        homeStats,
        awayStats,
        homePitcherStats,
        awayPitcherStats,
        spreadHome: refreshed.spreadHome,
        spreadAway: refreshed.spreadAway,
        spreadHomePrice: refreshed.spreadHomePrice,
        spreadAwayPrice: refreshed.spreadAwayPrice,
        moneylineHome: refreshed.moneylineHome,
        moneylineAway: refreshed.moneylineAway,
        total: refreshed.total,
        overPrice: refreshed.overPrice,
        underPrice: refreshed.underPrice,
      },
      { allowStatsFallback },
    );

    if (!pick) {
      console.log(`Skipping game ${refreshed.id}: no odds and stats fallback is disabled`);
      continue;
    }

    const context: MlbGameContext = {
      homeTeam: refreshed.homeTeam,
      awayTeam: refreshed.awayTeam,
      homeTeamAbbr: refreshed.homeTeamAbbr,
      awayTeamAbbr: refreshed.awayTeamAbbr,
      scheduledAt: refreshed.scheduledAt,
      homeRecord: homeStats.record ?? '',
      awayRecord: awayStats.record ?? '',
      homeStats,
      awayStats,
      homePitcher: refreshed.homePitcher ?? 'TBD',
      awayPitcher: refreshed.awayPitcher ?? 'TBD',
      homePitcherStats,
      awayPitcherStats,
      homeMoneyline: refreshed.moneylineHome ?? 0,
      awayMoneyline: refreshed.moneylineAway ?? 0,
      spreadHome: refreshed.spreadHome ?? 0,
      spreadAway: refreshed.spreadAway ?? 0,
      total: refreshed.total ?? 0,
      favoredTeam: pick.favoredTeam,
      hasOdds: pick.hasOdds,
      pickLabel: pick.pickLabel,
    };

    try {
      const [result, summary] = await Promise.all([
        generateArticle(sportConfig, context),
        fetchEspnGameSummary(
          refreshed.espnEventId,
          sportConfig,
          refreshed.awayTeam,
          refreshed.homeTeam,
        ),
      ]);
      const { venueImage, homePitcherStats: richHome, awayPitcherStats: richAway } = summary;
      const slug = buildSlug(refreshed.awayTeamAbbr, refreshed.homeTeamAbbr, refreshed.scheduledAt);
      const author = pickAuthorForGame(refreshed.homeTeamAbbr, refreshed.awayTeamAbbr, slug);

      // Update Game with richer pitcher stats from summary if available
      if (richHome || richAway) {
        await prisma.game.update({
          where: { id: refreshed.id },
          data: {
            ...(richHome ? { homePitcherStats: richHome as unknown as import('@prisma/client').Prisma.InputJsonValue } : {}),
            ...(richAway ? { awayPitcherStats: richAway as unknown as import('@prisma/client').Prisma.InputJsonValue } : {}),
          },
        });
      }

      await prisma.article.upsert({
        where: { slug },
        create: {
          gameId: refreshed.id,
          slug,
          title: result.title,
          metaDescription: result.metaDescription,
          content: result.content,
          pick: result.pick,
          sport: refreshed.sport,
          publishedAt: new Date(),
          author,
          featuredImageUrl: venueImage.imageUrl,
          imageAlt: venueImage.imageAlt,
          imageCredit: venueImage.imageCredit,
        },
        update: {
          title: result.title,
          metaDescription: result.metaDescription,
          content: result.content,
          pick: result.pick,
          featuredImageUrl: venueImage.imageUrl,
          imageAlt: venueImage.imageAlt,
          imageCredit: venueImage.imageCredit,
        },
      });

      await prisma.game.update({
        where: { id: refreshed.id },
        data: { status: 'PUBLISHED' },
      });

      console.log(`Generated article: ${slug}`);
    } catch (err) {
      console.error(`Failed to generate article for game ${refreshed.id}:`, err);
    }
  }
}

if (require.main === module) {
  generateArticles()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
