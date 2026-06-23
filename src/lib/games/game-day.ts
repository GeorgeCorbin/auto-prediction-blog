import { publishHoursEt } from '@/lib/feature-flags';
import type { SportConfig } from '@/lib/sports/config';
import { isWithinMlbArticleLeadWindow } from '@/lib/sports/mlb/publish-schedule';

/** MLB schedule and publishing use US Eastern calendar dates. */
export const GAME_DAY_TIMEZONE = 'America/New_York';

export function getEasternHour(now: Date): number {
  const hour = Number.parseInt(
    now.toLocaleString('en-US', {
      timeZone: GAME_DAY_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }),
    10,
  );
  return hour === 24 ? 0 : hour;
}

/** True when `now` falls within publishHoursEt in Eastern time (start inclusive, end exclusive). */
export function isWithinPublishingHours(now = new Date()): boolean {
  const hour = getEasternHour(now);
  return hour >= publishHoursEt.start && hour < publishHoursEt.end;
}

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

/** Eastern calendar YYYYMMDD for a date offset from `now` (0 = today). */
export function getEspnDateStrForOffset(
  offsetDays: number,
  now = new Date(),
  timeZone = GAME_DAY_TIMEZONE,
): string {
  const base = new Date(getGameDayKey(now, timeZone) + 'T12:00:00');
  base.setDate(base.getDate() + offsetDays);
  return getGameDayKey(base, timeZone).replace(/-/g, '');
}

/** YYYYMMDD strings from today through today + lookaheadDays (inclusive). */
export function getEspnDateRange(
  lookaheadDays: number,
  now = new Date(),
  timeZone = GAME_DAY_TIMEZONE,
): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= lookaheadDays; i++) {
    dates.push(getEspnDateStrForOffset(i, now, timeZone));
  }
  return dates;
}

export function getArticleLeadDays(sport: SportConfig): number {
  return sport.articleLeadDays ?? 0;
}

export function getScanLookaheadDays(sport: SportConfig): number {
  return sport.scanLookaheadDays ?? 0;
}

/** Whole Eastern calendar days from `from` until `to` (exclusive of same-day past kickoff). */
export function daysUntilKickoff(scheduledAt: Date, now = new Date()): number {
  if (scheduledAt <= now) return -1;

  const fromKey = getGameDayKey(now);
  const toKey = getGameDayKey(scheduledAt);
  const fromDate = new Date(fromKey + 'T12:00:00');
  const toDate = new Date(toKey + 'T12:00:00');
  return Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
}

/** True when kickoff is in the future and within the sport's publishing window. */
export function isWithinArticleLeadWindow(
  scheduledAt: Date,
  leadDays: number,
  now = new Date(),
): boolean {
  if (scheduledAt <= now) return false;

  if (leadDays === 0) {
    return isGameDay(scheduledAt, now);
  }

  const daysAway = daysUntilKickoff(scheduledAt, now);
  return daysAway >= 0 && daysAway <= leadDays;
}

/** Keep only games whose Eastern calendar date is today. */
export function filterGameDayGames<T extends { scheduledAt: Date }>(
  games: T[],
  now = new Date(),
): T[] {
  return games.filter((g) => isGameDay(g.scheduledAt, now));
}

/** Filter games eligible for article generation based on sport lead window. */
export function filterGamesForSport<T extends { scheduledAt: Date }>(
  games: T[],
  sport: SportConfig,
  now = new Date(),
): T[] {
  if (sport.key === 'mlb') {
    return games.filter((g) => isWithinMlbArticleLeadWindow(g.scheduledAt, now));
  }
  const leadDays = getArticleLeadDays(sport);
  return games.filter((g) => isWithinArticleLeadWindow(g.scheduledAt, leadDays, now));
}

/** Demote READY games that fell outside the sport's publishing window or already started. */
export function shouldDemoteReadyGame(
  scheduledAt: Date,
  sport: SportConfig,
  now = new Date(),
): boolean {
  if (scheduledAt <= now) return true;
  if (sport.key === 'mlb') {
    return !isWithinMlbArticleLeadWindow(scheduledAt, now);
  }
  return !isWithinArticleLeadWindow(scheduledAt, getArticleLeadDays(sport), now);
}

/** True when at least one game is on today's Eastern calendar date. */
export function hasGameDayGames<T extends { scheduledAt: Date }>(
  games: T[],
  now = new Date(),
): boolean {
  return games.some((g) => isGameDay(g.scheduledAt, now));
}
