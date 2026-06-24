import type { Game } from '@prisma/client';
import { isWithinArticleLeadWindow, getArticleLeadDays } from '@/lib/games/game-day';
import type { SportConfig } from '@/lib/sports/config';

/** World Cup previews may publish any time within the lead window before kickoff. */
export function canPublishWorldCupGameNow(
  game: Pick<Game, 'scheduledAt'>,
  sport: SportConfig,
  now = new Date(),
): boolean {
  if (game.scheduledAt <= now) return false;
  return isWithinArticleLeadWindow(game.scheduledAt, getArticleLeadDays(sport), now);
}
