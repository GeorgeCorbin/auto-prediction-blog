import 'dotenv/config';
import { prisma } from '@/lib/db';
import { SPORTS } from '@/lib/sports/config';
import { describeAiConfig, getActiveAiConfig } from '@/lib/ai';
import { generateArticle } from '@/lib/ai/generator';
import { MlbGameContext } from '@/lib/ai/prompts/mlb';
import { isStatsPickWithoutOddsEnabled } from '@/lib/feature-flags';
import { resolveMlbPick } from '@/lib/picks/mlb';

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

  console.log(`AI config: ${describeAiConfig(getActiveAiConfig())}`);
  console.log(`Found ${readyGames.length} READY game(s).`);

  const allowStatsFallback = isStatsPickWithoutOddsEnabled();

  for (const game of readyGames) {
    const sportConfig = SPORTS.find((s) => s.key === game.sport && s.enabled);
    if (!sportConfig) {
      console.log(`Skipping game ${game.id}: no enabled sport config for "${game.sport}"`);
      continue;
    }

    const homeStats = safeJsonRecord(game.homeStats);
    const awayStats = safeJsonRecord(game.awayStats);
    const homePitcherStats = safeJsonRecord(game.homePitcherStats);
    const awayPitcherStats = safeJsonRecord(game.awayPitcherStats);

    const pick = resolveMlbPick(
      {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeRecord: homeStats.record ?? '',
        awayRecord: awayStats.record ?? '',
        homeStats,
        awayStats,
        homePitcherStats,
        awayPitcherStats,
        spread: game.spread,
        moneylineHome: game.moneylineHome,
        moneylineAway: game.moneylineAway,
      },
      { allowStatsFallback },
    );

    if (!pick) {
      console.log(`Skipping game ${game.id}: no odds and stats fallback is disabled`);
      continue;
    }

    const context: MlbGameContext = {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeTeamAbbr: game.homeTeamAbbr,
      awayTeamAbbr: game.awayTeamAbbr,
      scheduledAt: game.scheduledAt,
      homeRecord: homeStats.record ?? '',
      awayRecord: awayStats.record ?? '',
      homeStats,
      awayStats,
      homePitcher: game.homePitcher ?? 'TBD',
      awayPitcher: game.awayPitcher ?? 'TBD',
      homePitcherStats,
      awayPitcherStats,
      homeMoneyline: game.moneylineHome ?? 0,
      awayMoneyline: game.moneylineAway ?? 0,
      spread: game.spread ?? 0,
      total: game.total ?? 0,
      favoredTeam: pick.favoredTeam,
      hasOdds: pick.hasOdds,
      pickLabel: pick.pickLabel,
    };

    try {
      const result = await generateArticle(sportConfig, context);
      const slug = buildSlug(game.awayTeamAbbr, game.homeTeamAbbr, game.scheduledAt);

      await prisma.article.upsert({
        where: { slug },
        create: {
          gameId: game.id,
          slug,
          title: result.title,
          metaDescription: result.metaDescription,
          content: result.content,
          pick: result.pick,
          sport: game.sport,
          publishedAt: new Date(),
        },
        update: {
          title: result.title,
          metaDescription: result.metaDescription,
          content: result.content,
          pick: result.pick,
        },
      });

      await prisma.game.update({
        where: { id: game.id },
        data: { status: 'PUBLISHED' },
      });

      console.log(`Generated article: ${slug}`);
    } catch (err) {
      console.error(`Failed to generate article for game ${game.id}:`, err);
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
