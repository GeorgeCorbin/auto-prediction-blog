export interface MlbPickInput {
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  homePitcherStats: Record<string, string>;
  awayPitcherStats: Record<string, string>;
  spreadHome: number | null;
  spreadAway: number | null;
  spreadHomePrice: number | null;
  spreadAwayPrice: number | null;
  moneylineHome: number | null;
  moneylineAway: number | null;
  total: number | null;
  overPrice: number | null;
  underPrice: number | null;
}

export interface MlbPickResult {
  favoredTeam: 'home' | 'away';
  hasOdds: boolean;
  pickLabel: string;
}

interface AnalysisScores {
  homeScore: number;
  awayScore: number;
}

interface BetCandidate {
  label: string;
  ev: number;
  edge: number;
}

function parseWinPct(record: string): number | null {
  const match = record.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const total = wins + losses;
  if (total === 0) return null;
  return wins / total;
}

function parseStatNumber(stats: Record<string, string>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = stats[key];
    if (raw === undefined) continue;
    const value = Number.parseFloat(raw.replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(value)) return value;
  }
  return null;
}

export function hasUsableOdds(input: MlbPickInput): boolean {
  const hasMoneyline =
    input.moneylineHome !== null &&
    input.moneylineAway !== null &&
    !(input.moneylineHome === 0 && input.moneylineAway === 0);
  const hasSpread =
    (input.spreadHome !== null && input.spreadHome !== 0) ||
    (input.spreadAway !== null && input.spreadAway !== 0);
  const hasTotal =
    input.total !== null &&
    input.overPrice !== null &&
    input.underPrice !== null;
  return hasMoneyline || hasSpread || hasTotal;
}

function americanToDecimalProfit(american: number): number {
  if (american >= 0) return american / 100;
  return 100 / Math.abs(american);
}

