import axios from 'axios';
import { z } from 'zod';
import type { GameOdds, OddsProvider } from './provider';
import {
  assignOutcomeTeam,
  oddsHomeMatchesEspnHome,
  teamsMatchGame,
} from './team-matching';

/** Max hours between Odds API commence_time and ESPN scheduledAt when matching lines. */
const ODDS_MATCH_WINDOW_HOURS = 120;

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

type Market = z.infer<typeof MarketSchema>;
type Bookmaker = z.infer<typeof BookmakerSchema>;

/** True when odds commence_time is close enough to ESPN kickoff (supports multi-day lead). */
function withinDateWindow(oddsCommenceTime: string, scheduledAt: Date): boolean {
  const oddsDate = new Date(oddsCommenceTime);
  const diffMs = Math.abs(oddsDate.getTime() - scheduledAt.getTime());
  return diffMs <= ODDS_MATCH_WINDOW_HOURS * 60 * 60 * 1000;
}

function scoreH2hMarket(market: Market): number {
  const outcomes = market.outcomes.filter((o) => o.price !== undefined);
  const teamOutcomes = outcomes.filter((o) => o.name.toLowerCase() !== 'draw');
  const hasDraw = outcomes.some((o) => o.name.toLowerCase() === 'draw');
  return teamOutcomes.length * 10 + (hasDraw ? 5 : 0) + outcomes.length;
}

function scoreTotalsMarket(market: Market): number {
  const over = market.outcomes.find((o) => o.name.toLowerCase() === 'over');
  const under = market.outcomes.find((o) => o.name.toLowerCase() === 'under');
  let score = 0;
  if (over?.price !== undefined && over.point !== undefined) score += 2;
  if (under?.price !== undefined && under.point !== undefined) score += 2;
  return score;
}

function scoreSpreadsMarket(market: Market): number {
  return market.outcomes.filter((o) => o.price !== undefined && o.point !== undefined).length;
}

/** Pick the richest market of each type across all bookmakers for a game. */
function selectBestMarkets(bookmakers: Bookmaker[]): Market[] {
  const bestByKey = new Map<string, Market>();

  for (const bookmaker of bookmakers) {
    for (const market of bookmaker.markets) {
      let score: number;
      switch (market.key) {
        case 'h2h':
          score = scoreH2hMarket(market);
          break;
        case 'totals':
          score = scoreTotalsMarket(market);
          break;
        case 'spreads':
          score = scoreSpreadsMarket(market);
          break;
        default:
          continue;
      }

      const prev = bestByKey.get(market.key);
      if (!prev) {
        bestByKey.set(market.key, market);
        continue;
      }

      let prevScore: number;
      switch (market.key) {
        case 'h2h':
          prevScore = scoreH2hMarket(prev);
          break;
        case 'totals':
          prevScore = scoreTotalsMarket(prev);
          break;
        case 'spreads':
          prevScore = scoreSpreadsMarket(prev);
          break;
        default:
          prevScore = 0;
      }

      if (score > prevScore) {
        bestByKey.set(market.key, market);
      }
    }
  }

  return Array.from(bestByKey.values());
}

// ---------------------------------------------------------------------------
// Odds extraction helpers
// ---------------------------------------------------------------------------

function extractMoneylines(
  markets: Market[],
  homeTeam: string,
  awayTeam: string,
): { homeMoneyline: number | null; awayMoneyline: number | null; drawMoneyline: number | null } {
  const h2h = markets.find((m) => m.key === 'h2h');
  if (!h2h) return { homeMoneyline: null, awayMoneyline: null, drawMoneyline: null };

  let homeMoneyline: number | null = null;
  let awayMoneyline: number | null = null;
  let drawMoneyline: number | null = null;

  for (const outcome of h2h.outcomes) {
    if (outcome.name.toLowerCase() === 'draw') {
      drawMoneyline = outcome.price ?? null;
      continue;
    }

    const side = assignOutcomeTeam(outcome.name, homeTeam, awayTeam);
    if (side === 'home') homeMoneyline = outcome.price ?? null;
    else if (side === 'away') awayMoneyline = outcome.price ?? null;
  }

  return { homeMoneyline, awayMoneyline, drawMoneyline };
}

function extractSpreads(
  markets: Market[],
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
    const side = assignOutcomeTeam(outcome.name, homeTeam, awayTeam);
    if (side === 'home') {
      homeSpread = outcome.point ?? null;
      homeSpreadPrice = outcome.price ?? null;
    } else if (side === 'away') {
      awaySpread = outcome.point ?? null;
      awaySpreadPrice = outcome.price ?? null;
    }
  }

  return { homeSpread, awaySpread, homeSpreadPrice, awaySpreadPrice };
}

function extractTotals(
  markets: Market[],
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
  drawMoneyline: number | null = null,
): 'home' | 'away' | 'draw' | null {
  const candidates: Array<{ team: 'home' | 'away' | 'draw'; ml: number }> = [];
  if (homeMoneyline !== null) candidates.push({ team: 'home', ml: homeMoneyline });
  if (awayMoneyline !== null) candidates.push({ team: 'away', ml: awayMoneyline });
  if (drawMoneyline !== null) candidates.push({ team: 'draw', ml: drawMoneyline });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.ml - b.ml);
  const lowest = candidates[0].ml;
  const tied = candidates.filter((c) => c.ml === lowest);
  if (tied.length > 1) return null;
  return candidates[0].team;
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

    for (const espnGame of games) {
      const oddsGame = oddsGames.find(
        (og) =>
          withinDateWindow(og.commence_time, espnGame.scheduledAt) &&
          teamsMatchGame(og.home_team, og.away_team, espnGame.homeTeam, espnGame.awayTeam),
      );

      if (!oddsGame?.bookmakers?.length) continue;

      const markets = selectBestMarkets(oddsGame.bookmakers);

      const oddsHomeIsEspnHome = oddsHomeMatchesEspnHome(
        oddsGame.home_team,
        espnGame.homeTeam,
      );
      const oddsHomeTeam = oddsHomeIsEspnHome ? espnGame.homeTeam : espnGame.awayTeam;
      const oddsAwayTeam = oddsHomeIsEspnHome ? espnGame.awayTeam : espnGame.homeTeam;

      const { homeMoneyline: rawHome, awayMoneyline: rawAway, drawMoneyline: rawDraw } =
        extractMoneylines(markets, oddsHomeTeam, oddsAwayTeam);

      const homeMoneyline = oddsHomeIsEspnHome ? rawHome : rawAway;
      const awayMoneyline = oddsHomeIsEspnHome ? rawAway : rawHome;
      const moneylineDraw = rawDraw;

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
      const favoredTeam = determineFavoredTeam(homeMoneyline, awayMoneyline, moneylineDraw);

      result.set(espnGame.espnEventId, {
        homeMoneyline,
        awayMoneyline,
        moneylineDraw,
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
