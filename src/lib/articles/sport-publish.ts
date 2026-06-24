import type { Game } from '@prisma/client';
import { isStatsPickWithoutOddsEnabled } from '@/lib/feature-flags';
import type { SportConfig } from '@/lib/sports/config';
import { getSportModule } from '@/lib/sports/registry';
import type { PickOptions } from '@/lib/sports/types';
import {
  canPublishMlbGameNow,
  getMlbEarliestPublishTime,
} from '@/lib/sports/mlb/publish-schedule';
import { canPublishWorldCupGameNow } from '@/lib/sports/world-cup/publish-schedule';

export interface SportScheduleRef {
  id: string;
  scheduledAt: Date;
}

export interface SportPublishGate {
  allowed: boolean;
  holdUntil?: Date;
}

export function gameHasUsableOdds(game: Game): boolean {
  return getSportModule(game.sport).gameHasUsableOdds(game);
}

/** True when a pick can be resolved without waiting on odds (or odds are present). */
export function canPickGameNow(game: Game, pickOptions: PickOptions): boolean {
  if (gameHasUsableOdds(game)) return true;
  return pickOptions.allowStatsFallback;
}

/** Kickoff passed — drop from the publish queue (odds mode: only when no lines were stored). */
export function shouldSkipStartedWithoutOdds(game: Game, now = new Date()): boolean {
  if (game.scheduledAt > now) return false;
  if (isStatsPickWithoutOddsEnabled()) return true;
  return !gameHasUsableOdds(game);
}

export function passesSportPublishSchedule(
  game: Game,
  sportConfig: SportConfig,
  mlbScheduleGames: SportScheduleRef[],
  now = new Date(),
): SportPublishGate {
  if (game.sport === 'mlb') {
    if (canPublishMlbGameNow(game, mlbScheduleGames, now)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      holdUntil: getMlbEarliestPublishTime(game, mlbScheduleGames),
    };
  }

  if (game.sport === 'world-cup') {
    if (canPublishWorldCupGameNow(game, sportConfig, now)) {
      return { allowed: true };
    }
    return { allowed: false };
  }

  if (game.scheduledAt <= now) return { allowed: false };
  return { allowed: true };
}

/** Earliest kickoff first; games waiting on odds go to the back of their sport queue. */
export function prioritizeSportQueue<T extends { id: string; scheduledAt: Date }>(
  games: T[],
  canPick: (game: T) => boolean,
): T[] {
  const sorted = [...games].sort(
    (a, b) =>
      a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.id.localeCompare(b.id),
  );

  const front: T[] = [];
  const back: T[] = [];
  for (const game of sorted) {
    (canPick(game) ? front : back).push(game);
  }
  return [...front, ...back];
}

export interface SportPublishBatch {
  sportKey: string;
  sportLabel: string;
  queue: Game[];
  toPublish: Game[];
  onHold: number;
  waitingOnOdds: number;
}

export function buildSportPublishBatches(
  games: Game[],
  sportConfigs: SportConfig[],
  pickOptions: PickOptions,
  mlbScheduleGames: SportScheduleRef[],
  maxPerSport: (sportKey: string, queueLength: number) => number,
  now = new Date(),
): SportPublishBatch[] {
  const bySport = new Map<string, Game[]>();
  for (const game of games) {
    const list = bySport.get(game.sport) ?? [];
    list.push(game);
    bySport.set(game.sport, list);
  }

  const batches: SportPublishBatch[] = [];

  for (const sportConfig of sportConfigs) {
    const sportGames = bySport.get(sportConfig.key);
    if (!sportGames || sportGames.length === 0) continue;

    const scheduleEligible: Game[] = [];
    let onHold = 0;

    for (const game of sportGames) {
      const gate = passesSportPublishSchedule(game, sportConfig, mlbScheduleGames, now);
      if (gate.allowed) {
        scheduleEligible.push(game);
        continue;
      }

      onHold++;
      if (gate.holdUntil) {
        console.log(
          `[generate-articles] [${sportConfig.label}] Holding ${game.awayTeam} @ ${game.homeTeam} until ${gate.holdUntil.toISOString()}`,
        );
      }
    }

    if (scheduleEligible.length === 0) continue;

    const queue = prioritizeSportQueue(scheduleEligible, (game) =>
      canPickGameNow(game, pickOptions),
    );
    const pickable = queue.filter((game) => canPickGameNow(game, pickOptions));
    const waitingOnOdds = queue.length - pickable.length;
    const limit = maxPerSport(sportConfig.key, pickable.length);
    const toPublish = pickable.slice(0, limit);

    batches.push({
      sportKey: sportConfig.key,
      sportLabel: sportConfig.label,
      queue,
      toPublish,
      onHold,
      waitingOnOdds,
    });
  }

  return batches;
}
