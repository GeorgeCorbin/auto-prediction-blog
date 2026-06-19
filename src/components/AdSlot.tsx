'use client';

const SLOT_MAP = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP,
  mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID,
  bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM,
} as const;

interface AdSlotProps {
  position: 'top' | 'mid' | 'bottom';
}

export function AdSlot({ position }: AdSlotProps) {
  return (
    <div className="my-6 flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}
        data-ad-slot={SLOT_MAP[position]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
