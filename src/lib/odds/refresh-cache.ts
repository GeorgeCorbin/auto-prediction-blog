/** In-process cache of the last successful Odds API fetch per sport key. */
const lastRefreshBySport = new Map<string, number>();

export function getLastOddsRefresh(sportOddsKey: string): number | undefined {
  return lastRefreshBySport.get(sportOddsKey);
}

export function markOddsRefreshed(sportOddsKey: string, at = Date.now()): void {
  lastRefreshBySport.set(sportOddsKey, at);
}

export function minutesSinceOddsRefresh(sportOddsKey: string, now = Date.now()): number | null {
  const last = lastRefreshBySport.get(sportOddsKey);
  if (last === undefined) return null;
  return Math.floor((now - last) / (60 * 1000));
}

export function shouldRefreshOdds(
  sportOddsKey: string,
  intervalMs: number,
  now = Date.now(),
): boolean {
  const last = lastRefreshBySport.get(sportOddsKey);
  if (last === undefined) return true;
  return now - last >= intervalMs;
}

/** Test helper — clears in-memory refresh timestamps. */
export function clearOddsRefreshCache(): void {
  lastRefreshBySport.clear();
}
