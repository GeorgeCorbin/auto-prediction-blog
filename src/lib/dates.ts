const EASTERN_TZ = 'America/New_York';

export function formatDateTimeLabel(date: Date, timeZone?: string): string {
  const datePart = date.toLocaleDateString('en-US', {
    timeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${datePart} · ${timePart}`;
}

/** Server-rendered Eastern time fallback until the browser reports its timezone. */
export function formatEasternDateTimeFallback(date: Date): string {
  return formatDateTimeLabel(date, EASTERN_TZ);
}
