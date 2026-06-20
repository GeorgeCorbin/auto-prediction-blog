export interface GameOdds {
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  spreadHome: number | null;
  spreadAway: number | null;
  spreadHomePrice: number | null;
  spreadAwayPrice: number | null;
  total: number | null;
  overPrice: number | null;
  underPrice: number | null;
  favoredTeam: 'home' | 'away' | null;
}

export interface OddsProvider {
  getOddsForGames(
    games: Array<{
      homeTeam: string;
      awayTeam: string;
      scheduledAt: Date;
      espnEventId: string;
    }>,
    sportOddsKey: string,        // e.g. "baseball_mlb"
  ): Promise<Map<string, GameOdds>>;  // keyed by espnEventId
}
