export interface MlbPickInput {
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  homePitcherStats: Record<string, string>;
  awayPitcherStats: Record<string, string>;
  spread: number | null;
  moneylineHome: number | null;
  moneylineAway: number | null;
}

export interface MlbPickResult {
  favoredTeam: 'home' | 'away';
  hasOdds: boolean;
  pickLabel: string;
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

function hasUsableOdds(input: MlbPickInput): boolean {
  const hasMoneyline =
    input.moneylineHome !== null &&
    input.moneylineAway !== null &&
    !(input.moneylineHome === 0 && input.moneylineAway === 0);
  const hasSpread = input.spread !== null && input.spread !== 0;
  return hasMoneyline || hasSpread;
}

function pickFromOdds(input: MlbPickInput): 'home' | 'away' {
  if (input.spread !== null && input.spread !== 0) {
    return input.spread <= 0 ? 'home' : 'away';
  }

  if (
    input.moneylineHome !== null &&
    input.moneylineAway !== null &&
    input.moneylineHome !== input.moneylineAway
  ) {
    return input.moneylineHome < input.moneylineAway ? 'home' : 'away';
  }

  return 'home';
}

function pickFromAnalysis(input: MlbPickInput): 'home' | 'away' {
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

  const homeRuns = parseStatNumber(input.homeStats, ['Runs', 'Runs Per Game', 'R/G']);
  const awayRuns = parseStatNumber(input.awayStats, ['Runs', 'Runs Per Game', 'R/G']);
  if (homeRuns !== null && awayRuns !== null) {
    if (homeRuns > awayRuns) homeScore += 1;
    else if (awayRuns > homeRuns) awayScore += 1;
  }

  return homeScore >= awayScore ? 'home' : 'away';
}

function buildOddsPickLabel(
  favoredTeam: 'home' | 'away',
  input: MlbPickInput,
): string {
  const favoredTeamName = favoredTeam === 'home' ? input.homeTeam : input.awayTeam;

  if (input.spread !== null && input.spread !== 0) {
    const spreadForPick =
      favoredTeam === 'home'
        ? input.spread
        : input.spread === 0
          ? 0
          : -input.spread;
    const spreadStr = spreadForPick > 0 ? `+${spreadForPick}` : `${spreadForPick}`;
    return `${favoredTeamName} ${spreadStr}`;
  }

  const ml =
    favoredTeam === 'home' ? input.moneylineHome : input.moneylineAway;
  if (ml !== null && ml !== 0) {
    const mlStr = ml > 0 ? `+${ml}` : `${ml}`;
    return `${favoredTeamName} (${mlStr})`;
  }

  return `${favoredTeamName} to win`;
}

export function resolveMlbPick(
  input: MlbPickInput,
  options: { allowStatsFallback: boolean },
): MlbPickResult | null {
  const hasOdds = hasUsableOdds(input);

  if (!hasOdds && !options.allowStatsFallback) {
    return null;
  }

  const favoredTeam = hasOdds ? pickFromOdds(input) : pickFromAnalysis(input);
  const favoredTeamName = favoredTeam === 'home' ? input.homeTeam : input.awayTeam;
  const pickLabel = hasOdds
    ? buildOddsPickLabel(favoredTeam, input)
    : `${favoredTeamName} to win`;

  return { favoredTeam, hasOdds, pickLabel };
}
