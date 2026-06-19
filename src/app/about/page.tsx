import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about The Matchup Report — your source for data-driven sports predictions, odds analysis, and daily game previews.',
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
        {/* Page heading */}
        <div className="mb-10 border-b-2 border-[#E5E7EB] pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-[#FF6B2C] rounded-sm shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#FF6B2C]">
              About
            </span>
          </div>
          <h1 className="font-serif text-[36px] sm:text-[44px] font-bold text-[#1A1A1A] leading-[1.15]">
            About The Matchup Report
          </h1>
        </div>

        {/* Body copy */}
        <div className="space-y-6 text-[15px] text-[#4B5563] leading-relaxed">
          <p>
            <strong className="text-[#1A1A1A] font-semibold">The Matchup Report</strong> is a
            sports-prediction publication built on data, not gut feelings. Every day before the
            first pitch, tip-off, or kickoff, our system analyzes injury reports, line movement,
            historical matchups, probable pitchers, and dozens of additional signals to publish
            detailed game previews and picks.
          </p>

          <p>
            We believe sports fans deserve more than vague hot-takes. Our articles explain{' '}
            <em>why</em> a line is set where it is, where the public money is flowing, and which
            side offers genuine statistical edge — so you can make informed decisions rather than
            just following the crowd.
          </p>

          <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] pt-2">
            How Our Predictions Work
          </h2>

          <p>
            Each preview is generated from a combination of real-time data sources: live odds from
            multiple sportsbooks, ESPN game data including lineups and injury status, and
            historical performance trends. An AI layer synthesizes these inputs into a readable
            article that surfaces the key angles driving our pick — without hiding the analysis
            behind jargon or pay-walls.
          </p>

          <p>
            Our content is refreshed daily, and game articles are updated right up until the
            scheduled start time to reflect last-minute roster moves or sharp line shifts.
          </p>

          <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] pt-2">
            Responsible Use
          </h2>

          <p>
            All picks and predictions on this site are for entertainment and educational purposes
            only. They are the opinion of our editorial system and are not a guarantee of success
            or profit. Gambling should be enjoyed responsibly. If you or someone you know has a
            gambling problem, call{' '}
            <strong className="text-[#1A1A1A]">1-800-GAMBLER</strong> for crisis counseling and
            referral services. You must be 21+ to gamble where applicable.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
