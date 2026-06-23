import { pickFromPool } from '@/lib/sports/helpers';

export interface WorldCupGameContext {
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
  formHome: string;
  formAway: string;
  groupName: string;
  stage: string;
  gameNote: string;
  venueName: string;
  venueCity: string;
  venueCountry: string;
  watchString: string;
  homeMoneyline: number;
  awayMoneyline: number;
  drawMoneyline: number;
  total: number;
  favoredTeam: 'home' | 'away' | 'draw';
  hasOdds: boolean;
  pickLabel: string;
  articleAngle?: string;
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

/** Format optional data-block lines — omit empty values instead of "N/A". */
function dataLine(label: string, value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `- ${label}: ${trimmed}`;
}

/** Human-readable team stats for the DATA BLOCK; omits empty stat objects. */
function formatTeamStatsBlock(team: string, stats: Record<string, string>): string | null {
  const entries = Object.entries(stats).filter(
    ([k, v]) => v.trim() && k !== 'record',
  );
  if (entries.length === 0) return null;
  const formatted = entries
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      return `${label}: ${v}`;
    })
    .join(', ');
  return `- ${team} stats: ${formatted}`;
}

function formatFormForHook(form: string): string {
  const letters = form.replace(/[^WDL]/gi, '').toUpperCase();
  return letters || 'see DATA BLOCK';
}

function formStrength(form: string): number {
  const letters = form.replace(/[^WDL]/gi, '').toUpperCase();
  if (!letters) return 0.33;
  let pts = 0;
  for (const r of letters.slice(-5)) {
    pts += r === 'W' ? 1 : r === 'D' ? 0.5 : 0;
  }
  return pts / Math.min(letters.length, 5);
}

function isKnockoutStage(stage: string): boolean {
  return /knockout|round of|quarter|semi|final/i.test(stage);
}

type NarrativeAngle =
  | 'tactical'
  | 'stakes'
  | 'form clash'
  | 'venue and atmosphere'
  | 'betting value'
  | 'underdog story';

type WritingStyle = 'analytical' | 'narrative' | 'sharp and concise' | 'matchup-focused';

interface ArticleVariation {
  angle: NarrativeAngle;
  style: WritingStyle;
  hook: string;
  structure: string;
}

const NARRATIVE_ANGLES: NarrativeAngle[] = [
  'tactical',
  'stakes',
  'form clash',
  'venue and atmosphere',
  'betting value',
  'underdog story',
];

const WRITING_STYLES: WritingStyle[] = [
  'analytical',
  'narrative',
  'sharp and concise',
  'matchup-focused',
];

function buildAngleHook(
  angle: NarrativeAngle,
  ctx: WorldCupGameContext,
  knockout: boolean,
): string {
  const venueLine = [ctx.venueName, ctx.venueCity].filter(Boolean).join(', ');

  switch (angle) {
    case 'tactical':
      return knockout
        ? `Open with how ${ctx.awayTeam} and ${ctx.homeTeam} may approach a high-stakes ${ctx.stage} tie — shape, tempo, and where the matchup could tilt, using only provided stats.`
        : `Open with a tactical read of how ${ctx.awayTeam} and ${ctx.homeTeam} match up stylistically — only reference stats from the DATA BLOCK.`;
    case 'stakes':
      return knockout
        ? `Open on elimination stakes in this ${ctx.stage} fixture — what a result means for the survivor, grounded in form and record from the DATA BLOCK.`
        : `Open on what's at stake in ${ctx.groupName || 'the group'} — positioning pressure and why this result matters, without inventing standings.`;
    case 'form clash':
      return `Open by contrasting recent form: ${ctx.awayTeam} (${formatFormForHook(ctx.formAway)}) vs ${ctx.homeTeam} (${formatFormForHook(ctx.formHome)}) — frame the momentum gap using only DATA BLOCK numbers.`;
    case 'venue and atmosphere':
      return venueLine
        ? `Open with the stage setting at ${venueLine} — host-city context and how the environment frames this fixture, then pivot to your pick.`
        : `Open with the tournament stage and fixture context, then connect venue atmosphere to the matchup before stating your pick.`;
    case 'betting value':
      return ctx.hasOdds
        ? `Open by framing where the market may be mispricing this fixture — connect implied odds to the stats you are given, then land your pick.`
        : `Open with a value-oriented read of the matchup using only provided records and form — where the numbers suggest an edge.`;
    case 'underdog story':
      return ctx.favoredTeam === 'away'
        ? `Open with ${ctx.awayTeam}'s path as the side facing longer odds — what their form and record suggest about an upset path.`
        : ctx.favoredTeam === 'draw'
          ? `Open with why a stalemate is live in this fixture — draw dynamics, form, and defensive records from the DATA BLOCK only.`
          : `Open with ${ctx.homeTeam}'s case as the side the numbers favor — and what ${ctx.awayTeam} must do to flip the script.`;
  }
}

