import type { Game } from '@prisma/client';
import type { EspnGame, EspnGameSummary } from '@/lib/espn/client';
import type { SportConfig } from '@/lib/sports/config';

export interface SportPickResult {
  favoredTeam: 'home' | 'away' | 'draw';
  hasOdds: boolean;
  pickLabel: string;
}

export interface PickOptions {
  allowStatsFallback: boolean;
}

/** Shared fields every sport prompt context must include. */
export interface PromptContextBase {
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  scheduledAt: Date;
  pickLabel: string;
  hasOdds: boolean;
  favoredTeam: 'home' | 'away' | 'draw';
}

export interface SportModule<TContext extends PromptContextBase = PromptContextBase> {
  key: string;
  scanGameDay(sport: SportConfig, todayDateStr: string): Promise<void>;
  isReady(espnGame: EspnGame, now: Date): boolean;
  resolvePick(game: Game, options: PickOptions): SportPickResult | null;
  buildPromptContext(game: Game, pick: SportPickResult): TContext;
  buildPrompt(context: TContext): string;
  buildMetaDescription(context: TContext, pick: string): string;
  enrichFromSummary?(
    game: Game,
    summary: EspnGameSummary,
  ): { sportData?: Record<string, unknown> } | null;
}

export type AnySportModule = SportModule<PromptContextBase>;
