import axios from 'axios';
import { z } from 'zod';
import { filterGameDayGames } from '@/lib/games/game-day';
import type { GameOdds, OddsProvider } from './provider';

// ---------------------------------------------------------------------------
// Zod schemas for The Odds API v4 response
// ---------------------------------------------------------------------------

const OutcomeSchema = z.object({
  name: z.string(),
  price: z.number().optional(),
  point: z.number().optional(),
});

const MarketSchema = z.object({
  key: z.string(),
  outcomes: z.array(OutcomeSchema),
});

const BookmakerSchema = z.object({
  key: z.string(),
  title: z.string().optional(),
  markets: z.array(MarketSchema),
});

const OddsGameSchema = z.object({
  id: z.string(),
  sport_key: z.string().optional(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(BookmakerSchema).optional(),
});

const OddsApiResponseSchema = z.array(OddsGameSchema);

// ---------------------------------------------------------------------------
// Team name normalization helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a team name to a set of lowercase word tokens, dropping very
 * short/common words so "Boston Red Sox" → ["boston", "red", "sox"].
 */
function tokenise(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}

/** Returns true when the two team name strings share at least one meaningful token. */
function teamsMatch(a: string, b: string): boolean {
  const ta = tokenise(a);
  const tb = tokenise(b);
  for (const token of ta) {
    if (tb.has(token)) return true;
  }
  return false;
}

/** Returns true when the odds game falls within ±1 day of the ESPN scheduledAt. */
function withinDateWindow(oddsCommenceTime: string, scheduledAt: Date): boolean {
  const oddsDate = new Date(oddsCommenceTime);
  const diffMs = Math.abs(oddsDate.getTime() - scheduledAt.getTime());
  return diffMs <= 36 * 60 * 60 * 1000; // 36-hour window to handle time zone edge cases
}

// ---------------------------------------------------------------------------
// Odds extraction helpers
// ---------------------------------------------------------------------------

function extractMoneylines(
  markets: z.infer<typeof MarketSchema>[],
  homeTeam: string,
  awayTeam: string,
): { homeMoneyline: number | null; awayMoneyline: number | null } {
  const h2h = markets.find((m) => m.key === 'h2h');
  if (!h2h) return { homeMoneyline: null, awayMoneyline: null };

  let homeMoneyline: number | null = null;
  let awayMoneyline: number | null = null;

  for (const outcome of h2h.outcomes) {
    if (teamsMatch(outcome.name, homeTeam)) {
      homeMoneyline = outcome.price ?? null;
    } else if (teamsMatch(outcome.name, awayTeam)) {
      awayMoneyline = outcome.price ?? null;
    }
  }

  return { homeMoneyline, awayMoneyline };
}

function extractSpreads(
  markets: z.infer<typeof MarketSchema>[],
  homeTeam: string,
  awayTeam: string,
): {
  homeSpread: number | null;
  awaySpread: number | null;
  homeSpreadPrice: number | null;
  awaySpreadPrice: number | null;
} {
  const spreadsMarket = markets.find((m) => m.key === 'spreads');
  if (!spreadsMarket) {
    return {
      homeSpread: null,
      awaySpread: null,
      homeSpreadPrice: null,
      awaySpreadPrice: null,
    };
  }

  let homeSpread: number | null = null;
  let awaySpread: number | null = null;
  let homeSpreadPrice: number | null = null;
  let awaySpreadPrice: number | null = null;

  for (const outcome of spreadsMarket.outcomes) {
    if (teamsMatch(outcome.name, homeTeam)) {
      homeSpread = outcome.point ?? null;
      homeSpreadPrice = outcome.price ?? null;
    } else if (teamsMatch(outcome.name, awayTeam)) {
      awaySpread = outcome.point ?? null;
      awaySpreadPrice = outcome.price ?? null;
    }
  }

  return { homeSpread, awaySpread, homeSpreadPrice, awaySpreadPrice };
}

function extractTotals(
  markets: z.infer<typeof MarketSchema>[],
): { total: number | null; overPrice: number | null; underPrice: number | null } {
  const totalsMarket = markets.find((m) => m.key === 'totals');
  if (!totalsMarket) {
    return { total: null, overPrice: null, underPrice: null };
  }

  const overOutcome = totalsMarket.outcomes.find(
    (o) => o.name.toLowerCase() === 'over',
  );
  const underOutcome = totalsMarket.outcomes.find(
    (o) => o.name.toLowerCase() === 'under',
  );

  return {
    total: overOutcome?.point ?? underOutcome?.point ?? null,
    overPrice: overOutcome?.price ?? null,
    underPrice: underOutcome?.price ?? null,
  };
}

function determineFavoredTeam(
  homeMoneyline: number | null,
  awayMoneyline: number | null,
): 'home' | 'away' | null {
  if (homeMoneyline === null || awayMoneyline === null) return null;
  // Lower (more negative) moneyline = favored
  if (homeMoneyline < awayMoneyline) return 'home';
  if (awayMoneyline < homeMoneyline) return 'away';
  return null; // pick-em
}

// ---------------------------------------------------------------------------
// TheOddsApiProvider
// ---------------------------------------------------------------------------

export class TheOddsApiProvider implements OddsProvider {
  private readonly baseUrl = 'https://api.the-odds-api.com/v4/sports';

  async getOddsForGames(
    games: Array<{
      homeTeam: string;
      awayTeam: string;
      scheduledAt: Date;
      espnEventId: string;
    }>,
    sportOddsKey: string,
  ): Promise<Map<string, GameOdds>> {
    const result = new Map<string, GameOdds>();

    const apiKey = process.env.THE_ODDS_API_KEY;
    if (!apiKey) {
      console.warn('[odds] THE_ODDS_API_KEY is not set — skipping odds fetch');
      return result;
    }

    if (games.length === 0) return result;

    const gameDayGames = filterGameDayGames(games);
    if (gameDayGames.length === 0) {
      console.log('[odds] Skipping odds fetch — no game-day matchups in request');
      return result;
    }

    let oddsGames: z.infer<typeof OddsGameSchema>[];
    try {
      const response = await axios.get(`${this.baseUrl}/${sportOddsKey}/odds`, {
        params: {
          apiKey,
          regions: 'us',
          markets: 'h2h,spreads,totals',
          oddsFormat: 'american',
          dateFormat: 'iso',
        },
        timeout: 15_000,
      });

      const parsed = OddsApiResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        console.warn('[odds] Unexpected odds API response shape:', parsed.error.issues);
        return result;
      }
      oddsGames = parsed.data;
    } catch (err) {
      console.error('[odds] Failed to fetch from The Odds API:', err);
      return result;
    }

    for (const espnGame of gameDayGames) {
      // Find the matching odds game by team name + date proximity
      const oddsGame = oddsGames.find(
        (og) =>
          withinDateWindow(og.commence_time, espnGame.scheduledAt) &&
          ((teamsMatch(og.home_team, espnGame.homeTeam) &&
            teamsMatch(og.away_team, espnGame.awayTeam)) ||
            // Sometimes home/away may be swapped in the odds API
            (teamsMatch(og.home_team, espnGame.awayTeam) &&
              teamsMatch(og.away_team, espnGame.homeTeam))),
      );

      if (!oddsGame) continue;

      const bookmaker = oddsGame.bookmakers?.[0];
      if (!bookmaker) continue;

      const markets = bookmaker.markets;

      // If odds API has home/away swapped relative to ESPN, flip the team references
      const oddsHomeIsEspnHome = teamsMatch(oddsGame.home_team, espnGame.homeTeam);
      const oddsHomeTeam = oddsHomeIsEspnHome ? espnGame.homeTeam : espnGame.awayTeam;
      const oddsAwayTeam = oddsHomeIsEspnHome ? espnGame.awayTeam : espnGame.homeTeam;

      const { homeMoneyline: rawHome, awayMoneyline: rawAway } = extractMoneylines(
        markets,
        oddsHomeTeam,
        oddsAwayTeam,
      );

      // Re-orient so keys are always from ESPN's perspective
      const homeMoneyline = oddsHomeIsEspnHome ? rawHome : rawAway;
      const awayMoneyline = oddsHomeIsEspnHome ? rawAway : rawHome;

      const rawSpreads = extractSpreads(markets, oddsHomeTeam, oddsAwayTeam);
      const spreadHome = oddsHomeIsEspnHome ? rawSpreads.homeSpread : rawSpreads.awaySpread;
      const spreadAway = oddsHomeIsEspnHome ? rawSpreads.awaySpread : rawSpreads.homeSpread;
      const spreadHomePrice = oddsHomeIsEspnHome
        ? rawSpreads.homeSpreadPrice
        : rawSpreads.awaySpreadPrice;
      const spreadAwayPrice = oddsHomeIsEspnHome
        ? rawSpreads.awaySpreadPrice
        : rawSpreads.homeSpreadPrice;

      const { total, overPrice, underPrice } = extractTotals(markets);
      const favoredTeam = determineFavoredTeam(homeMoneyline, awayMoneyline);

      result.set(espnGame.espnEventId, {
        homeMoneyline,
        awayMoneyline,
        spreadHome,
        spreadAway,
        spreadHomePrice,
        spreadAwayPrice,
        total,
        overPrice,
        underPrice,
        favoredTeam,
      });
    }

    return result;
  }
}
