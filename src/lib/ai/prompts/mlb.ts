export interface MlbGameContext {
  homeTeam: string;
  awayTeam: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  scheduledAt: Date;
  homeRecord: string;
  awayRecord: string;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  homePitcher: string;
  awayPitcher: string;
  homePitcherStats: Record<string, string>;
  awayPitcherStats: Record<string, string>;
  homeMoneyline: number;
  awayMoneyline: number;
  spread: number;
  total: number;
  favoredTeam: 'home' | 'away';
  hasOdds: boolean;
  pickLabel: string;
}

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildMlbPrompt(ctx: MlbGameContext): string {
  const gameDate = formatDate(ctx.scheduledAt);

  const bettingLinesSection = ctx.hasOdds
    ? `
BETTING LINES:
${ctx.awayTeam} Moneyline: ${formatMoneyline(ctx.awayMoneyline)}
${ctx.homeTeam} Moneyline: ${formatMoneyline(ctx.homeMoneyline)}
Run Line (spread): ${ctx.homeTeam} ${ctx.spread > 0 ? '+' : ''}${ctx.spread}
Over/Under: ${ctx.total}`
    : '';

  const structureWithOdds = `1. Opening paragraph: state the matchup, date, and your headline pick recommendation
2. Home team analysis: discuss their offense (AVG, runs, hits) and starting pitcher (name, W-L record, ERA) — only reference stats you are given
3. Away team analysis: discuss their offense and starting pitcher — only reference stats you are given
4. Prediction reasoning: compare the pitching matchup, team form, and betting line value
5. Final paragraph: restate your pick clearly with the spread or moneyline`;

  const structureWithoutOdds = `1. Opening paragraph: state the matchup, date, and your headline pick recommendation
2. Home team analysis: discuss their offense (AVG, runs, hits) and starting pitcher (name, W-L record, ERA) — only reference stats you are given
3. Away team analysis: discuss their offense and starting pitcher — only reference stats you are given
4. Prediction reasoning: compare the pitching matchup, team records, and recent form — do not reference betting lines
5. Final paragraph: restate your pick clearly as a straight-up winner (team name only, no spread or moneyline)`;

  const systemPrompt = `You are a professional sports analyst writing MLB game prediction articles for a sports prediction blog. Your writing style is authoritative, data-driven, and engaging — similar to ESPN or The Athletic. Write in the third person and avoid using "I".

CRITICAL RULE — NO STAT HALLUCINATION:
You will be given a DATA BLOCK containing the only stats you are allowed to cite. You MUST NOT invent, estimate, or infer any statistic not explicitly listed in that block. If a stat is not in the data block (e.g. WHIP, batting average, OPS, strikeout rate, recent streak length), do NOT mention it — not even approximately. Violating this rule undermines the credibility of the site. When you want to make an analytical point but lack a specific number, use general language ("strong ERA", "solid offensive output") instead of fabricating a figure.`;

  // Build the data block — only real values, clearly labelled
  const awayPitcherLine = Object.entries(ctx.awayPitcherStats)
    .filter(([k]) => k !== 'record')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  const homePitcherLine = Object.entries(ctx.homePitcherStats)
    .filter(([k]) => k !== 'record')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const userPrompt = `Write a 400–600 word MLB game prediction article for the following matchup. Output ONLY the article text — no JSON, no markdown headers using # syntax except the title line.

FORMAT:
- Line 1: Article title in exactly this format: "{AwayTeam} vs {HomeTeam} Prediction {Month Day, Year}"
- Line 2: Empty line
- Line 3 onward: Article body

STRUCTURE (follow this order):
${ctx.hasOdds ? structureWithOdds : structureWithoutOdds}

━━━ DATA BLOCK — cite ONLY these numbers, cite them accurately ━━━

GAME DETAILS:
- Matchup: ${ctx.awayTeam} (${ctx.awayTeamAbbr}) @ ${ctx.homeTeam} (${ctx.homeTeamAbbr})
- Date: ${gameDate}
- ${ctx.awayTeam} Record: ${ctx.awayRecord}
- ${ctx.homeTeam} Record: ${ctx.homeRecord}

TEAM STATS (season averages):
${ctx.awayTeam}: ${Object.entries(ctx.awayStats).map(([k, v]) => `${k}: ${v}`).join(', ')}
${ctx.homeTeam}: ${Object.entries(ctx.homeStats).map(([k, v]) => `${k}: ${v}`).join(', ')}

PROBABLE STARTERS:
${ctx.awayTeam}: ${ctx.awayPitcher} — ${awayPitcherLine}
${ctx.homeTeam}: ${ctx.homePitcher} — ${homePitcherLine}${bettingLinesSection}

OUR PICK: ${ctx.pickLabel}

━━━ END DATA BLOCK ━━━

Write the article now. Every number you quote must appear exactly as shown in the DATA BLOCK above. Make the analysis compelling without inventing stats.`;

  return `${systemPrompt}\n\n${userPrompt}`;
}
