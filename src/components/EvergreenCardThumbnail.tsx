/**
 * EvergreenCardThumbnail — server-safe thumbnail for evergreen article cards.
 *
 * Uses dynamic MLB CDN action photos of star players based on article data.
 * Matchup cheat sheets use stadium images instead.
 */

import { getEvergreenImage } from '@/lib/evergreen/image-map';

interface Props {
  evergreenData: unknown;
  sport: string;
  label: string;
  articleType?: string;
}

export function EvergreenCardThumbnail({ evergreenData, sport, label, articleType }: Props) {
  const heroImage = getEvergreenImage(articleType ?? '', evergreenData);

  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroImage}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
