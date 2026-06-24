import { getEasternHour, getTodayEspnDateStr } from '@/lib/games/game-day';
import { hashString } from '@/lib/sports/helpers';

/** How many READY games to publish per sport in a single generate run. */
export function getMaxArticlesPerSportPerRun(
  sportKey: string,
  readyCount: number,
  now = new Date(),
): number {
  if (readyCount <= 1) return readyCount;
  if (readyCount <= 4) return readyCount;

  const hour = getEasternHour(now);
  const slot = hashString(`${getTodayEspnDateStr(now)}:${sportKey}:${hour}`) % 2;
  return 2 + slot;
}

/** @deprecated Use getMaxArticlesPerSportPerRun — global cap replaced by per-sport queues. */
export function getMaxArticlesPerRun(readyCount: number, now = new Date()): number {
  return getMaxArticlesPerSportPerRun('global', readyCount, now);
}

/** Earliest kickoff first so the most time-sensitive previews go live first. */
export function prioritizeGamesForPublishing<T extends { id: string; scheduledAt: Date }>(
  games: T[],
): T[] {
  return [...games].sort(
    (a, b) =>
      a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.id.localeCompare(b.id),
  );
}

/** Pause between articles in the same run so timestamps do not cluster. */
export function getInterArticleDelayMs(seed: string): number {
  const seconds = 45 + (hashString(seed) % 136);
  return seconds * 1000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
