import { pickFromPool } from '@/lib/sports/helpers';

export interface MlbGameContext {
  variationSeed: string;
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
  spreadHome: number;
  spreadAway: number;
  total: number;
  favoredTeam: 'home' | 'away';
  hasOdds: boolean;
  pickLabel: string;
}

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function formatSpread(spread: number): string {
  return spread > 0 ? `+${spread}` : `${spread}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const MLB_ANGLES = [
  {
    name: 'pitching duel',
    hook: (ctx: MlbGameContext) =>
      `Open with the pitching matchup between ${ctx.awayPitcher} and ${ctx.homePitcher} — who has the edge based only on the stats provided.`,
    emphasis: 'Lead with starting pitcher W-L and ERA, then team offense.',
  },
  {
    name: 'offensive firepower',
    hook: (ctx: MlbGameContext) =>
      `Open by contrasting ${ctx.awayTeam} and ${ctx.homeTeam} offensive production using only season averages from the DATA BLOCK.`,
    emphasis: 'Lead with team hitting stats, then connect to the pitching matchup.',
  },
  {
    name: 'form and records',
    hook: (ctx: MlbGameContext) =>
      `Open with how each team's record and recent trajectory set up this ${formatDate(ctx.scheduledAt)} matchup — cite only provided records and stats.`,
    emphasis: 'Balance team records with pitcher profiles before your pick.',
  },
  {
    name: 'betting line read',
    hook: (ctx: MlbGameContext) =>
      ctx.hasOdds
        ? `Open with how the betting market prices this game and where the numbers may align or diverge from team form — DATA BLOCK only.`
        : `Open with a straight-up winner read based on records, pitching, and team stats from the DATA BLOCK.`,
    emphasis: 'Weave market context (if available) into pitcher and team analysis.',
  },
] as const;

export function buildMlbPrompt(ctx: MlbGameContext): string {
  const gameDate = formatDate(ctx.scheduledAt);
  const angle = pickFromPool(MLB_ANGLES, `${ctx.variationSeed}:mlb-angle`);

  const bettingLinesSection = ctx.hasOdds
    ? `
BETTING LINES:
${ctx.awayTeam} Moneyline: ${formatMoneyline(ctx.awayMoneyline)}
${ctx.homeTeam} Moneyline: ${formatMoneyline(ctx.homeMoneyline)}
Run Line: ${ctx.awayTeam} ${formatSpread(ctx.spreadAway)}, ${ctx.homeTeam} ${formatSpread(ctx.spreadHome)}
Over/Under: ${ctx.total}`
    : '';

  const structureWithOdds = `1. Opening paragraph: state the matchup, date, and your headline pick recommendation
2. Home team analysis: weave their batting average, runs per game, OPS, and ERA naturally into full sentences — e.g. "The Braves rank among the league leaders with a .265 team average and 4.8 runs per game, while their rotation carries a 3.81 ERA." Do not use bullet points or stat lists.
3. Away team analysis: same approach — weave their key numbers into flowing prose sentences. Mention the starting pitcher by name with their record and ERA embedded in a sentence.
4. Prediction reasoning: contrast the two sides' stats in paragraph form, reference the betting line, and arrive at the pick naturally through the analysis — no standalone pick callout`;

  const structureWithoutOdds = `1. Opening paragraph: state the matchup, date, and your headline pick recommendation
2. Home team analysis: weave their batting average, runs per game, OPS, and ERA naturally into full sentences — e.g. "The Braves rank among the league leaders with a .265 team average and 4.8 runs per game, while their rotation carries a 3.81 ERA." Do not use bullet points or stat lists.
3. Away team analysis: same approach — weave their key numbers into flowing prose sentences. Mention the starting pitcher by name with their record and ERA embedded in a sentence.
4. Prediction reasoning: contrast the two sides' stats in paragraph form and arrive at the pick naturally through the analysis — no standalone pick callout; do not reference betting lines`;

  const systemPrompt = `You are a professional sports analyst writing MLB game prediction articles for a sports prediction blog. Your writing style is authoritative, data-driven, and engaging — similar to ESPN or The Athletic. Write in the third person and avoid using "I".

CRITICAL RULE — NO STAT HALLUCINATION:
You will be given a DATA BLOCK containing the only stats you are allowed to cite. You MUST NOT invent, estimate, or infer any statistic not explicitly listed in that block. If a stat is not in the data block (e.g. WHIP, batting average, OPS, strikeout rate, recent streak length), do NOT mention it — not even approximately. Violating this rule undermines the credibility of the site. When you want to make an analytical point but lack a specific number, use general language ("strong ERA", "solid offensive output") instead of fabricating a figure.

ANTI-REPETITION:
- Do NOT use generic openings like "In what promises to be..." or "All eyes will be on..."
- This article uses the "${angle.name}" angle — ${angle.emphasis}
- Vary paragraph openings; avoid repetitive transition phrases`;

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
- Line 1: Article title — use ONE of these styles (pick the best fit for this matchup):
  • "{AwayTeam} vs {HomeTeam} Prediction ({Month Day}): Odds, Pick & Analysis"
  • "{AwayTeam} vs {HomeTeam} Prediction ({Month Day}): Our Pick Is ${ctx.pickLabel}"
  • "{AwayTeam} vs {HomeTeam} ({Month Day}): Run Line Pick, Odds & Best Bet"
  Do NOT include the year in the title. Do NOT add any markdown (#) to the title line.
- Line 2: Empty line
- Line 3 onward: Article body

OPENING HOOK (paragraph 1):
${angle.hook(ctx)}

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

EDITORIAL PICK (for your analysis only — do NOT copy this line or any standalone pick callout into the article): ${ctx.pickLabel}

━━━ END DATA BLOCK ━━━

Write the article now. Every number you quote must appear exactly as shown in the DATA BLOCK above. Make the analysis compelling without inventing stats.`;

  return `${systemPrompt}\n\n${userPrompt}`;
}

export function buildMlbMetaDescription(ctx: MlbGameContext, pick: string): string {
  const date = ctx.scheduledAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const desc = `${ctx.awayTeam} vs ${ctx.homeTeam} prediction for ${date}. Our pick: ${pick}. Expert analysis with starting pitcher stats and team trends.`;
  return desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
}
