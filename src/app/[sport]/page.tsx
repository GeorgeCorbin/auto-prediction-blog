import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleAuthor } from '@/lib/authors';
import { getLatestArticlesBySport, getMostReadArticles, getEvergreenArticlesBySport } from '@/lib/articles/queries';
import { EvergreenCardThumbnail } from '@/components/EvergreenCardThumbnail';
import { MatchupImage } from '@/components/MatchupImage';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AdSlot } from '@/components/AdSlot';
import { LocalDateTime } from '@/components/LocalDateTime';
import { formatEasternDateTimeFallback } from '@/lib/dates';
import { getSportConfig, isSportInSeason } from '@/lib/sports/config';

export const revalidate = 1800;

type Props = {
  params: Promise<{ sport: string }>;
};

const SPORT_DESCRIPTIONS: Record<string, string> = {
  mlb: 'Daily MLB game predictions with expert analysis. Picks backed by starting pitcher stats, team trends, and betting line value.',
  'world-cup': 'FIFA World Cup match predictions with form analysis, group context, and 3-way moneyline value.',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport } = await params;
  const config = getSportConfig(sport);
  if (!config || !config.enabled || !isSportInSeason(config)) return { title: 'Sport Not Found' };

  return {
    title: `${config.label} Predictions`,
    description: SPORT_DESCRIPTIONS[sport] ?? `Daily ${config.label} predictions and expert analysis.`,
  };
}

async function getSportArticles(sport: string) {
  return getLatestArticlesBySport(sport, 1000);
}

