import Link from 'next/link';
import { ENABLED_SPORTS } from '@/lib/sports/config';

const ABOUT_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms' },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#1A1A1A] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-serif text-xl font-bold text-white block mb-3">
              The Matchup Report
            </span>
            <p className="text-[#9CA3AF] text-[13px] leading-relaxed">
              Expert sports predictions, odds analysis, and game previews. Updated daily.
            </p>
          </div>

          {/* Sports column — driven by enabled sports */}
          {ENABLED_SPORTS.length > 0 && (
            <div>
              <h3 className="text-white text-[10px] font-bold uppercase tracking-[0.12em] mb-4">
                Sports
              </h3>
              <ul className="space-y-2.5">
                {ENABLED_SPORTS.map(({ key, label }) => (
                  <li key={key}>
                    <Link
                      href={`/${key}`}
                      className="text-[#9CA3AF] text-[13px] hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About column */}
          <div>
            <h3 className="text-white text-[10px] font-bold uppercase tracking-[0.12em] mb-4">
              About
            </h3>
            <ul className="space-y-2.5">
              {ABOUT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[#9CA3AF] text-[13px] hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h3 className="text-white text-[10px] font-bold uppercase tracking-[0.12em] mb-4">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[#9CA3AF] text-[13px] hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2D2D2D] pt-6">
          <p className="text-[#9CA3AF] text-[11px] text-center">
            &copy; {new Date().getFullYear()} The Matchup Report. All Rights Reserved. The content on this site is for entertainment and educational purposes only. 
            Betting and gambling content is intended for individuals 21+ and is based on individual commentators' opinions and not that of The Matchup Report or 
            its affiliates, licensees and related brands. All picks and predictions are suggestions only and not a guarantee of success or profit. 
            If you or someone you know has a gambling problem, crisis counseling and referral services can be accessed by calling 1-800-GAMBLER.
          </p>
        </div>
      </div>
    </footer>
  );
}
