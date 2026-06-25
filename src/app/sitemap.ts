import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { getActiveSports } from '@/lib/sports/config';
import { teamNameToSlug } from '@/lib/teams';

const STATIC_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/teams', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yourdomain.com';
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    ...getActiveSports().map(({ key }) => ({
      url: `${siteUrl}/${key}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    })),
    ...STATIC_PAGES.map(({ path, changeFrequency, priority }) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
  ];

  try {
    const articles = await prisma.article.findMany({
      select: {
        slug: true,
        sport: true,
        updatedAt: true,
        game: { select: { homeTeam: true, awayTeam: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const articleUrls: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${siteUrl}/${article.sport}/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const teamLastModified = new Map<string, Date>();
    for (const article of articles) {
      for (const name of [article.game.homeTeam, article.game.awayTeam]) {
        const slug = teamNameToSlug(name);
        const existing = teamLastModified.get(slug);
        if (!existing || article.updatedAt > existing) {
          teamLastModified.set(slug, article.updatedAt);
        }
      }
    }

    const teamUrls: MetadataRoute.Sitemap = Array.from(teamLastModified.entries()).map(
      ([slug, lastModified]) => ({
        url: `${siteUrl}/teams/${slug}`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }),
    );

    return [...staticUrls, ...articleUrls, ...teamUrls];
  } catch {
    return staticUrls;
  }
}
