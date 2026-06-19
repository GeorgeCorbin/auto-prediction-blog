import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdSlot } from '@/components/AdSlot';
import { LocalPublishedTime } from '@/components/LocalPublishedTime';
import { ShareButtons } from '@/components/ShareButtons';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

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
    const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${sport}/${slug}`;
    return {
      title: article.title,
      description: article.metaDescription,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: article.title,
        description: article.metaDescription,
        type: 'article',
        publishedTime: article.publishedAt.toISOString(),
      },
    };
  } catch {
    return { title: 'The Matchup Report' };
  }
}

/* ─── Helpers ────────────────────────────────────────────────── */
function formatOdds(val: number | null | undefined): string | null {
  if (val == null) return null;
  return val > 0 ? `+${val}` : `${val}`;
}

function formatSpread(val: number | null | undefined): string | null {
  if (val == null) return null;
  return val > 0 ? `+${val}` : `${val}`;
}

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
  return first.length <= maxLength ? first : first.slice(0, maxLength).trimEnd() + '…';
}

type PitcherStats = {
  era?: string;
  record?: string;
};

function parsePitcherStats(raw: unknown): PitcherStats {
  if (!raw || typeof raw !== 'object') return {};
  // ESPN keys are uppercase abbreviations (ERA, WHIP); record is stored as 'record'
  const s = raw as Record<string, unknown>;
  const era = (s['ERA'] ?? s['era']) as string | undefined;
  const record = s['record'] as string | undefined;

  // ESPN record format is "(W-L, ERA)" e.g. "(8-2, 1.34)".
  // Extract just the W-L part since ERA is shown in its own row.
  const cleanRecord = record
    ?.replace(/,\s*[\d.]+\)?$/, '') // strip ", 1.34)" from end
    .replace(/^\(/, '')             // strip leading "("
    .trim();

  return { era, record: cleanRecord };
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

/* ─── Pitcher stat row ───────────────────────────────────────── */
function PitcherStat({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex items-center py-2 border-b border-[#E5E7EB] last:border-0">
      <span className="text-[12px] text-[#9CA3AF]">{label}</span>
      <span className="ml-auto font-mono text-[13px] font-bold text-[#1A1A1A]">
        {value ?? '—'}
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
  };
}) {
  return (
    <Link href={`/${article.sport}/${article.slug}`} className="group block">
      <div className="relative w-full bg-[#D1D5DB] mb-3" style={{ aspectRatio: '4/3' }}>
        {article.featuredImageUrl && (
          <Image
            src={article.featuredImageUrl}
            alt={article.imageAlt ?? article.title}
            fill
            style={{ objectFit: 'cover' }}
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

  // Related articles
  let related: {
    id: string;
    title: string;
    sport: string;
    slug: string;
    publishedAt: Date;
    featuredImageUrl: string | null;
    imageAlt: string | null;
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
      },
    });
  } catch { /* ignore */ }

  // Most read sidebar
  let mostRead: typeof related = [];
  try {
    mostRead = await prisma.article.findMany({
      where: { sport },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, sport: true, slug: true, publishedAt: true },
    });
  } catch { /* ignore */ }

  const gameDate = game.scheduledAt.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // ET fallback shown server-side until the browser reports its timezone
  const publishedAtEt = article.publishedAt.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const articleUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${sport}/${slug}`;

  const paragraphs = article.content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Odds
  const mlHome = formatOdds(game.moneylineHome);
  const mlAway = formatOdds(game.moneylineAway);
  const spread = formatSpread(game.spread);
  const total = formatTotal(game.total);

  const hasOdds = mlHome || mlAway || spread || total;

  // Pitchers
  const homeStats = parsePitcherStats(game.homePitcherStats);
  const awayStats = parsePitcherStats(game.awayPitcherStats);
  const hasPitchers = game.homePitcher || game.awayPitcher;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: 'The Matchup Report' },
    publisher: { '@type': 'Organization', name: 'The Matchup Report' },
    description: article.metaDescription,
  };

  return (
    <>
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
            {game.awayTeam} vs {game.homeTeam}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          {/* ── Main article column ── */}
          <main>
            {/* Article header */}
            <header className="mb-6">
              <h1 className="font-serif text-[28px] sm:text-[36px] font-bold text-[#1A1A1A] leading-[1.2] mb-4">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#D1D5DB]" />
                  <div>
                    <p className="text-[13px] font-bold text-[#1A1A1A] leading-none">
                      The Matchup Report Staff
                    </p>
                    <LocalPublishedTime
                      iso={article.publishedAt.toISOString()}
                      fallback={publishedAtEt}
                    />
                  </div>
                </div>
                <div className="w-px h-6 bg-[#E5E7EB]" />
                <span className="text-[13px] font-semibold text-[#FF6B2C] uppercase tracking-[0.05em]">
                  {sport.toUpperCase()}
                </span>
                <div className="ml-auto">
                  <ShareButtons url={articleUrl} title={article.title} />
                </div>
              </div>
            </header>

            {/* Featured image */}
            {article.featuredImageUrl ? (
              <>
                <div className="relative w-full mb-2" style={{ aspectRatio: '16/7' }}>
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
                  {game.awayTeam} vs {game.homeTeam} · {gameDate}
                  {article.imageCredit ? ` · Photo: ${article.imageCredit}` : ''}
                </p>
              </>
            ) : (
              <>
                <div className="w-full bg-[#D1D5DB] mb-2" style={{ aspectRatio: '16/7' }} />
                <p className="text-[11px] text-[#9CA3AF] mb-6">
                  {game.awayTeam} vs {game.homeTeam} · {gameDate}
                </p>
              </>
            )}

            {/* Intro paragraph with left accent */}
            {paragraphs[0] && (
              <div className="border-l-4 border-[#FF6B2C] pl-4 mb-6">
                <p className="text-[16px] text-[#4B5563] leading-[1.75]">{paragraphs[0]}</p>
              </div>
            )}

            {/* Top ad */}
            <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 mb-8">
              <AdSlot position="top" />
            </div>

            {/* Odds table */}
            {hasOdds && (
              <section className="mb-8">
                <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] mb-4">
                  Tonight&apos;s Odds
                </h2>
                <div className="border border-[#E5E7EB] rounded overflow-hidden">
                  <OddsRow label="MONEYLINE" isHeader />
                  <OddsRow label={game.awayTeam} value={mlAway} />
                  <OddsRow label={game.homeTeam} value={mlHome} />
                  {spread && (
                    <>
                      <OddsRow label="RUN LINE" isHeader />
                      <OddsRow
                        label={`${game.awayTeam} ${spread.startsWith('-') ? spread : '+' + spread}`}
                        value={formatOdds(-110)}
                      />
                      <OddsRow
                        label={`${game.homeTeam} ${spread.startsWith('-') ? '+' + Math.abs(Number(spread)) : spread}`}
                        value={formatOdds(-110)}
                      />
                    </>
                  )}
                  {total && (
                    <>
                      <OddsRow label="OVER/UNDER" isHeader />
                      <OddsRow label={`Over ${total}`} value={formatOdds(-110)} />
                      <OddsRow label={`Under ${total}`} value={formatOdds(-110)} />
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Probable pitchers */}
            {hasPitchers && (
              <section className="mb-8">
                <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] mb-4">
                  Probable Pitchers
                </h2>
                <div className="border border-[#E5E7EB] rounded overflow-hidden grid grid-cols-[1fr_48px_1fr]">
                  {/* Away pitcher */}
                  <div className="p-5 bg-[#F9FAFB]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4B5563] mb-1">
                      {game.awayTeam}
                    </p>
                    <p className="font-serif text-[17px] font-bold text-[#1A1A1A] mb-4">
                      {game.awayPitcher ?? 'TBD'}
                    </p>
                    <PitcherStat label="ERA" value={awayStats.era} />
                    <PitcherStat label="Record" value={awayStats.record} />
                  </div>
                  {/* VS divider */}
                  <div className="flex items-center justify-center bg-[#E5E7EB]">
                    <span className="text-[11px] font-bold text-[#9CA3AF] tracking-widest [writing-mode:vertical-lr]">
                      VS
                    </span>
                  </div>
                  {/* Home pitcher */}
                  <div className="p-5 bg-[#F9FAFB]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4B5563] mb-1">
                      {game.homeTeam}
                    </p>
                    <p className="font-serif text-[17px] font-bold text-[#1A1A1A] mb-4">
                      {game.homePitcher ?? 'TBD'}
                    </p>
                    <PitcherStat label="ERA" value={homeStats.era} />
                    <PitcherStat label="Record" value={homeStats.record} />
                  </div>
                </div>
              </section>
            )}

            {/* Article body paragraphs */}
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

            {/* Best Bet box */}
            <section className="border-l-4 border-[#FF6B2C] bg-[#FFF7ED] p-6 rounded-r mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#FF6B2C] mb-2">
                Best Bet
              </p>
              <p className="font-serif text-[28px] font-bold text-[#1A1A1A] mb-4">
                {article.pick}
              </p>
              <p className="text-[14px] text-[#4B5563] leading-relaxed">
                Based on the pitching matchup, recent form, and line value, {article.pick} is our
                top play for this game. Back it with 1–2 units.
              </p>
            </section>

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

            {/* Latest picks */}
            <div>
              <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-4">
                <div className="w-1 h-5 bg-[#1A1A1A] rounded-sm" />
                <h3 className="font-sans text-[12px] font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                  Latest {sport.toUpperCase()} Picks
                </h3>
              </div>
              {mostRead.slice(0, 4).map((a) => (
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
