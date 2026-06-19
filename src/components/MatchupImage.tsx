import Image from 'next/image';

type Props = {
  slug: string;
  alt: string;
  /** 16:9 wide hero / OG image. Default is 4:3 card thumbnail. */
  wide?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

export function MatchupImage({
  slug,
  alt,
  wide = false,
  sizes,
  priority,
  className,
}: Props) {
  const src = wide ? `/api/og/${slug}` : `/api/matchup/${slug}`;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      style={{ objectFit: 'cover' }}
      sizes={sizes}
      priority={priority}
      unoptimized
    />
  );
}
