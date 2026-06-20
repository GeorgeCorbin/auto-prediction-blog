/** MLB schedule and publishing use US Eastern calendar dates. */
export const GAME_DAY_TIMEZONE = 'America/New_York';

/** YYYY-MM-DD in Eastern time — used to compare game day vs today. */
export function getGameDayKey(date: Date, timeZone = GAME_DAY_TIMEZONE): string {
  return date.toLocaleDateString('en-CA', { timeZone });
}

export function isGameDay(scheduledAt: Date, now = new Date()): boolean {
  return getGameDayKey(scheduledAt) === getGameDayKey(now);
}

/** YYYYMMDD string for ESPN scoreboard queries (Eastern calendar date). */
export function getTodayEspnDateStr(now = new Date(), timeZone = GAME_DAY_TIMEZONE): string {
  return getGameDayKey(now, timeZone).replace(/-/g, '');
}

/** Keep only games whose Eastern calendar date is today. */
export function filterGameDayGames<T extends { scheduledAt: Date }>(
  games: T[],
  now = new Date(),
): T[] {
  return games.filter((g) => isGameDay(g.scheduledAt, now));
}

/** True when at least one game is on today's Eastern calendar date. */
export function hasGameDayGames<T extends { scheduledAt: Date }>(
  games: T[],
  now = new Date(),
): boolean {
  return games.some((g) => isGameDay(g.scheduledAt, now));
}
