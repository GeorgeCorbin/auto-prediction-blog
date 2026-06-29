import Link from 'next/link';
import { getActiveSports } from '@/lib/sports/config';
import { SearchForm } from '@/components/SearchForm';

interface SiteHeaderProps {
  activeSport?: string;
}

export function SiteHeader({ activeSport }: SiteHeaderProps) {
  const activeSports = getActiveSports();
  const showCategoryNav = activeSports.length >= 1;

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
        <div className="max-w-7xl mx-auto flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-0 sm:h-[72px] sm:py-0">
          <Link href="/" className="flex flex-col gap-0.5 sm:mr-auto min-w-0">
            <span className="font-serif text-[24px] sm:text-[28px] font-bold text-[#1A1A1A] leading-tight sm:leading-none">
              The Matchup Report
            </span>
            <span className="hidden sm:block text-[10px] font-sans text-[#9CA3AF] tracking-[0.15em] uppercase">
              Sports Predictions &amp; Analysis
            </span>
          </Link>

          <SearchForm className="w-full sm:ml-4 sm:w-auto sm:max-w-xs" />
        </div>
      </div>

      {/* Category nav — only rendered when 2+ sports are enabled */}
      {showCategoryNav && (
        <nav className="px-4 sm:px-8 border-b border-[#E5E7EB] overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center h-11">
            {activeSports.map(({ key, label }) => {
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
            <Link
              href="/analysis"
              className={`relative flex items-center h-11 px-4 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeSport === 'analysis'
                  ? 'text-[#FF6B2C] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#FF6B2C]'
                  : 'text-[#4B5563] hover:text-[#1A1A1A]'
              }`}
            >
              Analysis
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
