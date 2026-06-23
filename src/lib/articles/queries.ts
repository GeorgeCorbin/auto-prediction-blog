import { prisma } from '@/lib/db';
import { estimatePickConfidence } from '@/lib/articles/pick-confidence';

const articleWithGame = { include: { game: true } as const };

export type ArticleWithGame = Awaited<
  ReturnType<typeof getLatestArticlesAllSports>
>[number];

export async function getLatestArticlesAllSports(take = 10) {
  try {
    return await prisma.article.findMany({
      take,
      orderBy: { publishedAt: 'desc' },
      ...articleWithGame,
    });
  } catch {
    return [];
  }
}

export async function getLatestArticlesBySport(sport: string, take = 5) {
  try {
    return await prisma.article.findMany({
      where: { sport },
      take,
      orderBy: { publishedAt: 'desc' },
      ...articleWithGame,
    });
  } catch {
    return [];
  }
}

export async function getMostReadArticles(take = 5, sport?: string) {
  try {
    return await prisma.article.findMany({
      where: sport ? { sport } : undefined,
      take,
      orderBy: { viewCount: 'desc' },
      ...articleWithGame,
    });
  } catch {
    return [];
  }
}

export async function getBestPredictions(take = 3) {
  try {
    const articles = await prisma.article.findMany({
      take: 50,
      orderBy: { publishedAt: 'desc' },
      ...articleWithGame,
    });

    return articles
      .map((article) => ({
        article,
        confidence: estimatePickConfidence(article.game, article.pick, article.sport),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, take)
      .map(({ article }) => article);
  } catch {
    return [];
  }
}

type SidebarArticle = {
  id: string;
  title: string;
  sport: string;
  slug: string;
  publishedAt: Date;
};

export async function getLatestSportPosts(
  sport: string,
  excludeSlug: string,
  take = 4,
): Promise<SidebarArticle[]> {
  try {
    return await prisma.article.findMany({
      where: { sport, slug: { not: excludeSlug } },
      orderBy: { publishedAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        sport: true,
        slug: true,
        publishedAt: true,
      },
    });
  } catch {
    return [];
  }
}

export async function getMostReadPosts(take = 5): Promise<SidebarArticle[]> {
  try {
    return await prisma.article.findMany({
      orderBy: { viewCount: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        sport: true,
        slug: true,
        publishedAt: true,
      },
    });
  } catch {
    return [];
  }
}
