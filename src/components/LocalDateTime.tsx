'use client';

import { useEffect, useState } from 'react';
import { formatDateTimeLabel } from '@/lib/dates';

interface Props {
  iso: string;
  fallback: string;
  className?: string;
}

export function LocalDateTime({ iso, fallback, className }: Props) {
  const [label, setLabel] = useState<string>(fallback);

  useEffect(() => {
    setLabel(formatDateTimeLabel(new Date(iso)));
  }, [iso]);

  return <span className={className}>{label}</span>;
}
