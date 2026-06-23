import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { SPORTS, isSportInSeason } from '@/lib/sports/config';
import { describeAiConfig, getActiveAiConfig } from '@/lib/ai';
import { generateArticle } from '@/lib/ai/generator';
import { getPickOptions } from '@/lib/feature-flags';
import { filterGamesForSport, isWithinPublishingHours } from '@/lib/games/game-day';
import { fetchAndPersistOddsForGames } from '@/lib/odds/persist-odds';
import { pickAuthorForGame } from '@/lib/authors';
import { fetchEspnGameSummary } from '@/lib/espn/client';
import { getSportModule } from '@/lib/sports/registry';
import { buildArticleSlug } from '@/lib/sports/pipeline';

export async function generateArticles(): Promise<void> {
  const now = new Date();

  if (!isWithinPublishingHours(now)) {
    console.log(
      '[generate-articles] Outside publishing hours (6am–11pm ET) — skipping, READY games unchanged',
    );
    return;
  }

  const pickOptions = getPickOptions();
  console.log(
    `[generate-articles] Pick mode: ${
      pickOptions.allowStatsFallback ? 'stats fallback allowed' : 'odds required'
    }`,
  );

  const readyGames = await prisma.game.findMany({
    where: { status: 'READY' },
  });

  if (readyGames.length === 0) {
    console.log('No READY games found.');
    return;
  }

  const eligibleReady = readyGames.filter((game) => {
    const sportConfig = SPORTS.find((s) => s.key === game.sport && s.enabled);
    if (!sportConfig) return false;
    return filterGamesForSport([game], sportConfig, now).length > 0;
  });

  if (eligibleReady.length === 0) {
    console.log(
      `[generate-articles] Skipping — ${readyGames.length} READY game(s) but none within publishing window`,
    );
    return;
  }

  if (eligibleReady.length < readyGames.length) {
    console.log(
      `[generate-articles] Ignoring ${readyGames.length - eligibleReady.length} READY game(s) outside publishing window`,
    );
  }

  console.log(`AI config: ${describeAiConfig(getActiveAiConfig())}`);
  console.log(`Found ${eligibleReady.length} READY game(s) within publishing window.`);

  const sportKeys = [...new Set(eligibleReady.map((g) => g.sport))];
  for (const sportKey of sportKeys) {
    const sportConfig = SPORTS.find((s) => s.key === sportKey && s.enabled);
    if (!sportConfig || !isSportInSeason(sportConfig)) continue;

    const sportGames = eligibleReady.filter((g) => g.sport === sportKey);
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
        where: { id: { in: eligibleReady.map((g) => g.id) } },
      })
    ).map((g) => [g.id, g]),
  );

  for (const game of eligibleReady) {
    const refreshed = refreshedById.get(game.id) ?? game;
    const sportConfig = SPORTS.find((s) => s.key === game.sport && s.enabled);
    if (!sportConfig) {
      console.log(`Skipping game ${game.id}: no enabled sport config for "${game.sport}"`);
      continue;
    }

    if (!isSportInSeason(sportConfig, refreshed.scheduledAt)) {
      console.log(
        `Skipping game ${refreshed.id}: ${sportConfig.label} outside active tournament window`,
      );
      continue;
    }

    const mod = getSportModule(game.sport);
    const pick = mod.resolvePick(refreshed, pickOptions);

    if (!pick) {
      console.log(`Skipping game ${refreshed.id}: no odds and stats fallback is disabled`);
      continue;
    }

    const context = mod.buildPromptContext(refreshed, pick);

    try {
      const [result, summary] = await Promise.all([
        generateArticle(sportConfig, mod, context),
        fetchEspnGameSummary(
          refreshed.espnEventId,
          sportConfig,
          refreshed.awayTeam,
          refreshed.homeTeam,
        ),
      ]);
      const { venueImage } = summary;
      const slug = buildArticleSlug(
        refreshed.awayTeamAbbr,
        refreshed.homeTeamAbbr,
        refreshed.scheduledAt,
      );
      const author = pickAuthorForGame(
        refreshed.sport,
        refreshed.homeTeamAbbr,
        refreshed.awayTeamAbbr,
        slug,
      );

      const enrich = mod.enrichFromSummary?.(refreshed, summary);
      if (enrich?.sportData) {
        await prisma.game.update({
          where: { id: refreshed.id },
          data: { sportData: enrich.sportData as Prisma.InputJsonValue },
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
