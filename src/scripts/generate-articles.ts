import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ENABLED_SPORTS, isSportInSeason } from '@/lib/sports/config';
import { describeAiConfig, getActiveAiConfig } from '@/lib/ai';
import { generateArticle } from '@/lib/ai/generator';
import { getPickOptions } from '@/lib/feature-flags';
import { filterGamesForSport, isWithinPublishingHours } from '@/lib/games/game-day';
import { fetchAndPersistOddsForGames } from '@/lib/odds/persist-odds';
import { pickAuthorForGame } from '@/lib/authors';
import { fetchEspnGameSummary } from '@/lib/espn/client';
import { getSportModule } from '@/lib/sports/registry';
import { buildArticleSlug } from '@/lib/sports/pipeline';
import {
  buildSportPublishBatches,
  shouldSkipStartedWithoutOdds,
} from '@/lib/articles/sport-publish';
import {
  getInterArticleDelayMs,
  getMaxArticlesPerSportPerRun,
  sleep,
} from '@/lib/articles/publish-schedule';

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

  let skippedStartedCount = 0;
  for (const game of readyGames) {
    if (!shouldSkipStartedWithoutOdds(game, now)) continue;

    skippedStartedCount++;
    await prisma.game.update({
      where: { id: game.id },
      data: { status: 'SKIPPED' },
    });
    console.log(
      `[generate-articles] Skipped ${game.awayTeam} @ ${game.homeTeam} — match started without odds`,
    );
  }

  const activeReady = readyGames.filter((game) => !shouldSkipStartedWithoutOdds(game, now));

  const eligibleReady = activeReady.filter((game) => {
    const sportConfig = ENABLED_SPORTS.find((s) => s.key === game.sport);
    if (!sportConfig) return false;
    return filterGamesForSport([game], sportConfig, now).length > 0;
  });

  if (eligibleReady.length === 0) {
    console.log(
      `[generate-articles] Skipping — ${readyGames.length} READY game(s) but none in publishing window`,
    );
    return;
  }

  const mlbScheduleGames =
    eligibleReady.some((g) => g.sport === 'mlb')
      ? await prisma.game.findMany({
          where: {
            sport: 'mlb',
            scheduledAt: { gt: new Date(now.getTime() - 26 * 60 * 60 * 1000) },
          },
          select: { id: true, scheduledAt: true },
        })
      : [];

  const activeSports = ENABLED_SPORTS.filter((sport) =>
    eligibleReady.some((game) => game.sport === sport.key),
  );

  const batches = buildSportPublishBatches(
    eligibleReady,
    activeSports,
    pickOptions,
    mlbScheduleGames,
    (sportKey, queueLength) => getMaxArticlesPerSportPerRun(sportKey, queueLength, now),
    now,
  );

  const gamesToPublish = batches.flatMap((batch) => batch.toPublish);

  if (gamesToPublish.length === 0) {
    const totalOnHold = batches.reduce((sum, batch) => sum + batch.onHold, 0);
    console.log(
      `[generate-articles] Skipping — ${eligibleReady.length} READY game(s) but none eligible to publish now (${totalOnHold} on sport schedule hold)`,
    );
    return;
  }

  const totalOnHold = batches.reduce((sum, batch) => sum + batch.onHold, 0);
  const totalDeferred = batches.reduce(
    (sum, batch) => sum + Math.max(0, batch.queue.length - batch.toPublish.length),
    0,
  );

  const outsideWindowCount = activeReady.length - eligibleReady.length;

  if (skippedStartedCount > 0 || totalOnHold > 0 || outsideWindowCount > 0) {
    const parts: string[] = [];
    if (skippedStartedCount > 0) {
      parts.push(`${skippedStartedCount} started without odds`);
    }
    if (outsideWindowCount > 0) {
      parts.push(`${outsideWindowCount} outside publishing window`);
    }
    if (totalOnHold > 0) {
      parts.push(`${totalOnHold} on sport schedule hold`);
    }
    console.log(`[generate-articles] Ignoring ${parts.join(', ')}`);
  }

  console.log(`AI config: ${describeAiConfig(getActiveAiConfig())}`);

  for (const batch of batches) {
    const deferred = batch.queue.length - batch.toPublish.length;
    const oddsWaiting =
      batch.waitingOnOdds > 0
        ? `, ${batch.waitingOnOdds} waiting on odds at back of queue`
        : '';
    console.log(
      `[generate-articles] [${batch.sportLabel}] Queue ${batch.queue.length} — publishing ${batch.toPublish.length}${deferred > 0 ? `, ${deferred} remain for next run` : ''}${oddsWaiting}`,
    );
  }

  for (const batch of batches) {
    if (batch.toPublish.length === 0) continue;

    const sportConfig = ENABLED_SPORTS.find((s) => s.key === batch.sportKey);
    if (!sportConfig || !isSportInSeason(sportConfig)) continue;

    console.log(
      `[generate-articles] [${batch.sportLabel}] Fetching fresh odds for ${batch.toPublish.length} game(s)`,
    );

    const oddsMap = await fetchAndPersistOddsForGames(
      batch.toPublish.map((g) => ({
        espnEventId: g.espnEventId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        scheduledAt: g.scheduledAt,
      })),
      sportConfig.oddsApiKey,
    );

    console.log(
      `[generate-articles] [${batch.sportLabel}] Odds matched for ${oddsMap.size} of ${batch.toPublish.length} game(s)`,
    );
  }

  const refreshedById = new Map(
    (
      await prisma.game.findMany({
        where: { id: { in: gamesToPublish.map((g) => g.id) } },
      })
    ).map((g) => [g.id, g]),
  );

  let articleIndex = 0;
  for (const batch of batches) {
    for (const game of batch.toPublish) {
      if (articleIndex > 0) {
        const delayMs = getInterArticleDelayMs(`${game.id}:${articleIndex}`);
        console.log(
          `[generate-articles] Staggering ${Math.round(delayMs / 1000)}s before next article`,
        );
        await sleep(delayMs);
      }
      articleIndex++;

      const refreshed = refreshedById.get(game.id) ?? game;
      const sportConfig = ENABLED_SPORTS.find((s) => s.key === game.sport);
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

      if (shouldSkipStartedWithoutOdds(refreshed, now)) {
        await prisma.game.update({
          where: { id: refreshed.id },
          data: { status: 'SKIPPED' },
        });
        console.log(
          `[generate-articles] Skipped ${refreshed.awayTeam} @ ${refreshed.homeTeam} — match started without odds`,
        );
        continue;
      }

      const mod = getSportModule(game.sport);
      const pick = mod.resolvePick(refreshed, pickOptions);

      if (!pick) {
        console.log(
          `[generate-articles] [${sportConfig.label}] Deferred ${refreshed.awayTeam} @ ${refreshed.homeTeam} — no odds and stats fallback is disabled`,
        );
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

  if (totalDeferred > 0) {
    console.log(
      `[generate-articles] ${totalDeferred} game(s) remain in per-sport queues for next run`,
    );
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
