import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { teamNameToSlug, slugToTeamSearch } from '@/lib/teams';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { MatchupImage } from '@/components/MatchupImage';

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

function timeAgo(date: Date): string {
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export async function generateStaticParams() {
  try {
    const games = await prisma.game.findMany({
      select: { homeTeam: true, awayTeam: true },
    });
    const teamNames = new Set<string>();
    for (const g of games) {
      teamNames.add(g.homeTeam);
      teamNames.add(g.awayTeam);
    }
    return Array.from(teamNames).map((name) => ({ slug: teamNameToSlug(name) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const teamSearch = slugToTeamSearch(slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const game = await prisma.game.findFirst({
    where: {
      OR: [
        { homeTeam: { contains: teamSearch, mode: 'insensitive' } },
        { awayTeam: { contains: teamSearch, mode: 'insensitive' } },
      ],
    },
    select: { homeTeam: true, awayTeam: true },
  }).catch(() => null);

  if (!game) return { title: 'Team Predictions' };

  const teamName =
    game.homeTeam.toLowerCase().includes(teamSearch.toLowerCase())
      ? game.homeTeam
      : game.awayTeam;

  const title = `${teamName} Predictions & Analysis | The Matchup Report`;
  const description = `All ${teamName} game predictions and analysis. Expert picks, odds breakdowns, and best bets for every ${teamName} matchup.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/teams/${slug}` },
    openGraph: { title, description, type: 'website' },
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const teamSearch = slugToTeamSearch(slug);

  let articles: {
    id: string;
    title: string;
    sport: string;
    slug: string;
    publishedAt: Date;
    featuredImageUrl: string | null;
    imageAlt: string | null;
    game: {
      homeTeam: string;
      awayTeam: string;
      scheduledAt: Date;
    };
  }[] = [];

  try {
    articles = await prisma.article.findMany({
      where: {
        game: {
          OR: [
            { homeTeam: { contains: teamSearch, mode: 'insensitive' } },
            { awayTeam: { contains: teamSearch, mode: 'insensitive' } },
          ],
        },
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        sport: true,
        slug: true,
        publishedAt: true,
        featuredImageUrl: true,
        imageAlt: true,
        game: {
          select: {
            homeTeam: true,
            awayTeam: true,
            scheduledAt: true,
          },
        },
      },
    });
  } catch {
    notFound();
  }

  if (articles.length === 0) notFound();

  const firstGame = articles[0].game;
  const teamName = firstGame.homeTeam.toLowerCase().includes(teamSearch.toLowerCase())
    ? firstGame.homeTeam
    : firstGame.awayTeam;

  const sportCounts = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.sport] = (acc[a.sport] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] mb-6">
          <Link href="/" className="hover:text-[#FF6B2C] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/teams" className="hover:text-[#FF6B2C] transition-colors">Teams</Link>
          <span>/</span>
          <span className="text-[#4B5563]">{teamName}</span>
        </nav>

        {/* Team header */}
        <header className="mb-8 pb-6 border-b border-[#E5E7EB]">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(sportCounts).map(([sport, count]) => (
                  <span
                    key={sport}
                    className="inline-flex items-center bg-[#FEF3EE] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#FF6B2C] rounded-sm"
                  >
                    {sport.toUpperCase()}
                  </span>
                ))}
              </div>
              <h1 className="font-serif text-[32px] sm:text-[40px] font-bold text-[#1A1A1A] leading-[1.15] mb-2">
                {teamName} Predictions
              </h1>
              <p className="text-[15px] text-[#4B5563]">
                {articles.length} prediction{articles.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </header>

        {/* Article grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const opponent =
              article.game.homeTeam.toLowerCase().includes(teamSearch.toLowerCase())
                ? article.game.awayTeam
                : article.game.homeTeam;

            return (
              <Link
                key={article.id}
                href={`/${article.sport}/${article.slug}`}
                className="group block border border-[#E5E7EB] rounded overflow-hidden hover:border-[#FF6B2C] transition-colors"
              >
                <div className="relative w-full bg-[#D1D5DB]" style={{ aspectRatio: '16/9' }}>
                  {article.featuredImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.featuredImageUrl}
                      alt={article.imageAlt ?? article.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MatchupImage
                      slug={article.slug}
                      alt={article.imageAlt ?? article.title}
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
                      {article.sport.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-[#9CA3AF]">{timeAgo(article.publishedAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mb-1">vs {opponent}</p>
                  <h2 className="font-serif text-[15px] font-bold text-[#1A1A1A] leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-3">
                    {article.title}
                  </h2>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
