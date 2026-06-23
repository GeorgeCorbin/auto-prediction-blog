import {
  mlbArticleLeadHours,
  mlbPriorGamePublishBufferHours,
} from '@/lib/feature-flags';

const MS_PER_HOUR = 60 * 60 * 1000;

export interface MlbGameScheduleRef {
  id: string;
  scheduledAt: Date;
}

/** True when kickoff is in the future and within the MLB lead window. */
export function isWithinMlbArticleLeadWindow(
  scheduledAt: Date,
  now = new Date(),
): boolean {
  if (scheduledAt <= now) return false;
  const leadMs = mlbArticleLeadHours * MS_PER_HOUR;
  return now.getTime() >= scheduledAt.getTime() - leadMs;
}

/** Earliest time an MLB preview may go live for `target`, accounting for prior games. */
export function getMlbEarliestPublishTime(
  target: MlbGameScheduleRef,
  allGames: MlbGameScheduleRef[],
): Date {
  const leadMs = mlbArticleLeadHours * MS_PER_HOUR;
  const bufferMs = mlbPriorGamePublishBufferHours * MS_PER_HOUR;
  let earliestMs = target.scheduledAt.getTime() - leadMs;

  for (const prior of allGames) {
    if (prior.id === target.id) continue;
    if (prior.scheduledAt >= target.scheduledAt) continue;
    earliestMs = Math.max(earliestMs, prior.scheduledAt.getTime() + bufferMs);
  }

  return new Date(earliestMs);
}

/** True when `now` is past all MLB scheduling gates for publishing `target`. */
export function canPublishMlbGameNow(
  target: MlbGameScheduleRef,
  allGames: MlbGameScheduleRef[],
  now = new Date(),
): boolean {
  if (!isWithinMlbArticleLeadWindow(target.scheduledAt, now)) return false;
  return now.getTime() >= getMlbEarliestPublishTime(target, allGames).getTime();
}
