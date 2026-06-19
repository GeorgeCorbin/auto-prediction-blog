import { prisma } from '@/lib/db';

export async function searchArticles(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    return await prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { content: { contains: trimmed, mode: 'insensitive' } },
          { pick: { contains: trimmed, mode: 'insensitive' } },
          { metaDescription: { contains: trimmed, mode: 'insensitive' } },
          { game: { homeTeam: { contains: trimmed, mode: 'insensitive' } } },
          { game: { awayTeam: { contains: trimmed, mode: 'insensitive' } } },
          { game: { homeTeamAbbr: { contains: trimmed, mode: 'insensitive' } } },
          { game: { awayTeamAbbr: { contains: trimmed, mode: 'insensitive' } } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      include: { game: true },
      take: 50,
    });
  } catch {
    return [];
  }
}
