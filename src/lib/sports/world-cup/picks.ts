import { hashString } from '@/lib/sports/helpers';

export interface WorldCupPickInput {
  seed?: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  formHome: string;
  formAway: string;
  moneylineHome: number | null;
  moneylineAway: number | null;
  moneylineDraw: number | null;
  total: number | null;
  overPrice: number | null;
  underPrice: number | null;
}

export interface WorldCupPickResult {
  favoredTeam: 'home' | 'away' | 'draw';
  hasOdds: boolean;
  pickLabel: string;
}

interface BetCandidate {
  favoredTeam: 'home' | 'away' | 'draw';
  label: string;
  ev: number;
  edge: number;
}

function parseWinPct(record: string): number | null {
  const draws = record.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  if (draws) {
    const w = Number(draws[1]);
    const d = Number(draws[2]);
    const l = Number(draws[3]);
    const total = w + d + l;
    if (total === 0) return null;
    return (w + d * 0.5) / total;
  }

  const match = record.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const total = wins + losses;
  if (total === 0) return null;
  return wins / total;
}

/** Recent results weighted more heavily (W=1, D=0.5, L=0). */
function parseFormStrength(form: string): number {
  const letters = form.replace(/[^WDL]/gi, '').toUpperCase().split('');
  if (letters.length === 0) return 0.33;

  const recent = letters.slice(-5);
  let weighted = 0;
  let totalWeight = 0;

  for (let i = 0; i < recent.length; i++) {
    const weight = 1 + i * 0.2;
    const result = recent[recent.length - 1 - i];
    const pts = result === 'W' ? 1 : result === 'D' ? 0.5 : 0;
    weighted += pts * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weighted / totalWeight : 0.33;
}

function effectiveFormStrength(form: string, record: string): number {
  if (form.replace(/[^WDL]/gi, '')) {
    return parseFormStrength(form);
  }
  const fromRecord = parseWinPct(record);
  return fromRecord ?? 0.33;
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

function americanToDecimalProfit(american: number): number {
  if (american >= 0) return american / 100;
  return 100 / Math.abs(american);
}

function americanToImpliedProb(american: number): number {
  if (american >= 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

function noVigThreeWay(
  home: number,
  draw: number,
  away: number,
): { home: number; draw: number; away: number } {
  const rawHome = americanToImpliedProb(home);
  const rawDraw = americanToImpliedProb(draw);
  const rawAway = americanToImpliedProb(away);
  const overround = rawHome + rawDraw + rawAway;
  return {
    home: rawHome / overround,
    draw: rawDraw / overround,
    away: rawAway / overround,
  };
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

function formatMoneyline(moneyline: number): string {
  return moneyline > 0 ? `+${moneyline}` : `${moneyline}`;
}

function formatTotalLine(total: number): string {
  return Number.isInteger(total) ? `${total}` : `${total}`;
}

export function hasUsableOdds(input: WorldCupPickInput): boolean {
  const hasThreeWay =
    input.moneylineHome !== null &&
    input.moneylineAway !== null &&
    input.moneylineDraw !== null;
  const hasTotal =
    input.total !== null &&
    input.overPrice !== null &&
    input.underPrice !== null;
  return hasThreeWay || hasTotal;
}

/** Max American moneyline for value picks — avoids phantom +EV on huge underdogs. */
const MAX_VALUE_MONEYLINE = 400;

function hasMeaningfulTeamData(
  form: string,
  record: string,
  stats: Record<string, string>,
): boolean {
  if (form.replace(/[^WDL]/gi, '')) return true;
  if (parseWinPct(record) !== null) return true;
  return (
    parseStatNumber(stats, ['Goals', 'Goals Per Game', 'Goals/Game', 'GPG', 'GF']) !==
    null
  );
}

/** How much to trust form/record stats vs market-implied probabilities (0–0.35). */
function statsDataWeight(input: WorldCupPickInput): number {
  const home = hasMeaningfulTeamData(
    input.formHome,
    input.homeRecord,
    input.homeStats,
  );
  const away = hasMeaningfulTeamData(
    input.formAway,
    input.awayRecord,
    input.awayStats,
  );
  if (home && away) return 0.35;
  if (home || away) return 0.15;
  return 0;
}

function getMarketWinProbs(input: WorldCupPickInput): {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
} | null {
  if (
    input.moneylineHome === null ||
    input.moneylineAway === null ||
    input.moneylineDraw === null
  ) {
    return null;
  }

  const fair = noVigThreeWay(
    input.moneylineHome,
    input.moneylineDraw,
    input.moneylineAway,
  );
  return {
    homeWinProb: fair.home,
    drawProb: fair.draw,
    awayWinProb: fair.away,
  };
}

function blendWinProbs(
  statsProbs: { homeWinProb: number; drawProb: number; awayWinProb: number },
  marketProbs: { homeWinProb: number; drawProb: number; awayWinProb: number } | null,
  statsWeight: number,
): { homeWinProb: number; drawProb: number; awayWinProb: number } {
  if (!marketProbs || statsWeight <= 0) {
    return marketProbs ?? statsProbs;
  }

  const marketWeight = 1 - statsWeight;
  return {
    homeWinProb:
      statsWeight * statsProbs.homeWinProb +
      marketWeight * marketProbs.homeWinProb,
    drawProb:
      statsWeight * statsProbs.drawProb + marketWeight * marketProbs.drawProb,
    awayWinProb:
      statsWeight * statsProbs.awayWinProb +
      marketWeight * marketProbs.awayWinProb,
  };
}

function resolveWinProbs(input: WorldCupPickInput): {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
} {
  const statsProbs = computeStatsWinProbs(input);
  const marketProbs = getMarketWinProbs(input);
  if (!marketProbs) return statsProbs;

  const weight = statsDataWeight(input);
  return blendWinProbs(statsProbs, marketProbs, weight);
}

function computeStatsWinProbs(input: WorldCupPickInput): {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
} {
  const homeForm = effectiveFormStrength(input.formHome, input.homeRecord);
  const awayForm = effectiveFormStrength(input.formAway, input.awayRecord);
  const homeRecord = parseWinPct(input.homeRecord);
  const awayRecord = parseWinPct(input.awayRecord);

  const homeStrength = homeForm * 0.6 + (homeRecord ?? homeForm) * 0.4;
  const awayStrength = awayForm * 0.6 + (awayRecord ?? awayForm) * 0.4;

  const strengthGap = Math.abs(homeStrength - awayStrength);
  const drawBase = 0.22 + Math.max(0, 0.18 - strengthGap * 0.35);

  const matchupTotal = homeStrength + awayStrength + drawBase;
  const homeWinProb = homeStrength / matchupTotal;
  const awayWinProb = awayStrength / matchupTotal;
  const drawProb = drawBase / matchupTotal;

  const norm = homeWinProb + drawProb + awayWinProb;
  return {
    homeWinProb: homeWinProb / norm,
    drawProb: drawProb / norm,
    awayWinProb: awayWinProb / norm,
  };
}

function projectedGoals(input: WorldCupPickInput): number | null {
  const homeGoals = parseStatNumber(input.homeStats, [
    'Goals',
    'Goals Per Game',
    'Goals/Game',
    'GPG',
    'GF',
  ]);
  const awayGoals = parseStatNumber(input.awayStats, [
    'Goals',
    'Goals Per Game',
    'Goals/Game',
    'GPG',
    'GF',
  ]);

  if (homeGoals !== null && awayGoals !== null) {
    return homeGoals + awayGoals;
  }

  const homeForm = effectiveFormStrength(input.formHome, input.homeRecord);
  const awayForm = effectiveFormStrength(input.formAway, input.awayRecord);
  if (homeForm === 0.33 && awayForm === 0.33) return null;

  return 1.8 + (homeForm + awayForm) * 1.6;
}

function estimateOverProb(projectedTotal: number, line: number): number {
  const diff = projectedTotal - line;
  return 1 / (1 + Math.exp(-diff * 1.4));
}

function buildStatsPickLabel(
  picked: 'home' | 'away' | 'draw',
  input: WorldCupPickInput,
): string {
  if (picked === 'draw') return 'Draw';
  const team = picked === 'home' ? input.homeTeam : input.awayTeam;
  return `${team} to win`;
}

function pickBestFavoredTeam(probs: {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
}): 'home' | 'away' | 'draw' {
  if (probs.homeWinProb >= probs.awayWinProb && probs.homeWinProb >= probs.drawProb) {
    return 'home';
  }
  if (probs.awayWinProb >= probs.drawProb) return 'away';
  return 'draw';
}

function isEligibleMoneylineCandidate(american: number): boolean {
  return american <= MAX_VALUE_MONEYLINE;
}

function pickBestValueBet(
  input: WorldCupPickInput,
  probs: { homeWinProb: number; drawProb: number; awayWinProb: number },
): { favoredTeam: 'home' | 'away' | 'draw'; pickLabel: string } {
  const favoredTeam = pickBestFavoredTeam(probs);
  const candidates: BetCandidate[] = [];

  if (
    input.moneylineHome !== null &&
    input.moneylineAway !== null &&
    input.moneylineDraw !== null
  ) {
    const fair = noVigThreeWay(
      input.moneylineHome,
      input.moneylineDraw,
      input.moneylineAway,
    );

    const sides: Array<{
      favoredTeam: 'home' | 'away' | 'draw';
      american: number;
      teamLabel: string;
      prob: number;
      fairProb: number;
    }> = [
      {
        favoredTeam: 'home',
        american: input.moneylineHome,
        teamLabel: input.homeTeam,
        prob: probs.homeWinProb,
        fairProb: fair.home,
      },
      {
        favoredTeam: 'draw',
        american: input.moneylineDraw,
        teamLabel: 'Draw',
        prob: probs.drawProb,
        fairProb: fair.draw,
      },
      {
        favoredTeam: 'away',
        american: input.moneylineAway,
        teamLabel: input.awayTeam,
        prob: probs.awayWinProb,
        fairProb: fair.away,
      },
    ];

    for (const side of sides) {
      if (!isEligibleMoneylineCandidate(side.american)) continue;
      const label =
        side.favoredTeam === 'draw'
          ? `Draw (${formatMoneyline(side.american)})`
          : `${side.teamLabel} (${formatMoneyline(side.american)})`;
      candidates.push({
        favoredTeam: side.favoredTeam,
        label,
        ev: expectedValue(side.prob, side.american),
        edge: side.prob - side.fairProb,
      });
    }
  }

  const projectedTotal = projectedGoals(input);
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

    candidates.push(
      {
        favoredTeam,
        label: `Over ${line}`,
        ev: expectedValue(overProb, input.overPrice),
        edge: overProb - fair.a,
      },
      {
        favoredTeam,
        label: `Under ${line}`,
        ev: expectedValue(underProb, input.underPrice),
        edge: underProb - fair.b,
      },
    );
  }

  if (candidates.length === 0) {
    return {
      favoredTeam,
      pickLabel: buildStatsPickLabel(favoredTeam, input),
    };
  }

  const positiveEdge = candidates.filter((c) => c.edge > 0);
  const pool = positiveEdge.length > 0 ? positiveEdge : candidates;
  pool.sort((a, b) => b.ev - a.ev || b.edge - a.edge);

  const bestEv = pool[0].ev;
  const closeCandidates = pool.filter((c) => bestEv - c.ev <= 0.015);
  const seed = input.seed ?? `${input.awayTeam}:${input.homeTeam}`;
  const pickIndex =
    closeCandidates.length > 1
      ? hashString(`${seed}:pick`) % closeCandidates.length
      : 0;
  const chosen = closeCandidates[pickIndex] ?? pool[0];

  return { favoredTeam: chosen.favoredTeam, pickLabel: chosen.label };
}

/** Model probability that the stored pick is correct (0–1). */
export function estimateWorldCupPickConfidence(
  input: WorldCupPickInput,
  pick: string,
): number {
  const probs = resolveWinProbs(input);
  const pickLower = pick.toLowerCase();

  if (pickLower === 'draw') return probs.drawProb;

  if (pickLower.startsWith('over ')) {
    const projected = projectedGoals(input);
    if (projected !== null && input.total !== null) {
      return estimateOverProb(projected, input.total);
    }
  }
  if (pickLower.startsWith('under ')) {
    const projected = projectedGoals(input);
    if (projected !== null && input.total !== null) {
      return 1 - estimateOverProb(projected, input.total);
    }
  }
  if (pickLower.includes(input.homeTeam.toLowerCase())) return probs.homeWinProb;
  if (pickLower.includes(input.awayTeam.toLowerCase())) return probs.awayWinProb;

  return Math.max(probs.homeWinProb, probs.drawProb, probs.awayWinProb);
}

export function resolveWorldCupPick(
  input: WorldCupPickInput,
  options: { allowStatsFallback: boolean },
): WorldCupPickResult | null {
  if (!options.allowStatsFallback && !hasUsableOdds(input)) {
    return null;
  }

  if (!options.allowStatsFallback) {
    const probs = resolveWinProbs(input);
    const { favoredTeam, pickLabel } = pickBestValueBet(input, probs);
    return { favoredTeam, hasOdds: true, pickLabel };
  }

  const statsProbs = computeStatsWinProbs(input);
  const picked = pickBestFavoredTeam(statsProbs);
  const seed = input.seed ?? `${input.awayTeam}:${input.homeTeam}`;
  const statsOptions: Array<'home' | 'away' | 'draw'> = [picked];
  if (statsProbs.drawProb >= 0.2 && picked !== 'draw') statsOptions.push('draw');
  const runnerUp =
    statsProbs.homeWinProb >= statsProbs.awayWinProb
      ? statsProbs.awayWinProb >= statsProbs.drawProb
        ? 'away'
        : 'draw'
      : statsProbs.homeWinProb >= statsProbs.drawProb
        ? 'home'
        : 'draw';
  if (runnerUp !== picked) statsOptions.push(runnerUp);
  const finalPick =
    statsOptions.length > 1
      ? statsOptions[hashString(`${seed}:stats`) % statsOptions.length]
      : picked;

  return {
    favoredTeam: finalPick,
    hasOdds: false,
    pickLabel: buildStatsPickLabel(finalPick, input),
  };
}