function getExcerpt(content: string, maxLength = 160): string {
  const first = content.split(/\n\n+/)[0]?.trim() ?? '';
  const clean = first.replace(/\*\*/g, '').replace(/[#*_~`]/g, '');
  return clean.length <= maxLength ? clean : clean.slice(0, maxLength).trimEnd() + '…';
}

type ArticleWithGame = Awaited<ReturnType<typeof getSportArticles>>[number];

function ArticleListRow({ article, sport }: { article: ArticleWithGame; sport: string }) {
  return (
    <Link
      href={`/${sport}/${article.slug}`}
      className="group flex gap-5 py-5 border-b border-[#E5E7EB] last:border-0 items-start"
    >
      <div className="relative hidden sm:block w-[100px] h-[72px] shrink-0 overflow-hidden">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="100px"
          />
        ) : (
          <MatchupImage
            slug={article.slug}
            alt={article.imageAlt ?? article.title}
            sizes="100px"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 text-[11px] text-[#9CA3AF]">
          <LocalDateTime
            iso={article.publishedAt.toISOString()}
            fallback={formatEasternDateTimeFallback(article.publishedAt)}
            className="text-[11px] text-[#9CA3AF]"
          />
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
    </Link>
  );
}

function FeaturedCard({ article, sport, label }: { article: ArticleWithGame; sport: string; label: string }) {
  const game = article.game;
  const authorName = getArticleAuthor(article, game);
  return (
    <Link href={`/${sport}/${article.slug}`} className="group block">
      <div className="relative w-full mb-3 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 280px"
          />
        ) : (
          <MatchupImage
            slug={article.slug}
            alt={article.imageAlt ?? article.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 280px"
          />
        )}
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
          {label}
        </span>
        <LocalDateTime
          iso={article.publishedAt.toISOString()}
          fallback={formatEasternDateTimeFallback(article.publishedAt)}
          className="text-[11px] text-[#9CA3AF]"
        />
      </div>
      <h3 className="font-serif text-[16px] font-bold text-[#1A1A1A] leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-3 mb-1.5">
        {article.title}
      </h3>
      {authorName && <span className="text-[11px] text-[#9CA3AF]">{authorName}</span>}
    </Link>
  );
}

const EVERGREEN_LABEL: Record<string, string> = {
  'power-rankings': 'Power Rankings',
  'win-totals': 'Win-Total Tracker',
  'matchup-cheat-sheet': 'Cheat Sheet',
  'betting-trends': 'Betting Trends',
  'playoff-picture': 'Playoff Picture',
  'award-races': 'Award Races',
  'team-profile': 'Team Profile',
};

export default async function SportIndexPage({ params }: Props) {
  const { sport } = await params;
  const config = getSportConfig(sport);
  if (!config || !config.enabled || !isSportInSeason(config)) notFound();

  const [articles, mostReadArticles, evergreenArticles] = await Promise.all([
    getSportArticles(sport),
    getMostReadArticles(5, sport),
    getEvergreenArticlesBySport(sport, 3),
  ]);
  const featuredArticles = articles.slice(0, 3);
  const listArticles = articles.slice(3);
  const tagline =
    SPORT_DESCRIPTIONS[sport]?.split('.')[0] ??
    `Daily ${config.label} game previews and picks.`;

  return (
    <>
      <SiteHeader activeSport={sport} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="border-b-2 border-[#1A1A1A] pb-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#FF6B2C] rounded-sm" />
            <div>
              <h1 className="font-serif text-[32px] font-bold text-[#1A1A1A] leading-none">
                {config.label} Predictions
              </h1>
              <p className="text-[14px] text-[#9CA3AF] mt-1">{tagline}</p>
            </div>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="border border-[#E5E7EB] bg-[#F9FAFB] px-8 py-16 text-center">
            <p className="text-[#1A1A1A] text-lg font-semibold mb-2">No {config.label} picks yet</p>
            <p className="text-[#9CA3AF] text-sm">
              Check back soon — picks are generated automatically before each match.
            </p>
          </div>
        ) : (
          <>
          <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 mb-8">
            <AdSlot position="top" />
          </div>

          {evergreenArticles.length >= 3 && (
            <section className="mb-10">
              <div className="flex items-center gap-3 border-b-2 border-[#1A1A1A] pb-3 mb-5">
                <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                <h2 className="font-sans text-base font-bold text-[#1A1A1A] tracking-tight">
                  {config.label} Analysis &amp; Insights
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {evergreenArticles.map((a) => {
                  const author = a.author ?? undefined;
                  return (
                    <Link key={a.id} href={`/${sport}/${a.slug}`} className="group flex flex-col border border-[#E5E7EB] rounded overflow-hidden hover:border-[#FF6B2C] transition-colors">
                      <div className="relative w-full bg-[#F3F4F6]" style={{ aspectRatio: '16/9' }}>
                        {a.featuredImageUrl ? (
                          <Image src={a.featuredImageUrl} alt={a.imageAlt ?? a.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 100vw, 33vw" />
                        ) : (
                          <EvergreenCardThumbnail evergreenData={a.evergreenData} sport={a.sport} label={EVERGREEN_LABEL[a.articleType] ?? 'Analysis'} articleType={a.articleType} />
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                          {EVERGREEN_LABEL[a.articleType] ?? 'Analysis'}
                        </span>
                        <h3 className="font-serif text-[15px] font-bold text-[#1A1A1A] leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-2 mb-2">
                          {a.title}
                        </h3>
                        {author && (
                          <p className="text-[11px] text-[#9CA3AF] mt-auto">{author}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 text-right">
                <Link
                  href="/analysis"
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#FF6B2C] hover:underline"
                >
                  See all analysis →
                </Link>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            <div>
              {featuredArticles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                  {featuredArticles.map((article) => (
                    <FeaturedCard
                      key={article.id}
                      article={article}
                      sport={sport}
                      label={config.label}
                    />
                  ))}
                </div>
              )}

              {listArticles.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-2">
                    <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                    <h2 className="font-sans text-[14px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                      All {config.label} Previews
                    </h2>
                  </div>
                  {listArticles.map((article) => (
                    <ArticleListRow key={article.id} article={article} sport={sport} />
                  ))}
                </section>
              )}
            </div>

            <aside className="hidden lg:block space-y-8">
              <div className="border border-[#E5E7EB] bg-[#F3F4F6] flex items-center justify-center h-[250px]">
                <AdSlot position="mid" />
              </div>
              <div>
                <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-4">
                  <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                  <h3 className="font-sans text-[12px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                    Most Read
                  </h3>
                </div>
                {mostReadArticles.map((article, i) => (
                  <Link
                    key={article.id}
                    href={`/${sport}/${article.slug}`}
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
          </>
        )}
      </div>

      <SiteFooter />
    </>
  );
}
