import type { MatchupAssets } from '@/lib/images/matchup-data';

/** Diagonal team-color split with logos */
export function SplitMatchupLayout({
  assets,
  width,
  height,
}: {
  assets: MatchupAssets;
  width: number;
  height: number;
}) {
  const logoSize = Math.round(Math.min(width, height) * 0.52);

  return (
    <div
      style={{
        display: 'flex',
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${assets.awayColor} 49.2%, #FFFFFF 49.2%, #FFFFFF 50.8%, ${assets.homeColor} 50.8%)`,
      }}
    >
      {/* Away logo — top-left */}
      <div
        style={{
          position: 'absolute',
          top: `${height * 0.06}px`,
          left: `${width * 0.06}px`,
          width: `${width * 0.44}px`,
          height: `${height * 0.44}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assets.awayLogoSrc}
          alt={assets.awayAbbr}
          width={logoSize}
          height={logoSize}
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Home logo — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: `${height * 0.06}px`,
          right: `${width * 0.06}px`,
          width: `${width * 0.44}px`,
          height: `${height * 0.44}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assets.homeLogoSrc}
          alt={assets.homeAbbr}
          width={logoSize}
          height={logoSize}
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
