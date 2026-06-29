import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllEvergreenArticles, getMostReadArticles } from '@/lib/articles/queries';
import { EvergreenCardThumbnail } from '@/components/EvergreenCardThumbnail';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AdSlot } from '@/components/AdSlot';

export const revalidate = 1800;

const EVERGREEN_LABEL: Record<string, string> = {
  'power-rankings': 'Power Rankings',
  'win-totals': 'Win Totals',
  'matchup-cheat-sheet': 'Cheat Sheet',
  'betting-trends': 'Betting Trends',
  'playoff-picture': 'Playoff Picture',
  'award-races': 'Award Races',
  'team-profile': 'Team Profile',
};

export const metadata: Metadata = {
  title: 'Analysis & Insights',
  description:
    'Expert sports analysis, power rankings, betting trends, and more from The Matchup Report.',
};

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SportTag({ sport }: { sport: string }) {
  return (
    <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
      {sport.toUpperCase()}
    </span>
  );
}

function FilterPill({
  label,
  value,
  param,
  active,
  otherParams,
}: {
  label: string;
  value: string;
  param: string;
  active: boolean;
  otherParams?: Record<string, string>;
}) {
  const params = new URLSearchParams(otherParams);
  if (!active) params.set(param, value);
  const qs = params.toString();
  const href = qs ? `/analysis?${qs}` : '/analysis';
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full border transition-colors ${
        active
          ? 'bg-[#FF6B2C] text-white border-[#FF6B2C]'
          : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#FF6B2C] hover:text-[#FF6B2C]'
      }`}
    >
      {label}
    </Link>
  );
}

type PageProps = {
  searchParams: Promise<{ sport?: string; type?: string }>;
};

export default async function AnalysisPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filterSport = sp.sport ?? null;
  const filterType = sp.type ?? null;

  const [allArticles, mostReadArticles] = await Promise.all([
    getAllEvergreenArticles(100),
    getMostReadArticles(5),
  ]);

  // Derive available filter options from the data
  const uniqueSports = [...new Set(allArticles.map((a) => a.sport))].sort();
  const uniqueTypes = [...new Set(allArticles.map((a) => a.articleType))].sort();
  const showSportFilter = uniqueSports.length > 1;
  const showTypeFilter = uniqueTypes.length > 1;

  // Apply filters
  const filtered = allArticles.filter((a) => {
    if (filterSport && a.sport !== filterSport) return false;
    if (filterType && a.articleType !== filterType) return false;
    return true;
  });

  return (
    <>
      <SiteHeader activeSport="analysis" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="border-b-2 border-[#1A1A1A] pb-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#FF6B2C] rounded-sm" />
            <div>
              <h1 className="font-serif text-[28px] sm:text-[32px] font-bold text-[#1A1A1A] leading-none">
                Analysis &amp; Insights
              </h1>
              <p className="text-[14px] text-[#9CA3AF] mt-1">
                Expert analysis, power rankings, betting trends, and more
              </p>
            </div>
          </div>
        </div>

        {/* Filters — only show when more than one option exists */}
        {(showSportFilter || showTypeFilter) && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {showSportFilter && (
              <>
                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mr-1">Sport:</span>
                {uniqueSports.map((s) => (
                  <FilterPill key={s} label={s.toUpperCase()} value={s} param="sport" active={filterSport === s} otherParams={filterType ? { type: filterType } : undefined} />
                ))}
              </>
            )}
            {showSportFilter && showTypeFilter && (
              <span className="w-px h-5 bg-[#E5E7EB] mx-1" />
            )}
            {showTypeFilter && (
              <>
                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mr-1">Type:</span>
                {uniqueTypes.map((t) => (
                  <FilterPill key={t} label={EVERGREEN_LABEL[t] ?? t} value={t} param="type" active={filterType === t} otherParams={filterSport ? { sport: filterSport } : undefined} />
                ))}
              </>
            )}
          </div>
        )}

        <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 mb-8">
          <AdSlot position="top" />
        </div>

        {filtered.length === 0 ? (
          <div className="border border-[#E5E7EB] bg-[#F9FAFB] px-8 py-16 text-center">
            <p className="text-[#1A1A1A] text-lg font-semibold mb-2">
              {filterSport || filterType ? 'No articles match your filters' : 'No analysis articles yet'}
            </p>
            <p className="text-[#9CA3AF] text-sm">
              {filterSport || filterType ? (
                <Link href="/analysis" className="text-[#FF6B2C] hover:underline">Clear filters</Link>
              ) : (
                'Check back soon — analysis articles are generated on a regular schedule.'
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            {/* Main content grid */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((a) => {
                  const author = a.author ?? undefined;
                  return (
                    <Link
                      key={a.id}
                      href={`/${a.sport}/${a.slug}`}
                      className="group flex flex-col border border-[#E5E7EB] rounded overflow-hidden hover:border-[#FF6B2C] transition-colors"
                    >
                      <div className="relative w-full bg-[#F3F4F6]" style={{ aspectRatio: '16/9' }}>
                        {a.featuredImageUrl ? (
                          <Image
                            src={a.featuredImageUrl}
                            alt={a.imageAlt ?? a.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        ) : (
                          <EvergreenCardThumbnail
                            evergreenData={a.evergreenData}
                            sport={a.sport}
                            label={EVERGREEN_LABEL[a.articleType] ?? 'Analysis'}
                            articleType={a.articleType}
                          />
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <SportTag sport={a.sport} />
                          <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                            {EVERGREEN_LABEL[a.articleType] ?? 'Analysis'}
                          </span>
                        </div>
                        <h3 className="font-serif text-[15px] font-bold text-[#1A1A1A] leading-snug group-hover:text-[#FF6B2C] transition-colors line-clamp-2 mb-2">
                          {a.title}
                        </h3>
                        <div className="mt-auto flex items-center gap-2">
                          {author && (
                            <span className="text-[11px] text-[#9CA3AF]">{author}</span>
                          )}
                          <span className="text-[11px] text-[#D1D5DB]">·</span>
                          <span className="text-[11px] text-[#9CA3AF]">{timeAgo(a.publishedAt)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block space-y-8">
              <div className="border border-[#E5E7EB] bg-[#F3F4F6] flex items-center justify-center h-[250px] w-[300px]">
                <AdSlot position="top" />
              </div>

              {mostReadArticles.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-4">
                    <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
                    <h3 className="font-sans text-[12px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                      Most Read
                    </h3>
                  </div>
                  {mostReadArticles.map((a, i) => (
                    <Link
                      key={a.id}
                      href={`/${a.sport}/${a.slug}`}
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
                        {a.title}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      <SiteFooter />
    </>
  );
}
