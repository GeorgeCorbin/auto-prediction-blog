export interface GameOdds {
  homeMoneyline: number | null;
  awayMoneyline: number | null;
  spread: number | null;       // negative = home favored (e.g. -1.5 for MLB run line)
  total: number | null;        // over/under line
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
