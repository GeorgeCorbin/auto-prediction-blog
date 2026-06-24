import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { teamNameToSlug } from '@/lib/teams';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Team Predictions | The Matchup Report',
  description: 'Browse game predictions and analysis by team. Find every matchup prediction, odds breakdown, and best bet for your favorite team.',
};

export default async function TeamsIndexPage() {
  let teams: { name: string; slug: string; sport: string; count: number }[] = [];

  try {
    const articles = await prisma.article.findMany({
      select: {
        sport: true,
        game: { select: { homeTeam: true, awayTeam: true } },
      },
    });

    const teamMap = new Map<string, { sport: string; count: number }>();
    for (const a of articles) {
      for (const name of [a.game.homeTeam, a.game.awayTeam]) {
        const existing = teamMap.get(name);
        if (existing) {
          existing.count++;
        } else {
          teamMap.set(name, { sport: a.sport, count: 1 });
        }
      }
    }

    teams = Array.from(teamMap.entries())
      .map(([name, { sport, count }]) => ({ name, slug: teamNameToSlug(name), sport, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { /* ignore */ }

  const bySport = teams.reduce<Record<string, typeof teams>>((acc, t) => {
    const list = acc[t.sport] ?? [];
    list.push(t);
    acc[t.sport] = list;
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
          <span className="text-[#4B5563]">Teams</span>
        </nav>

        <header className="mb-8 pb-6 border-b border-[#E5E7EB]">
          <h1 className="font-serif text-[32px] sm:text-[40px] font-bold text-[#1A1A1A] leading-[1.15] mb-2">
            Teams
          </h1>
          <p className="text-[15px] text-[#4B5563]">
            Browse predictions by team
          </p>
        </header>

        {Object.entries(bySport).map(([sport, sportTeams]) => (
          <section key={sport} className="mb-10">
            <div className="flex items-center gap-3 border-b-2 border-[#E5E7EB] pb-3 mb-5">
              <div className="w-1 h-5 bg-[#FF6B2C] rounded-sm" />
              <h2 className="font-sans text-base font-bold text-[#1A1A1A] uppercase tracking-[0.05em]">
                {sport.toUpperCase()}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sportTeams.map((team) => (
                <Link
                  key={team.slug}
                  href={`/teams/${team.slug}`}
                  className="group flex flex-col border border-[#E5E7EB] rounded px-4 py-3 hover:border-[#FF6B2C] transition-colors"
                >
                  <span className="text-[13px] font-semibold text-[#1A1A1A] group-hover:text-[#FF6B2C] transition-colors leading-snug">
                    {team.name}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF] mt-1">
                    {team.count} prediction{team.count !== 1 ? 's' : ''}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {teams.length === 0 && (
          <p className="text-[15px] text-[#9CA3AF]">No teams found yet.</p>
        )}
      </div>

      <SiteFooter />
    </>
  );
}
