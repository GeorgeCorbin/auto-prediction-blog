import type { Game } from '@prisma/client';
import { safeJsonRecord } from '@/lib/sports/helpers';
import { estimateMlbPickConfidence } from '@/lib/sports/mlb/picks';
import { parseMlbSportData } from '@/lib/sports/mlb/schema';
import { estimateWorldCupPickConfidence } from '@/lib/sports/world-cup/picks';
import { parseWorldCupSportData } from '@/lib/sports/world-cup/schema';

export function estimatePickConfidence(game: Game, pick: string, sport: string): number {
  switch (sport) {
    case 'mlb':
      return estimateMlbPickConfidence(buildMlbPickInput(game), pick);
    case 'world-cup':
      return estimateWorldCupPickConfidence(buildWorldCupPickInput(game), pick);
    default:
      return 0.5;
  }
}

function buildMlbPickInput(game: Game) {
  const homeStats = safeJsonRecord(game.homeStats);
  const awayStats = safeJsonRecord(game.awayStats);
  const mlbData = parseMlbSportData(game.sportData);
  const homePitcherStats = safeJsonRecord(mlbData.homePitcherStats);
  const awayPitcherStats = safeJsonRecord(mlbData.awayPitcherStats);

  return {
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeRecord: homeStats.record ?? '',
    awayRecord: awayStats.record ?? '',
    homeStats,
    awayStats,
    homePitcherStats,
    awayPitcherStats,
    spreadHome: game.spreadHome,
    spreadAway: game.spreadAway,
    spreadHomePrice: game.spreadHomePrice,
    spreadAwayPrice: game.spreadAwayPrice,
    moneylineHome: game.moneylineHome,
    moneylineAway: game.moneylineAway,
    total: game.total,
    overPrice: game.overPrice,
    underPrice: game.underPrice,
  };
}

function buildWorldCupPickInput(game: Game) {
  const homeStats = safeJsonRecord(game.homeStats);
  const awayStats = safeJsonRecord(game.awayStats);
  const wcData = parseWorldCupSportData(game.sportData);

  return {
    seed: game.espnEventId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeRecord: wcData.recordHome ?? homeStats.record ?? '',
    awayRecord: wcData.recordAway ?? awayStats.record ?? '',
    homeStats,
    awayStats,
    formHome: wcData.formHome ?? '',
    formAway: wcData.formAway ?? '',
    moneylineHome: game.moneylineHome,
    moneylineAway: game.moneylineAway,
    moneylineDraw: game.moneylineDraw,
    total: game.total,
    overPrice: game.overPrice,
    underPrice: game.underPrice,
  };
}
