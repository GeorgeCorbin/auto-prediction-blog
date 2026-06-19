'use client';

import { useEffect, useState } from 'react';

interface Props {
  iso: string;
  fallback: string; // ET-formatted string rendered server-side
}

export function LocalPublishedTime({ iso, fallback }: Props) {
  const [label, setLabel] = useState<string>(fallback);

  useEffect(() => {
    const date = new Date(iso);
    const datePart = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    setLabel(`${datePart} · ${timePart}`);
  }, [iso]);

  return (
    <span className="text-[11px] text-[#9CA3AF] leading-none mt-0.5">{label}</span>
  );
}
