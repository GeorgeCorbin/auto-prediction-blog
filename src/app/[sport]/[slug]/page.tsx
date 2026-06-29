import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleAuthor, getAuthorInitials } from '@/lib/authors';
import { stripRedundantPickCallouts } from '@/lib/articles/content';
import { getLatestSportPosts, getMostReadPosts } from '@/lib/articles/queries';
import { prisma } from '@/lib/db';
import { AdSlot } from '@/components/AdSlot';
import { ArticleViewTracker } from '@/components/ArticleViewTracker';
import { MatchupImage } from '@/components/MatchupImage';
import { LocalDateTime } from '@/components/LocalDateTime';
import { formatEasternDateTimeFallback } from '@/lib/dates';
import { ShareButtons } from '@/components/ShareButtons';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { formatAmericanOdds, formatSpreadPoint } from '@/lib/odds/format';
import { SportArticlePanels } from '@/lib/sports/article-panels';
import { teamNameToSlug } from '@/lib/teams';
import { EvergreenContent } from '@/components/EvergreenContent';
import { EvergreenHero } from '@/components/EvergreenHero';
import { EvergreenCardThumbnail } from '@/components/EvergreenCardThumbnail';

const EVERGREEN_LABEL: Record<string, string> = {
  'power-rankings': 'Power Rankings',
  'win-totals': 'Win Totals',
  'matchup-cheat-sheet': 'Cheat Sheet',
  'betting-trends': 'Betting Trends',
  'playoff-picture': 'Playoff Picture',
  'award-races': 'Award Races',
  'team-profile': 'Team Profile',
};

export const revalidate = 3600;

type Props = {
  params: Promise<{ sport: string; slug: string }>;
};

