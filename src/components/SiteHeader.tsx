import Link from 'next/link';
import { ENABLED_SPORTS } from '@/lib/sports/config';
import { SearchForm } from '@/components/SearchForm';

interface SiteHeaderProps {
  activeSport?: string;
}

export function SiteHeader({ activeSport }: SiteHeaderProps) {
  const showCategoryNav = ENABLED_SPORTS.length >= 2;

  return (
    <header className="w-full border-b border-[#E5E7EB] bg-white">
      {/* Top utility bar */}
      <div className="bg-[#1A1A1A] px-4 sm:px-8 h-9 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center">
          <span className="text-white text-[11px] font-bold tracking-[0.15em] uppercase">
            The Matchup Report
          </span>
        </div>
      </div>

      {/* Main navbar */}
      <div className={`px-4 sm:px-8 ${showCategoryNav ? 'border-b border-[#E5E7EB]' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center h-[72px]">
          <Link href="/" className="flex flex-col gap-0.5 mr-auto">
            <span className="font-serif text-[28px] font-bold text-[#1A1A1A] leading-none">
              The Matchup Report
            </span>
            <span className="text-[10px] font-sans text-[#9CA3AF] tracking-[0.15em] uppercase">
              Sports Predictions &amp; Analysis
            </span>
          </Link>

          <SearchForm className="ml-4 max-w-[220px] sm:max-w-xs" />
        </div>
      </div>

      {/* Category nav — only rendered when 2+ sports are enabled */}
      {showCategoryNav && (
        <nav className="px-4 sm:px-8 border-b border-[#E5E7EB] overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center h-11">
            {ENABLED_SPORTS.map(({ key, label }) => {
              const isActive = activeSport === key;
              return (
                <Link
                  key={key}
                  href={`/${key}`}
                  className={`relative flex items-center h-11 px-4 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-[#FF6B2C] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#FF6B2C]'
                      : 'text-[#4B5563] hover:text-[#1A1A1A]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
