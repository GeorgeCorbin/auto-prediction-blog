/**
 * EvergreenHero — hero image for evergreen article detail pages.
 *
 * Uses dynamic MLB CDN action photos of star players based on article data.
 * Matchup cheat sheets use stadium images instead.
 */

import { getEvergreenImage } from '@/lib/evergreen/image-map';

interface Props {
  badge: string;
  sport: string;
  articleType?: string;
  evergreenData?: unknown;
}

export function EvergreenHero({ badge, sport, articleType, evergreenData }: Props) {
  const heroImage = getEvergreenImage(articleType ?? '', evergreenData);

  return (
    <div className="relative w-full overflow-hidden rounded" style={{ aspectRatio: '16/9' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroImage}
        alt={badge}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