function buildStructure(
  angle: NarrativeAngle,
  ctx: WorldCupGameContext,
  style: WritingStyle,
): string {
  const homeBlock = `${ctx.homeTeam}: tournament record, form, and key stats — DATA BLOCK only`;
  const awayBlock = `${ctx.awayTeam}: tournament record, form, and key stats — DATA BLOCK only`;
  const pickBlock = 'Prediction synthesis: weave your editorial pick naturally into the analysis';

  const sections: string[] = [];

  if (style === 'matchup-focused') {
    sections.push(
      `1. Opening: head-to-head matchup frame and headline pick`,
      `2. ${awayBlock}`,
      `3. ${homeBlock}`,
      `4. ${pickBlock}`,
    );
  } else if (style === 'sharp and concise') {
    sections.push(
      `1. Opening: one sharp paragraph with your pick stated early`,
      `2. ${homeBlock}`,
      `3. ${awayBlock}`,
      `4. ${pickBlock} — keep paragraphs tight`,
    );
  } else if (angle === 'form clash' || angle === 'underdog story') {
    const hot = formStrength(ctx.formHome) >= formStrength(ctx.formAway) ? ctx.homeTeam : ctx.awayTeam;
    const cold = hot === ctx.homeTeam ? ctx.awayTeam : ctx.homeTeam;
    sections.push(
      `1. Opening: ${angle === 'form clash' ? 'form contrast' : 'underdog narrative'} and headline pick`,
      `2. ${hot}: momentum and what the numbers show — DATA BLOCK only`,
      `3. ${cold}: counter-case and limitations — DATA BLOCK only`,
      `4. ${pickBlock}`,
    );
  } else if (angle === 'venue and atmosphere') {
    sections.push(
      `1. Opening: venue/stage setting and headline pick`,
      `2. ${homeBlock}`,
      `3. ${awayBlock}`,
      `4. ${pickBlock} — tie environment to the forecast`,
    );
  } else if (angle === 'betting value' && ctx.hasOdds) {
    sections.push(
      `1. Opening: market read and headline pick`,
      `2. ${awayBlock}`,
      `3. ${homeBlock}`,
      `4. ${pickBlock} — reference only BETTING LINES from the DATA BLOCK`,
    );
  } else {
    sections.push(
      `1. Opening: ${angle} angle and headline pick`,
      `2. ${homeBlock}`,
      `3. ${awayBlock}`,
      `4. ${pickBlock}`,
    );
  }

  return sections.join('\n');
}

function selectArticleVariation(ctx: WorldCupGameContext): ArticleVariation {
  const seed = ctx.variationSeed;
  const knockout = isKnockoutStage(ctx.stage);

  let angle = pickFromPool(NARRATIVE_ANGLES, `${seed}:angle`);
  if (knockout && angle === 'venue and atmosphere') {
    angle = pickFromPool(['stakes', 'tactical', 'form clash'] as const, `${seed}:knockout`);
  }

  const style = pickFromPool(WRITING_STYLES, `${seed}:style`);
  const hook = buildAngleHook(angle, ctx, knockout);
  const structure = buildStructure(angle, ctx, style);

  return { angle, style, hook, structure };
}

