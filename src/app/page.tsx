import Image from 'next/image';
import Link from 'next/link';
import { getArticleAuthor } from '@/lib/authors';
import { prisma } from '@/lib/db';
import { MatchupImage } from '@/components/MatchupImage';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AdSlot } from '@/components/AdSlot';
import { LocalDateTime } from '@/components/LocalDateTime';
import { formatEasternDateTimeFallback } from '@/lib/dates';
import { getActiveSports } from '@/lib/sports/config';

export const revalidate = 1800;

async function getLatestArticlesBySport(sport: string, take = 5) {
  try {
    return await prisma.article.findMany({
      where: { sport },
      take,
      orderBy: { publishedAt: 'desc' },
      include: { game: true },
    });
  } catch {
    return [];
  }
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function getExcerpt(content: string, maxLength = 160): string {
  const first = content.split(/\n\n+/)[0]?.trim() ?? '';
  return first.length <= maxLength ? first : first.slice(0, maxLength).trimEnd() + '…';
}

type ArticleWithGame = Awaited<ReturnType<typeof getLatestArticlesBySport>>[number];

function SportTag({ sport }: { sport: string }) {
  return (
    <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
      {sport.toUpperCase()}
    </span>
  );
}

function SectionHeading({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-5">
      <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm shrink-0" />
      <h2 className="font-sans text-base font-bold text-[#1A1A1A] tracking-tight">{children}</h2>
      {href && (
        <Link href={href} className="ml-auto text-[13px] text-[#FF6B2C] hover:underline shrink-0">
          See All →
        </Link>
      )}
    </div>
  );
}

function FeaturedCard({ article }: { article: ArticleWithGame }) {
  const game = article.game;
  const authorName = getArticleAuthor(article, game);
  return (
    <Link href={`/${article.sport}/${article.slug}`} className="group block">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 800px"
          />
        ) : (
          <MatchupImage
            slug={article.slug}
            alt={article.imageAlt ?? article.title}
            wide
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 800px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-5 flex items-center gap-2">
          <SportTag sport={article.sport} />
          <span className="text-white text-[12px]">{timeAgo(article.publishedAt)}</span>
        </div>
      </div>
      <div className="pt-4">
        <h2 className="font-serif text-[26px] sm:text-[30px] font-bold text-[#1A1A1A] leading-[1.2] mb-3 group-hover:text-[#FF6B2C] transition-colors">
          {article.title}
        </h2>
        <div className="flex items-center gap-3 mb-3 text-[12px] text-[#9CA3AF]">
          {authorName && <span>By {authorName}</span>}
          {authorName && <span>·</span>}
          <span>{timeAgo(article.publishedAt)}</span>
        </div>
        <p className="text-[15px] text-[#4B5563] leading-relaxed line-clamp-2">
          {getExcerpt(article.content)}
        </p>
      </div>
    </Link>
  );
}

function GridCard({ article }: { article: ArticleWithGame }) {
  const game = article.game;
  const authorName = getArticleAuthor(article, game);
  return (
    <Link href={`/${article.sport}/${article.slug}`} className="group block">
      <div className="relative w-full mb-3 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
          />
        ) : (
          <MatchupImage
            slug={article.slug}
            alt={article.imageAlt ?? article.title}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 240px"
          />
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <SportTag sport={article.sport} />
        <LocalDateTime
          iso={article.publishedAt.toISOString()}
          fallback={formatEasternDateTimeFallback(article.publishedAt)}
          className="text-[11px] text-[#9CA3AF]"
        />
      </div>
      <h3 className="font-serif text-[16px] font-bold text-[#1A1A1A] leading-[1.3] mb-2 group-hover:text-[#FF6B2C] transition-colors line-clamp-3">
        {article.title}
      </h3>
      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
        {authorName && <span>{authorName}</span>}
      </div>
    </Link>
  );
}

function SidebarItem({ article, index }: { article: ArticleWithGame; index: number }) {
  return (
    <Link
      href={`/${article.sport}/${article.slug}`}
      className="group flex items-start gap-3 py-3 border-b border-[#E5E7EB] last:border-0"
    >
      <span
        className={`font-serif text-[22px] font-bold leading-none shrink-0 ${
          index < 2 ? 'text-[#FF6B2C]' : 'text-[#D1D5DB]'
        }`}
      >
        {index + 1}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-[#1A1A1A] group-hover:text-[#FF6B2C] leading-snug transition-colors">
          {article.title}
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1">{timeAgo(article.publishedAt)}</p>
      </div>
    </Link>
  );
}

function CompactRow({ article }: { article: ArticleWithGame }) {
  return (
    <Link
      href={`/${article.sport}/${article.slug}`}
      className="group flex items-start gap-3 py-3 border-b border-[#E5E7EB] last:border-0"
    >
      <div className="relative w-[80px] h-[58px] shrink-0 overflow-hidden">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="80px"
          />
        ) : (
          <MatchupImage
            slug={article.slug}
            alt={article.imageAlt ?? article.title}
            sizes="80px"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <SportTag sport={article.sport} />
          <span className="text-[10px] text-[#9CA3AF]">{timeAgo(article.publishedAt)}</span>
        </div>
        <p className="text-[13px] font-semibold text-[#1A1A1A] group-hover:text-[#FF6B2C] leading-snug transition-colors line-clamp-2">
          {article.title}
        </p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const activeSports = getActiveSports();
  const primarySport = activeSports[0]?.key ?? 'mlb';
  const articles = await getLatestArticlesBySport(primarySport, 10);
  const sportSections = await Promise.all(
    activeSports.map(async (sport) => ({
      sport,
      articles: await getLatestArticlesBySport(sport.key, 4),
    })),
  );
  const [featured, ...rest] = articles;
  const sidebarArticles = articles.slice(0, 5);
  const compactArticles = rest.slice(4, 7);

  return (
    <>
      <SiteHeader activeSport={primarySport} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <AdSlot position="top" />
        </div>

        {articles.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 mb-12">
              <div>{featured && <FeaturedCard article={featured} />}</div>
              <aside className="hidden lg:block">
                <SectionHeading>Latest Predictions</SectionHeading>
                <div>
                  {sidebarArticles.map((article, i) => (
                    <SidebarItem key={article.id} article={article} index={i} />
                  ))}
                </div>
              </aside>
            </div>

            {sportSections.map(({ sport, articles: sportArticles }) =>
              sportArticles.length > 0 ? (
                <section key={sport.key} className="mb-12">
                  <SectionHeading href={`/${sport.key}`}>
                    {sport.label} Predictions
                  </SectionHeading>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sportArticles.map((article) => (
                      <GridCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              ) : null,
            )}

            <div className="border-t border-b border-[#E5E7EB] py-4 mb-12 bg-[#F3F4F6]">
              <AdSlot position="mid" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
              <section>
                <SectionHeading>Best Predictions</SectionHeading>
                {compactArticles.length > 0 ? (
                  <div>
                    {compactArticles.map((article) => (
                      <CompactRow key={article.id} article={article} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[#9CA3AF] text-[14px]">More picks coming soon.</p>
                )}
              </section>

              <aside className="hidden lg:block">
                <SectionHeading>Most Read Today</SectionHeading>
                <div>
                  {sidebarArticles.map((article, i) => (
                    <SidebarItem key={article.id} article={article} index={i} />
                  ))}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function EmptyState() {
  return (
    <div className="border border-[#E5E7EB] bg-[#F9FAFB] rounded px-8 py-16 text-center">
      <p className="text-[#1A1A1A] text-lg font-semibold mb-2">Predictions are on the way</p>
      <p className="text-[#9CA3AF] text-sm">
        Check back soon — picks are generated automatically before each game.
      </p>
    </div>
  );
}
