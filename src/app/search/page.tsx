import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchForm } from '@/components/SearchForm';
import { searchArticles } from '@/lib/search';

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    return {
      title: 'Search',
      description: 'Search The Matchup Report for sports predictions, game previews, and betting analysis.',
    };
  }

  return {
    title: `Search: ${query}`,
    description: `Search results for "${query}" on The Matchup Report.`,
  };
}

function timeAgo(date: Date): string {
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

function formatGameDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getExcerpt(content: string, maxLength = 160): string {
  const first = content.split(/\n\n+/)[0]?.trim() ?? '';
  return first.length <= maxLength ? first : first.slice(0, maxLength).trimEnd() + '…';
}

type SearchResult = Awaited<ReturnType<typeof searchArticles>>[number];

function SearchResultRow({ article }: { article: SearchResult }) {
  const game = article.game;

  return (
    <Link
      href={`/${article.sport}/${article.slug}`}
      className="group flex gap-5 py-5 border-b border-[#E5E7EB] last:border-0 items-start"
    >
      <div className="hidden sm:block w-[100px] h-[72px] bg-[#D1D5DB] shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 text-[11px] text-[#9CA3AF]">
          <span className="inline-flex items-center bg-[#FEF3EE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FF6B2C] rounded-sm">
            {article.sport.toUpperCase()}
          </span>
          <span>{formatGameDate(game.scheduledAt)}</span>
          <span>·</span>
          <span>{game.awayTeam} @ {game.homeTeam}</span>
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
    </Link>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const results = query ? await searchArticles(query) : [];

  return (
    <>
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
        <div className="mb-10 border-b-2 border-[#E5E7EB] pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-[#FF6B2C] rounded-sm shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF6B2C]">
              Search
            </span>
          </div>
          <h1 className="font-serif text-[36px] sm:text-[44px] font-bold text-[#1A1A1A] leading-[1.15] mb-6">
            {query ? `Results for "${query}"` : 'Search Predictions'}
          </h1>
          <SearchForm key={query} defaultQuery={query} className="max-w-xl" />
        </div>

        {!query ? (
          <p className="text-[15px] text-[#4B5563] leading-relaxed">
            Search by team name, matchup, pick, or keywords from our game previews and analysis.
          </p>
        ) : results.length === 0 ? (
          <div className="border border-[#E5E7EB] bg-[#F9FAFB] rounded px-8 py-12 text-center">
            <p className="text-[#1A1A1A] text-lg font-semibold mb-2">No results found</p>
            <p className="text-[#9CA3AF] text-sm">
              Try searching for a team name, abbreviation, or betting keyword like &ldquo;over&rdquo; or
              &ldquo;moneyline&rdquo;.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-[#9CA3AF] mb-4">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <div>
              {results.map((article) => (
                <SearchResultRow key={article.id} article={article} />
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
