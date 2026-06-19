import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { ENABLED_SPORTS } from '@/lib/sports/config';

const STATIC_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
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
    ...ENABLED_SPORTS.map(({ key }) => ({
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
      select: { slug: true, sport: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    const articleUrls: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${siteUrl}/${article.sport}/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    return [...staticUrls, ...articleUrls];
  } catch {
    return staticUrls;
  }
}
