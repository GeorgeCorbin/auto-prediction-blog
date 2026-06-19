import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AdSlot } from '@/components/AdSlot';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'MLB Predictions',
  description:
    'Daily MLB game predictions with expert analysis. Picks backed by starting pitcher stats, team trends, and betting line value.',
};

async function getMlbArticles() {
  try {
    return await prisma.article.findMany({
      where: { sport: 'mlb' },
      orderBy: { publishedAt: 'desc' },
      include: { game: true },
    });
  } catch {
    return [];
  }
}

function timeAgo(date: Date): string {
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function formatGameDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatGameTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' ET';
}

function getExcerpt(content: string, maxLength = 160): string {
  const first = content.split(/\n\n+/)[0]?.trim() ?? '';
  return first.length <= maxLength ? first : first.slice(0, maxLength).trimEnd() + '…';
}

type ArticleWithGame = Awaited<ReturnType<typeof getMlbArticles>>[number];

function ArticleListRow({ article }: { article: ArticleWithGame }) {
  const game = article.game;
  return (
    <Link
      href={`/mlb/${article.slug}`}
      className="group flex gap-5 py-5 border-b border-[#E5E7EB] last:border-0 items-start"
    >
      {/* Image thumbnail */}
      <div className="relative hidden sm:block w-[100px] h-[72px] bg-[#D1D5DB] shrink-0 overflow-hidden">
        {article.featuredImageUrl && (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="100px"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 text-[11px] text-[#9CA3AF]">
          <span>{formatGameDate(game.scheduledAt)}</span>
          <span>·</span>
          <span>{formatGameTime(game.scheduledAt)}</span>
          <span>·</span>
          <span>{timeAgo(article.publishedAt)}</span>
        </div>
        <h2 className="font-serif text-[18px] font-bold text-[#1A1A1A] leading-snug mb-2 group-hover:text-[#FF6B2C] transition-colors">
          {article.title}
        </h2>
        <p className="text-[14px] text-[#4B5563] leading-relaxed line-clamp-2">
          {getExcerpt(article.content)}
        </p>
        <span className="mt-2 inline-block text-[12px] font-medium text-[#FF6B2C] group-hover:underline transition-colors">
          Read analysis →
        </span>
      </div>

      {/* Pick badge */}
      <div className="shrink-0 hidden sm:block">
        <div className="border border-[#FF6B2C] bg-[#FFF7ED] px-4 py-2.5 text-center min-w-[90px]">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#FF6B2C] mb-0.5">Pick</p>
          <p className="font-sans text-[14px] font-bold text-[#1A1A1A]">{article.pick}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function MlbPage() {
  const articles = await getMlbArticles();
  const featuredArticles = articles.slice(0, 3);
  const listArticles = articles.slice(3);

  return (
    <>
      <SiteHeader activeSport="mlb" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Page header */}
        <div className="border-b-2 border-[#1A1A1A] pb-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#FF6B2C] rounded-sm" />
            <div>
              <h1 className="font-serif text-[32px] font-bold text-[#1A1A1A] leading-none">
                MLB Predictions
              </h1>
              <p className="text-[14px] text-[#9CA3AF] mt-1">
                Daily game previews, odds analysis, and picks — updated before first pitch.
              </p>
            </div>
          </div>
        </div>

        {articles.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            {/* Main content */}
            <div>
              {/* Top ad */}
              <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 mb-8">
                <AdSlot position="top" />
              </div>

              {/* Featured cards */}
              {featuredArticles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                  {featuredArticles.map((article) => (
                    <FeaturedCard key={article.id} article={article} />
                  ))}
                </div>
              )}

              {/* Article list */}
              {listArticles.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-2">
                    <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                    <h2 className="font-sans text-[14px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                      All MLB Picks
                    </h2>
                  </div>
                  {listArticles.map((article) => (
                    <ArticleListRow key={article.id} article={article} />
                  ))}
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block space-y-8">
              <div className="border border-[#E5E7EB] bg-[#F3F4F6] flex items-center justify-center h-[250px]">
                <AdSlot position="mid" />
              </div>

              <div>
                <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-4">
                  <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                  <h3 className="font-sans text-[12px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                    Latest Picks
                  </h3>
                </div>
                {articles.slice(0, 5).map((article, i) => (
                  <Link
                    key={article.id}
                    href={`/mlb/${article.slug}`}
                    className="group flex items-start gap-3 py-3 border-b border-[#E5E7EB] last:border-0"
                  >
                    <span
                      className={`font-serif text-[20px] font-bold leading-none shrink-0 ${
                        i < 2 ? 'text-[#FF6B2C]' : 'text-[#D1D5DB]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[12px] font-semibold text-[#1A1A1A] group-hover:text-[#FF6B2C] leading-snug transition-colors">
                      {article.title}
                    </p>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>

      <SiteFooter />
    </>
  );
}

function FeaturedCard({ article }: { article: ArticleWithGame }) {
  const game = article.game;
  return (
    <Link href={`/mlb/${article.slug}`} className="group block">
      <div className="relative w-full bg-[#D1D5DB] mb-3 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {article.featuredImageUrl && (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 280px"
          />
        )}
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
          MLB
        </span>
        <span className="text-[11px] text-[#9CA3AF]">{formatGameTime(game.scheduledAt)}</span>
      </div>
      <h3 className="font-serif text-[16px] font-bold text-[#1A1A1A] leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-3 mb-1.5">
        {article.title}
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#9CA3AF]">The Matchup Report</span>
        <span className="text-[11px] text-[#9CA3AF]">·</span>
        <span className="text-[11px] font-bold text-[#1A1A1A]">{article.pick}</span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border border-[#E5E7EB] bg-[#F9FAFB] px-8 py-16 text-center">
      <p className="text-[#1A1A1A] text-lg font-semibold mb-2">No MLB picks yet</p>
      <p className="text-[#9CA3AF] text-sm">
        Check back soon — picks are generated automatically before each game.
      </p>
    </div>
  );
}
