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
import {
  canPublishMlbGameNow,
  getMlbEarliestPublishTime,
} from '@/lib/sports/mlb/publish-schedule';
import {
  getInterArticleDelayMs,
  getMaxArticlesPerRun,
  prioritizeGamesForPublishing,
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

  const eligibleReady = readyGames.filter((game) => {
    const sportConfig = SPORTS.find((s) => s.key === game.sport && s.enabled);
    if (!sportConfig) return false;
    return filterGamesForSport([game], sportConfig, now).length > 0;
  });

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

  const publishableReady = eligibleReady.filter((game) => {
    if (game.sport !== 'mlb') return true;
    if (canPublishMlbGameNow(game, mlbScheduleGames, now)) return true;

    const earliest = getMlbEarliestPublishTime(game, mlbScheduleGames);
    console.log(
      `[generate-articles] Holding ${game.awayTeam} @ ${game.homeTeam} until ${earliest.toISOString()}`,
    );
    return false;
  });

  if (publishableReady.length === 0) {
    console.log(
      `[generate-articles] Skipping — ${readyGames.length} READY game(s) but none eligible to publish now`,
    );
    return;
  }

  if (publishableReady.length < readyGames.length) {
    console.log(
      `[generate-articles] Ignoring ${readyGames.length - publishableReady.length} READY game(s) outside publishing window or on hold`,
    );
  }

  console.log(`AI config: ${describeAiConfig(getActiveAiConfig())}`);
  console.log(`Found ${publishableReady.length} READY game(s) eligible to publish now.`);

  const prioritized = prioritizeGamesForPublishing(publishableReady);
  const maxThisRun = getMaxArticlesPerRun(prioritized.length, now);
  const gamesToPublish = prioritized.slice(0, maxThisRun);
  const deferredCount = prioritized.length - gamesToPublish.length;

  if (deferredCount > 0) {
    console.log(
      `[generate-articles] Publishing ${gamesToPublish.length} now, ${deferredCount} remain READY for next run`,
    );
  }

  const sportKeys = [...new Set(gamesToPublish.map((g) => g.sport))];
  for (const sportKey of sportKeys) {
    const sportConfig = SPORTS.find((s) => s.key === sportKey && s.enabled);
    if (!sportConfig || !isSportInSeason(sportConfig)) continue;

    const sportGames = gamesToPublish.filter((g) => g.sport === sportKey);
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
        where: { id: { in: gamesToPublish.map((g) => g.id) } },
      })
    ).map((g) => [g.id, g]),
  );

  for (let i = 0; i < gamesToPublish.length; i++) {
    if (i > 0) {
      const delayMs = getInterArticleDelayMs(`${gamesToPublish[i].id}:${i}`);
      console.log(
        `[generate-articles] Staggering ${Math.round(delayMs / 1000)}s before next article`,
      );
      await sleep(delayMs);
    }

    const game = gamesToPublish[i];
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