export async function generateStaticParams() {
  try {
    const articles = await prisma.article.findMany({
      select: { sport: true, slug: true },
    });
    return articles.map((a) => ({ sport: a.sport, slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, slug } = await params;
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { game: true },
    });
    if (!article || article.sport !== sport) return { title: 'Article Not Found' };
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const canonicalUrl = `${siteUrl}/${sport}/${slug}`;
    const ogImageUrl = `${siteUrl}/api/og/${slug}`;
    return {
      title: article.title,
      description: article.metaDescription,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: article.title,
        description: article.metaDescription,
        type: 'article',
        publishedTime: article.publishedAt.toISOString(),
        images: [{ url: ogImageUrl, width: 1200, height: 675, alt: article.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.metaDescription,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: 'The Matchup Report' };
  }
}

/* ─── Helpers ────────────────────────────────────────────────── */
function formatTotal(val: number | null | undefined): string | null {
  if (val == null) return null;
  return `${val}`;
}

function isNegativeOdds(odds: string): boolean {
  return odds.startsWith('-');
}

function timeAgo(date: Date): string {
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function getExcerpt(content: string, maxLength = 120): string {
  const first = content.split(/\n\n+/)[0]?.trim() ?? '';
  const clean = first.replace(/\*\*/g, '').replace(/[#*_~`]/g, '');
  return clean.length <= maxLength ? clean : clean.slice(0, maxLength).trimEnd() + '…';
}

type ArticleWithGame = Awaited<
  ReturnType<typeof prisma.article.findUnique>
> & { game: Awaited<ReturnType<typeof prisma.game.findUnique>> };

/* ─── Odds Row ───────────────────────────────────────────────── */
function OddsRow({
  label,
  value,
  isHeader = false,
}: {
  label: string;
  value?: string | null;
  isHeader?: boolean;
}) {
  if (isHeader) {
    return (
      <div className="flex items-center px-4 py-2.5 bg-[#F3F4F6] border-b border-[#E5E7EB]">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
          {label}
        </span>
      </div>
    );
  }
  const isNeg = value ? isNegativeOdds(value) : false;
  return (
    <div className="flex items-center px-4 py-3 bg-white border-b border-[#E5E7EB] last:border-0">
      <span className="text-[14px] text-[#1A1A1A]">{label}</span>
      <span
        className={`ml-auto font-mono text-[15px] font-bold ${
          value ? (isNeg ? 'text-red-600' : 'text-green-700') : 'text-[#9CA3AF]'
        }`}
      >
        {value ?? 'N/A'}
      </span>
    </div>
  );
}

/* ─── Sidebar item ───────────────────────────────────────────── */
function SidebarStoryItem({
  article,
  index,
}: {
  article: { id: string; title: string; sport: string; slug: string; publishedAt: Date };
  index: number;
}) {
  return (
    <Link
      href={`/${article.sport}/${article.slug}`}
      className="group flex items-start gap-3 py-3 border-b border-[#E5E7EB] last:border-0"
    >
      <span
        className={`font-serif text-[20px] font-bold leading-none shrink-0 ${
          index < 2 ? 'text-[#FF6B2C]' : 'text-[#D1D5DB]'
        }`}
      >
        {index + 1}
      </span>
      <p className="text-[12px] font-semibold text-[#1A1A1A] group-hover:text-[#FF6B2C] leading-snug transition-colors">
        {article.title}
      </p>
    </Link>
  );
}

/* ─── Related article card ───────────────────────────────────── */
function RelatedCard({
  article,
}: {
  article: {
    id: string;
    title: string;
    sport: string;
    slug: string;
    publishedAt: Date;
    featuredImageUrl: string | null;
    imageAlt: string | null;
    articleType?: string | null;
    evergreenData?: unknown;
  };
}) {
  const isEg = article.articleType && article.articleType !== 'game';
  return (
    <Link href={`/${article.sport}/${article.slug}`} className="group block">
      <div className="relative w-full bg-[#D1D5DB] mb-3 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : isEg ? (
          <EvergreenCardThumbnail
            evergreenData={article.evergreenData ?? null}
            sport={article.sport}
            label={EVERGREEN_LABEL[article.articleType!] ?? 'Analysis'}
            articleType={article.articleType!}
          />
        ) : (
          <MatchupImage
            slug={article.slug}
            alt={article.imageAlt ?? article.title}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        )}
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
          {article.sport.toUpperCase()}
        </span>
        <span className="text-[11px] text-[#9CA3AF]">{timeAgo(article.publishedAt)}</span>
      </div>
      <h3 className="font-serif text-[15px] font-bold text-[#1A1A1A] leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-3">
        {article.title}
      </h3>
    </Link>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default async function ArticlePage({ params }: Props) {
  const { sport, slug } = await params;

  let article: ArticleWithGame | null = null;
  try {
    article = await prisma.article.findUnique({
      where: { slug },
      include: { game: true },
    }) as ArticleWithGame | null;
  } catch {
    notFound();
  }

  if (!article || article.sport !== sport) notFound();

  const game = article.game!;
  const EVERGREEN_TYPES = new Set([
    'power-rankings', 'win-totals', 'matchup-cheat-sheet',
    'betting-trends', 'playoff-picture', 'award-races', 'team-profile',
  ]);
  const isEvergreen = EVERGREEN_TYPES.has(article.articleType ?? '');
  const evergreenLabel: Record<string, string> = {
    'power-rankings': 'Power Rankings',
    'win-totals': 'Win-Total Tracker',
    'matchup-cheat-sheet': 'Cheat Sheet',
    'betting-trends': 'Betting Trends',
    'playoff-picture': 'Playoff Picture',
    'award-races': 'Award Races',
    'team-profile': 'Team Profile',
  };
  const evergreenBadge = isEvergreen
    ? (evergreenLabel[article.articleType] ?? 'Analysis')
    : null;

  // Related articles
  let related: {
    id: string;
    title: string;
    sport: string;
    slug: string;
    publishedAt: Date;
    featuredImageUrl: string | null;
    imageAlt: string | null;
    articleType: string | null;
    evergreenData: unknown;
  }[] = [];
  try {
    related = await prisma.article.findMany({
      where: { sport, slug: { not: slug } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        sport: true,
        slug: true,
        publishedAt: true,
        featuredImageUrl: true,
        imageAlt: true,
        articleType: true,
        evergreenData: true,
      },
    });
  } catch { /* ignore */ }

  // Sidebar lists
  let latestSportPosts: {
    id: string;
    title: string;
    sport: string;
    slug: string;
    publishedAt: Date;
  }[] = [];
  let mostRead: {
    id: string;
    title: string;
    sport: string;
    slug: string;
    publishedAt: Date;
  }[] = [];
  try {
    [latestSportPosts, mostRead] = await Promise.all([
      getLatestSportPosts(sport, slug, 4),
      getMostReadPosts(5),
    ]);
  } catch { /* ignore */ }

  const gameDateTimeEt = formatEasternDateTimeFallback(game.scheduledAt);
  const publishedAtEt = formatEasternDateTimeFallback(article.publishedAt);


  const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${sport}/${slug}`;
  const authorName = getArticleAuthor(article, game);

  const paragraphs = stripRedundantPickCallouts(article.content, article.pick)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Odds
  const mlHome = formatAmericanOdds(game.moneylineHome);
  const mlAway = formatAmericanOdds(game.moneylineAway);
  const mlDraw = formatAmericanOdds(game.moneylineDraw);
  const isSoccer = sport === 'world-cup';
  const awaySpread = formatSpreadPoint(game.spreadAway);
  const homeSpread = formatSpreadPoint(game.spreadHome);
  const awaySpreadPrice = formatAmericanOdds(game.spreadAwayPrice);
  const homeSpreadPrice = formatAmericanOdds(game.spreadHomePrice);
  const total = formatTotal(game.total);
  const overPrice = formatAmericanOdds(game.overPrice);
  const underPrice = formatAmericanOdds(game.underPrice);

  const hasOdds =
    mlHome ||
    mlAway ||
    mlDraw ||
    awaySpread ||
    homeSpread ||
    total;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { '@type': 'Person', name: authorName },
    publisher: { '@type': 'Organization', name: 'The Matchup Report' },
    description: article.metaDescription,
  };

  return (
    <>
      <ArticleViewTracker articleId={article.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader activeSport={sport} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] mb-6">
          <Link href="/" className="hover:text-[#FF6B2C] transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/${sport}`} className="text-[#FF6B2C] capitalize hover:underline">
            {sport.toUpperCase()}
          </Link>
          <span>/</span>
          <span className="text-[#4B5563] truncate max-w-[200px]">
            {isEvergreen ? (evergreenBadge ?? 'Analysis') : `${game.awayTeam} vs ${game.homeTeam}`}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          {/* ── Main article column ── */}
          <main>
            {/* Article header */}
            <header className="mb-6">
              <h1 className="font-serif text-[28px] sm:text-[36px] font-bold text-[#1A1A1A] leading-[1.2] mb-4">
                {article.title.replace(/\*\*/g, '')}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white leading-none">
                      {getAuthorInitials(authorName)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1A1A1A] leading-none">
                      {authorName}
                    </p>
                    <LocalDateTime
                      iso={article.publishedAt.toISOString()}
                      fallback={publishedAtEt}
                      className="text-[11px] text-[#9CA3AF] leading-none mt-0.5"
                    />
                  </div>
                </div>
                <div className="w-px h-6 bg-[#E5E7EB]" />
                <span className="text-[13px] font-semibold text-[#FF6B2C] uppercase tracking-[0.05em]">
                  {isEvergreen && evergreenBadge ? evergreenBadge : sport.toUpperCase()}
                </span>
                <div className="ml-auto">
                  <ShareButtons url={articleUrl} title={article.title} />
                </div>
              </div>
            </header>

            {/* Featured image */}
            {article.featuredImageUrl ? (
              <>
                <div className="relative w-full mb-2" style={{ aspectRatio: '16/9' }}>
                  <Image
                    src={article.featuredImageUrl}
                    alt={article.imageAlt ?? `${game.awayTeam} vs ${game.homeTeam}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 900px"
                    priority
                  />
                </div>
                <p className="text-[11px] text-[#9CA3AF] mb-6">
                  {isEvergreen ? (
                    <>Updated <LocalDateTime iso={article.publishedAt.toISOString()} fallback={publishedAtEt} className="text-[11px] text-[#9CA3AF]" /></>
                  ) : (
                    <>{game.awayTeam} vs {game.homeTeam} ·{' '}
                    <LocalDateTime iso={game.scheduledAt.toISOString()} fallback={gameDateTimeEt} className="text-[11px] text-[#9CA3AF]" />
                    {article.imageCredit ? ` · Photo: ${article.imageCredit}` : ''}</>
                  )}
                </p>
              </>
            ) : isEvergreen ? (
              <>
                <div className="w-full mb-2">
                  <EvergreenHero
                    badge={evergreenBadge ?? 'Analysis'}
                    sport={sport}
                    articleType={article.articleType ?? ''}
                    evergreenData={article.evergreenData}
                  />
                </div>
                <p className="text-[11px] text-[#9CA3AF] mb-6">
                  Updated <LocalDateTime iso={article.publishedAt.toISOString()} fallback={publishedAtEt} className="text-[11px] text-[#9CA3AF]" />
                </p>
              </>
            ) : (
              <>
                <div className="relative w-full mb-2" style={{ aspectRatio: '16/9' }}>
                  <MatchupImage
                    slug={slug}
                    alt={article.imageAlt ?? `${game.awayTeam} vs ${game.homeTeam}`}
                    wide
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 900px"
                    priority
                  />
                </div>
                <p className="text-[11px] text-[#9CA3AF] mb-6">
                  {game.awayTeam} vs {game.homeTeam} ·{' '}
                  <LocalDateTime iso={game.scheduledAt.toISOString()} fallback={gameDateTimeEt} className="text-[11px] text-[#9CA3AF]" />
                </p>
              </>
            )}

            {/* Top ad */}
            <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 mb-8">
              <AdSlot position="top" />
            </div>

            {/* Intro paragraph with left accent — game articles only */}
            {!isEvergreen && paragraphs[0] && (
              <div className="border-l-4 border-[#FF6B2C] pl-4 mb-6">
                <p className="text-[16px] text-[#4B5563] leading-[1.75]">{paragraphs[0]}</p>
              </div>
            )}

            {/* Odds table — game articles only */}
            {!isEvergreen && hasOdds && (
              <section className="mb-8">
                <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] mb-4">
                  {isSoccer ? "Today's Odds" : "Tonight's Odds"}
                </h2>
                <div className="border border-[#E5E7EB] rounded overflow-hidden">
                  <OddsRow label="MONEYLINE" isHeader />
                  <OddsRow label={game.awayTeam} value={mlAway} />
                  {isSoccer && <OddsRow label="Draw" value={mlDraw} />}
                  <OddsRow label={game.homeTeam} value={mlHome} />
                  {!isSoccer && (awaySpread || homeSpread) && (
                    <>
                      <OddsRow label="RUN LINE" isHeader />
                      {awaySpread && (
                        <OddsRow
                          label={`${game.awayTeam} ${awaySpread}`}
                          value={awaySpreadPrice}
                        />
                      )}
                      {homeSpread && (
                        <OddsRow
                          label={`${game.homeTeam} ${homeSpread}`}
                          value={homeSpreadPrice}
                        />
                      )}
                    </>
                  )}
                  {total && (
                    <>
                      <OddsRow label={isSoccer ? 'GOALS OVER/UNDER' : 'OVER/UNDER'} isHeader />
                      <OddsRow label={`Over ${total}`} value={overPrice} />
                      <OddsRow label={`Under ${total}`} value={underPrice} />
                    </>
                  )}
                </div>
              </section>
            )}

            {!isEvergreen && <SportArticlePanels game={game} />}

            {/* Article body */}
            {isEvergreen ? (
              <EvergreenContent
                content={article.content}
                midAd={<AdSlot position="mid" />}
              />
            ) : (
              <div className="mb-8 space-y-4">
                {paragraphs.slice(1).map((para, i) => (
                  <div key={i}>
                    <p className="text-[16px] text-[#4B5563] leading-[1.75]">{para}</p>
                    {i === 1 && (
                      <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 my-6">
                        <AdSlot position="mid" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Best Bet box — game articles only */}
            {!isEvergreen && (
              <section className="border-l-4 border-[#FF6B2C] bg-[#FFF7ED] p-6 rounded-r mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#FF6B2C] mb-2">
                  Best Bet
                </p>
                <p className="font-serif text-[28px] font-bold text-[#1A1A1A] mb-4">
                  {article.pick}
                </p>
                <p className="text-[14px] text-[#4B5563] leading-relaxed">
                  Based on the matchup analysis, recent form, and line value, {article.pick} is our
                  top play for this game.
                </p>
              </section>
            )}

            {/* Team page links — game articles only */}
            {!isEvergreen && (
              <div className="flex flex-wrap gap-3 mb-8">
                <Link
                  href={`/teams/${teamNameToSlug(game.awayTeam)}`}
                  className="inline-flex items-center gap-1.5 border border-[#E5E7EB] rounded px-4 py-2.5 text-[13px] font-semibold text-[#1A1A1A] hover:border-[#FF6B2C] hover:text-[#FF6B2C] transition-colors"
                >
                  <span className="text-[#9CA3AF]">All</span>
                  {game.awayTeam} Predictions
                </Link>
                <Link
                  href={`/teams/${teamNameToSlug(game.homeTeam)}`}
                  className="inline-flex items-center gap-1.5 border border-[#E5E7EB] rounded px-4 py-2.5 text-[13px] font-semibold text-[#1A1A1A] hover:border-[#FF6B2C] hover:text-[#FF6B2C] transition-colors"
                >
                  <span className="text-[#9CA3AF]">All</span>
                  {game.homeTeam} Predictions
                </Link>
              </div>
            )}

            {/* Bottom ad */}
            <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 mb-8">
              <AdSlot position="bottom" />
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <section>
                <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-5">
                  <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                  <h2 className="font-sans text-base font-bold text-[#1A1A1A]">
                    More {sport.toUpperCase()} Predictions
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {related.map((a) => (
                    <RelatedCard key={a.id} article={a} />
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block space-y-8">
            {/* 300×250 ad */}
            <div className="border border-[#E5E7EB] bg-[#F3F4F6] flex items-center justify-center h-[250px] w-[300px]">
              <AdSlot position="top" />
            </div>

            {/* Most Read */}
            <div>
              <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-4">
                <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                <h3 className="font-sans text-[12px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                  Most Read
                </h3>
              </div>
              {mostRead.map((a, i) => (
                <SidebarStoryItem key={a.id} article={a} index={i} />
              ))}
            </div>

            {/* Latest posts */}
            <div>
              <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-4">
                <div className="w-1 h-5 bg-[#1A1A1A] rounded-sm" />
                <h3 className="font-sans text-[12px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                  Latest {sport.toUpperCase()} Posts
                </h3>
              </div>
              {latestSportPosts.map((a) => (
                <Link
                  key={a.id}
                  href={`/${a.sport}/${a.slug}`}
                  className="group flex flex-col py-3 border-b border-[#E5E7EB] last:border-0"
                >
                  <p className="text-[12px] font-semibold text-[#1A1A1A] group-hover:text-[#FF6B2C] leading-snug transition-colors line-clamp-2">
                    {a.title}
                  </p>
                  <span className="text-[11px] text-[#9CA3AF] mt-1">{timeAgo(a.publishedAt)}</span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