export function buildWorldCupPrompt(ctx: WorldCupGameContext): string {
  const gameDate = formatDate(ctx.scheduledAt);
  const variation = selectArticleVariation(ctx);
  ctx.articleAngle = variation.angle;

  const venueLine = [ctx.venueName, ctx.venueCity, ctx.venueCountry]
    .filter(Boolean)
    .join(', ');

  const bettingLinesSection = ctx.hasOdds
    ? `
BETTING LINES:
${ctx.awayTeam} Moneyline: ${formatMoneyline(ctx.awayMoneyline)}
Draw: ${formatMoneyline(ctx.drawMoneyline)}
${ctx.homeTeam} Moneyline: ${formatMoneyline(ctx.homeMoneyline)}
Over/Under Goals: ${ctx.total}`
    : '';

  const structureWithOdds = `${variation.structure}
5. If citing odds, reference only the lines in the DATA BLOCK`;

  const structureWithoutOdds = variation.structure;

  const gameDetailLines = [
    `- Matchup: ${ctx.awayTeam} (${ctx.awayTeamAbbr}) vs ${ctx.homeTeam} (${ctx.homeTeamAbbr})`,
    `- Date: ${gameDate}`,
    `- Stage: ${ctx.stage}`,
    dataLine('Group', ctx.groupName),
    dataLine('Venue', venueLine),
    dataLine('Where to Watch', ctx.watchString),
    ctx.gameNote ? `- Match Note: ${ctx.gameNote}` : null,
    dataLine(`${ctx.awayTeam} tournament record (W-D-L)`, ctx.awayRecord),
    dataLine(`${ctx.homeTeam} tournament record (W-D-L)`, ctx.homeRecord),
    dataLine(`${ctx.awayTeam} recent form (last ~5, all competitions)`, ctx.formAway),
    dataLine(`${ctx.homeTeam} recent form (last ~5, all competitions)`, ctx.formHome),
    formatTeamStatsBlock(ctx.awayTeam, ctx.awayStats),
    formatTeamStatsBlock(ctx.homeTeam, ctx.homeStats),
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const systemPrompt = `You are a professional soccer analyst writing FIFA World Cup match prediction articles for a sports prediction blog. Your writing style is authoritative, data-driven, and engaging — similar to ESPN or The Athletic. Write in the third person and avoid using "I".

CRITICAL RULE — NO STAT HALLUCINATION:
You will be given a DATA BLOCK containing the only stats you are allowed to cite. You MUST NOT invent, estimate, or infer any statistic not explicitly listed in that block. Do not invent player names, injuries, head-to-head history, or standings points.

CRITICAL RULE — NEVER WRITE "N/A":
If a stat is missing from the DATA BLOCK, do NOT write "N/A" or "(not available)" in the article. Use qualitative language instead ("limited goal output in the tournament", "strong recent form") without fabricating numbers. Only quote numbers that appear explicitly in the DATA BLOCK.

ANTI-REPETITION:
- Do NOT use generic openings like "In what promises to be an exciting match", "In what promises to be...", or "All eyes will be on..."
- Do NOT repeat the same sentence structure across paragraphs
- Vary transition phrases; avoid starting consecutive paragraphs the same way
- Do NOT copy the editorial pick verbatim or use a standalone "Our Pick:" callout box
- This article uses the "${variation.angle}" angle with a ${variation.style} voice — commit to it; do not write a generic preview
- Opening paragraph must be distinct from other articles on the site — no boilerplate tournament intros`;

  const userPrompt = `Write a 400–600 word World Cup match prediction article for the following fixture. Output ONLY the article text — no JSON, no markdown headers using # syntax except the title line.

FORMAT:
- Line 1: Article title in exactly this format: "{AwayTeam} vs {HomeTeam} Prediction {Month Day, Year}"
- Line 2: Empty line
- Line 3 onward: Article body

WRITING STYLE: ${variation.style}

OPENING HOOK (use this direction for paragraph 1):
${variation.hook}

STRUCTURE (follow this order):
${ctx.hasOdds ? structureWithOdds : structureWithoutOdds}

━━━ DATA BLOCK — cite ONLY these numbers, cite them accurately ━━━

GAME DETAILS:
${gameDetailLines}${bettingLinesSection}

EDITORIAL PICK (for your analysis only — do NOT copy this line or any standalone pick callout into the article): ${ctx.pickLabel}

━━━ END DATA BLOCK ━━━

Write the article now. Every number you quote must appear exactly as shown in the DATA BLOCK above.`;

  return `${systemPrompt}\n\n${userPrompt}`;
}

export function buildWorldCupMetaDescription(ctx: WorldCupGameContext, pick: string): string {
  const date = ctx.scheduledAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const desc = `${ctx.awayTeam} vs ${ctx.homeTeam} World Cup prediction for ${date}. Our pick: ${pick}. Expert analysis with form, group context, and odds.`;
  return desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
}