function americanToImpliedProb(american: number): number {
  if (american >= 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

function noVigTwoWay(oddsA: number, oddsB: number): { a: number; b: number } {
  const rawA = americanToImpliedProb(oddsA);
  const rawB = americanToImpliedProb(oddsB);
  const overround = rawA + rawB;
  return { a: rawA / overround, b: rawB / overround };
}

function expectedValue(modelProb: number, americanOdds: number): number {
  const profit = americanToDecimalProfit(americanOdds);
  return modelProb * profit - (1 - modelProb);
}

function computeAnalysisScores(input: MlbPickInput): AnalysisScores {
  let homeScore = 0.5;
  let awayScore = 0;

  const homeWinPct = parseWinPct(input.homeRecord);
  const awayWinPct = parseWinPct(input.awayRecord);
  if (homeWinPct !== null && awayWinPct !== null) {
    if (homeWinPct > awayWinPct) homeScore += 2;
    else if (awayWinPct > homeWinPct) awayScore += 2;
  }

  const homeEra = parseStatNumber(input.homePitcherStats, ['ERA', 'era']);
  const awayEra = parseStatNumber(input.awayPitcherStats, ['ERA', 'era']);
  if (homeEra !== null && awayEra !== null) {
    if (homeEra < awayEra) homeScore += 3;
    else if (awayEra < homeEra) awayScore += 3;
  }

  const homeRuns = parseStatNumber(input.homeStats, ['Runs', 'Runs Per Game', 'R/G', 'runsPerGame']);
  const awayRuns = parseStatNumber(input.awayStats, ['Runs', 'Runs Per Game', 'R/G', 'runsPerGame']);
  if (homeRuns !== null && awayRuns !== null) {
    if (homeRuns > awayRuns) homeScore += 1;
    else if (awayRuns > homeRuns) awayScore += 1;
  }

  const homeOps = parseStatNumber(input.homeStats, ['OPS', 'ops']);
  const awayOps = parseStatNumber(input.awayStats, ['OPS', 'ops']);
  if (homeOps !== null && awayOps !== null) {
    if (homeOps > awayOps) homeScore += 1;
    else if (awayOps > homeOps) awayScore += 1;
  }

  const homeWhip = parseStatNumber(input.homePitcherStats, ['WHIP', 'whip']);
  const awayWhip = parseStatNumber(input.awayPitcherStats, ['WHIP', 'whip']);
  if (homeWhip !== null && awayWhip !== null) {
    if (homeWhip < awayWhip) homeScore += 1;
    else if (awayWhip < homeWhip) awayScore += 1;
  }

  return { homeScore, awayScore };
}

function analysisToWinProb(scores: AnalysisScores): { homeWinProb: number; awayWinProb: number } {
  const total = scores.homeScore + scores.awayScore;
  if (total === 0) return { homeWinProb: 0.5, awayWinProb: 0.5 };
  return {
    homeWinProb: scores.homeScore / total,
    awayWinProb: scores.awayScore / total,
  };
}

function estimateSpreadCoverProb(winProb: number, spread: number): number {
  if (spread < 0) {
    const magnitude = Math.abs(spread);
    const discount = 0.35 + 0.1 * Math.max(0, magnitude - 1);
    return winProb * (1 - discount);
  }

  if (spread > 0) {
    const cushion = 0.28 + 0.08 * Math.max(0, spread - 1);
    return Math.min(0.98, winProb + (1 - winProb) * cushion);
  }

  return winProb;
}

function projectedGameTotal(input: MlbPickInput): number | null {
  const homeRuns = parseStatNumber(input.homeStats, ['Runs', 'Runs Per Game', 'R/G']);
  const awayRuns = parseStatNumber(input.awayStats, ['Runs', 'Runs Per Game', 'R/G']);
  if (homeRuns === null || awayRuns === null) return null;
  return homeRuns + awayRuns;
}

function estimateOverProb(projectedTotal: number, line: number): number {
  const diff = projectedTotal - line;
  return 1 / (1 + Math.exp(-diff * 1.2));
}

function formatSpread(spread: number): string {
  return spread > 0 ? `+${spread}` : `${spread}`;
}

function formatMoneyline(moneyline: number): string {
  return moneyline > 0 ? `+${moneyline}` : `${moneyline}`;
}

function formatTotalLine(total: number): string {
  return Number.isInteger(total) ? `${total}` : `${total}`;
}

function formatSpreadPick(team: 'home' | 'away', input: MlbPickInput): string | null {
  const teamName = team === 'home' ? input.homeTeam : input.awayTeam;
  const spread = team === 'home' ? input.spreadHome : input.spreadAway;
  if (spread === null || spread === 0) return null;
  return `${teamName} ${formatSpread(spread)}`;
}

function formatMoneylinePick(team: 'home' | 'away', input: MlbPickInput): string | null {
  const teamName = team === 'home' ? input.homeTeam : input.awayTeam;
  const moneyline = team === 'home' ? input.moneylineHome : input.moneylineAway;
  if (moneyline === null || moneyline === 0) return null;
  return `${teamName} (${formatMoneyline(moneyline)})`;
}

function buildStatsPickLabel(pickedTeam: 'home' | 'away', input: MlbPickInput): string {
  const pickedTeamName = pickedTeam === 'home' ? input.homeTeam : input.awayTeam;
  return `${pickedTeamName} to win`;
}

function buildOddsPickLabel(pickedTeam: 'home' | 'away', input: MlbPickInput): string {
  return (
    formatSpreadPick(pickedTeam, input) ??
    formatMoneylinePick(pickedTeam, input) ??
    buildStatsPickLabel(pickedTeam, input)
  );
}

function pickBestValueBet(input: MlbPickInput): { pickLabel: string; favoredTeam: 'home' | 'away' } {
  const scores = computeAnalysisScores(input);
  const { homeWinProb, awayWinProb } = analysisToWinProb(scores);
  const favoredTeam: 'home' | 'away' = scores.homeScore >= scores.awayScore ? 'home' : 'away';
  const candidates: BetCandidate[] = [];

  if (
    input.moneylineHome !== null &&
    input.moneylineAway !== null &&
    !(input.moneylineHome === 0 && input.moneylineAway === 0)
  ) {
    const fair = noVigTwoWay(input.moneylineHome, input.moneylineAway);
    const homeLabel = formatMoneylinePick('home', input);
    const awayLabel = formatMoneylinePick('away', input);

    if (homeLabel) {
      candidates.push({
        label: homeLabel,
        ev: expectedValue(homeWinProb, input.moneylineHome),
        edge: homeWinProb - fair.a,
      });
    }
    if (awayLabel) {
      candidates.push({
        label: awayLabel,
        ev: expectedValue(awayWinProb, input.moneylineAway),
        edge: awayWinProb - fair.b,
      });
    }
  }

  if (
    input.spreadHome !== null &&
    input.spreadHome !== 0 &&
    input.spreadHomePrice !== null &&
    input.spreadAwayPrice !== null
  ) {
    const fair = noVigTwoWay(input.spreadHomePrice, input.spreadAwayPrice);
    const homeCoverProb = estimateSpreadCoverProb(homeWinProb, input.spreadHome);
    const homeLabel = formatSpreadPick('home', input);

    if (homeLabel) {
      candidates.push({
        label: homeLabel,
        ev: expectedValue(homeCoverProb, input.spreadHomePrice),
        edge: homeCoverProb - fair.a,
      });
    }
  }

  if (
    input.spreadAway !== null &&
    input.spreadAway !== 0 &&
    input.spreadHomePrice !== null &&
    input.spreadAwayPrice !== null
  ) {
    const fair = noVigTwoWay(input.spreadHomePrice, input.spreadAwayPrice);
    const awayCoverProb = estimateSpreadCoverProb(awayWinProb, input.spreadAway);
    const awayLabel = formatSpreadPick('away', input);

    if (awayLabel) {
      candidates.push({
        label: awayLabel,
        ev: expectedValue(awayCoverProb, input.spreadAwayPrice),
        edge: awayCoverProb - fair.b,
      });
    }
  }

  const projectedTotal = projectedGameTotal(input);
  if (
    projectedTotal !== null &&
    input.total !== null &&
    input.overPrice !== null &&
    input.underPrice !== null
  ) {
    const fair = noVigTwoWay(input.overPrice, input.underPrice);
    const overProb = estimateOverProb(projectedTotal, input.total);
    const underProb = 1 - overProb;
    const line = formatTotalLine(input.total);

    candidates.push({
      label: `Over ${line}`,
      ev: expectedValue(overProb, input.overPrice),
      edge: overProb - fair.a,
    });
    candidates.push({
      label: `Under ${line}`,
      ev: expectedValue(underProb, input.underPrice),
      edge: underProb - fair.b,
    });
  }

  if (candidates.length === 0) {
    return { pickLabel: buildOddsPickLabel(favoredTeam, input), favoredTeam };
  }

  const positiveEdge = candidates.filter((candidate) => candidate.edge > 0);
  const pool = positiveEdge.length > 0 ? positiveEdge : candidates;
  pool.sort((a, b) => b.ev - a.ev || b.edge - a.edge);

  return { pickLabel: pool[0].label, favoredTeam };
}

/** Model probability that the stored pick is correct (0–1). */
export function estimateMlbPickConfidence(input: MlbPickInput, pick: string): number {
  const scores = computeAnalysisScores(input);
  const { homeWinProb, awayWinProb } = analysisToWinProb(scores);
  const pickLower = pick.toLowerCase();

  if (pickLower.startsWith('over ')) {
    const projected = projectedGameTotal(input);
    if (projected !== null && input.total !== null) {
      return estimateOverProb(projected, input.total);
    }
  }
  if (pickLower.startsWith('under ')) {
    const projected = projectedGameTotal(input);
    if (projected !== null && input.total !== null) {
      return 1 - estimateOverProb(projected, input.total);
    }
  }
  if (pickLower.includes(input.homeTeam.toLowerCase())) {
    if (
      input.spreadHome !== null &&
      input.spreadHome !== 0 &&
      pick.includes(formatSpread(input.spreadHome))
    ) {
      return estimateSpreadCoverProb(homeWinProb, input.spreadHome);
    }
    return homeWinProb;
  }
  if (pickLower.includes(input.awayTeam.toLowerCase())) {
    if (
      input.spreadAway !== null &&
      input.spreadAway !== 0 &&
      pick.includes(formatSpread(input.spreadAway))
    ) {
      return estimateSpreadCoverProb(awayWinProb, input.spreadAway);
    }
    return awayWinProb;
  }

  return Math.max(homeWinProb, awayWinProb);
}

export function resolveMlbPick(
  input: MlbPickInput,
  options: { allowStatsFallback: boolean },
): MlbPickResult | null {
  if (options.allowStatsFallback) {
    const scores = computeAnalysisScores(input);
    const pickedTeam: 'home' | 'away' = scores.homeScore >= scores.awayScore ? 'home' : 'away';
    return {
      favoredTeam: pickedTeam,
      hasOdds: false,
      pickLabel: buildStatsPickLabel(pickedTeam, input),
    };
  }

  if (!hasUsableOdds(input)) {
    return null;
  }

  const { pickLabel, favoredTeam } = pickBestValueBet(input);
  return { favoredTeam, hasOdds: true, pickLabel };
}
