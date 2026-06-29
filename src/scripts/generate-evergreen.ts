import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { completePrompt } from '@/lib/ai';
import { AUTHORS } from '@/lib/authors';
import {
  buildMlbPowerRankingsContext,
  buildPowerRankingsPrompt,
  buildPowerRankingsMetaDescription,
  buildPowerRankingsSlug,
  type MlbPowerRankingsContext,
} from '@/lib/evergreen/mlb-power-rankings';
import {
  buildMlbWinTotalsContext,
  buildWinTotalsPrompt,
  buildWinTotalsMetaDescription,
  buildWinTotalsSlug,
  type MlbWinTotalsContext,
} from '@/lib/evergreen/mlb-win-totals';
import {
  buildMlbMatchupCheatSheetContext,
  buildMatchupCheatSheetPrompt,
  buildMatchupCheatSheetMetaDescription,
  buildMatchupCheatSheetSlug,
} from '@/lib/evergreen/mlb-matchup-cheat-sheet';
import {
  buildMlbBettingTrendsContext,
  buildBettingTrendsPrompt,
  buildBettingTrendsMetaDescription,
  buildBettingTrendsSlug,
} from '@/lib/evergreen/mlb-betting-trends';
import {
  buildMlbPlayoffPictureContext,
  buildPlayoffPicturePrompt,
  buildPlayoffPictureMetaDescription,
  buildPlayoffPictureSlug,
} from '@/lib/evergreen/mlb-playoff-picture';
import {
  buildMlbAwardRacesContext,
  buildAwardRacesPrompt,
  buildAwardRacesMetaDescription,
  buildAwardRacesSlug,
} from '@/lib/evergreen/mlb-award-races';
import {
  buildMlbTeamProfileContext,
  buildTeamProfilePrompt,
  buildTeamProfileMetaDescription,
  buildTeamProfileSlug,
  getAllTeamIds,
} from '@/lib/evergreen/mlb-team-profiles';

type EvergreenVariant =
  | 'power-rankings'
  | 'win-totals'
  | 'matchup-cheat-sheet'
  | 'betting-trends'
  | 'playoff-picture'
  | 'award-races'
  | 'team-profile';

const VARIANT_ARG = (process.argv[2] ?? 'power-rankings') as EvergreenVariant;
const FORCE_FLAG = process.argv.includes('--force');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Team data used by fixRecords for post-processing.
 */
interface FixableTeam {
  teamName: string;
  wins: number;
  losses: number;
  winPct?: string;
  last10?: string;
  streak?: string;
  gamesBack?: string;
}

/**
 * Post-process AI output to correct hallucinated stats.
 *
 * For each team, fixes:
 *   1. W-L records in parens:          (XX-YY)
 *   2. W-L records without parens:     "at 39-46" / "are 39-46"
 *   3. Winning percentages:            .459 / .590
 *   4. Last 10 records:                7-3 in their last 10
 *
 * Each replacement is scoped to within ~80 chars of the team name
 * to avoid false positives.
 */
function fixRecords(text: string, rankings: FixableTeam[]): string {
  let result = text;
  for (const r of rankings) {
    const esc = r.teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Parenthesized W-L:  "Yankees (50-30)"
    const parenWL = new RegExp(`(${esc}[^(]{0,80}\\()\\d+-\\d+(\\))`, 'g');
    result = result.replace(parenWL, `$1${r.wins}-${r.losses}$2`);

    // 2. Non-paren W-L:  "sit at 50-30" / "are 50-30" / "sitting at 50-30"
    const nonParenWL = new RegExp(
      `(${esc}.{0,80}(?:sit(?:ting)?\\s+at|are|stand(?:ing)?\\s+at|hold(?:ing)?\\s+a)\\s+)\\d+-\\d+`,
      'gi',
    );
    result = result.replace(nonParenWL, `$1${r.wins}-${r.losses}`);

    // 3. Winning percentage:  ".459 winning percentage" or "a .590 win pct"
    if (r.winPct) {
      const wpct = new RegExp(
        `(${esc}.{0,80}(?:a\\s+)?)(\\.\\d{3})(\\s+winn?(?:ing)?\\s+p(?:ercentage|ct))`,
        'gi',
      );
      result = result.replace(wpct, `$1${r.winPct}$3`);
    }

    // 4. Last-10 record:  "7-3 in their last 10" / "last 10 of 7-3"
    if (r.last10) {
      const last10Pat = new RegExp(
        `(${esc}.{0,100})(\\d+-\\d+)(\\s+in\\s+(?:their\\s+)?last\\s+10)`,
        'gi',
      );
      result = result.replace(last10Pat, `$1${r.last10}$3`);
    }
  }
  return result;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickAuthor(seed: string): string {
  return AUTHORS[hashString(seed) % AUTHORS.length];
}

/**
 * Get or create a stub Game row used as the FK anchor for an evergreen article.
 * Uses espnEventId = "evergreen:<slug>" as a stable unique key.
 */
async function getOrCreateEvergreenGame(slug: string): Promise<string> {
  const espnEventId = `evergreen:${slug}`;
  const existing = await prisma.game.findUnique({
    where: { espnEventId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const stub = await prisma.game.create({
    data: {
      espnEventId,
      homeTeam: 'MLB',
      awayTeam: 'League',
      homeTeamAbbr: 'MLB',
      awayTeamAbbr: 'LG',
      scheduledAt: new Date(),
      sport: 'mlb',
      status: 'PUBLISHED',
    },
  });
  return stub.id;
}

// ---------------------------------------------------------------------------
// Power Rankings
// ---------------------------------------------------------------------------

export async function generatePowerRankings(season: number, force: boolean): Promise<void> {
  const now = new Date();
  const weekNumber = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) /
      7,
  );
  const slug = buildPowerRankingsSlug(season, weekNumber);

  const existing = await prisma.article.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true },
  });

  if (existing && !force) {
    console.log(`[evergreen] Power Rankings ${slug} already exists — skipping (use --force to regenerate)`);
    return;
  }

  console.log(`[evergreen] Fetching data for power rankings week ${weekNumber}...`);
  const ctx: MlbPowerRankingsContext = await buildMlbPowerRankingsContext(season);

  console.log(`[evergreen] Generating article via AI...`);
  const prompt = buildPowerRankingsPrompt(ctx);
  const rawText = await completePrompt(prompt);

  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `MLB Power Rankings Week ${weekNumber} (${season})`).replace(/\*\*/g, '');
  const rawContent = lines.slice(2).join('\n').trim();
  const content = fixRecords(rawContent, ctx.rankings);
  const metaDescription = buildPowerRankingsMetaDescription(ctx);
  const author = pickAuthor(slug);
  const gameId = await getOrCreateEvergreenGame(slug);

  const evergreenData: Prisma.InputJsonValue = {
    type: 'power-rankings',
    season,
    weekNumber,
    rankings: ctx.rankings.map((r) => ({
      rank: r.rank,
      teamId: r.teamId,
      teamName: r.teamName,
      wins: r.wins,
      losses: r.losses,
      winPct: r.winPct,
      last10: r.last10,
      streak: r.streak,
      gamesBack: r.gamesBack,
      ops: r.stats?.ops ?? null,
      era: r.stats?.era ?? null,
      whip: r.stats?.whip ?? null,
    })),
  };

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId,
      slug,
      title,
      metaDescription,
      content,
      pick: `Week ${weekNumber} Rankings`,
      sport: 'mlb',
      articleType: 'power-rankings',
      evergreenData,
      publishedAt: new Date(),
      author,
    },
    update: {
      title,
      metaDescription,
      content,
      articleType: 'power-rankings',
      evergreenData,
      publishedAt: new Date(),
      author,
    },
  });

  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Win-Total Tracker
// ---------------------------------------------------------------------------

export async function generateWinTotals(season: number, force: boolean): Promise<void> {
  const now = new Date();
  const slug = buildWinTotalsSlug(season, now);

  const existing = await prisma.article.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && !force) {
    console.log(`[evergreen] Win Totals ${slug} already exists — skipping (use --force to regenerate)`);
    return;
  }

  console.log(`[evergreen] Fetching standings data for win-total tracker...`);
  const ctx: MlbWinTotalsContext = await buildMlbWinTotalsContext(season);

  console.log(`[evergreen] Generating article via AI...`);
  const prompt = buildWinTotalsPrompt(ctx);
  const rawText = await completePrompt(prompt);

  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `MLB Win Total Tracker — ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`).replace(/\*\*/g, '');
  const rawContent = lines.slice(2).join('\n').trim();
  const content = fixRecords(rawContent, ctx.entries.map((e) => ({ teamName: e.teamName, wins: e.wins, losses: e.losses, last10: e.last10, streak: e.streak, gamesBack: e.gamesBack })));
  const metaDescription = buildWinTotalsMetaDescription(ctx);
  const author = pickAuthor(slug);
  const gameId = await getOrCreateEvergreenGame(slug);

  const evergreenData: Prisma.InputJsonValue = {
    type: 'win-totals',
    season,
    generatedAt: now.toISOString(),
    entries: ctx.entries.map((e) => ({
      teamId: e.teamId,
      teamName: e.teamName,
      wins: e.wins,
      losses: e.losses,
      projectedWins: e.projectedWins,
      preseasonTotal: e.preseasonTotal,
      pace: e.pace,
      paceAmount: e.paceAmount,
    })),
  };

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId,
      slug,
      title,
      metaDescription,
      content,
      pick: 'Win-Total Analysis',
      sport: 'mlb',
      articleType: 'win-totals',
      evergreenData,
      publishedAt: new Date(),
      author,
    },
    update: {
      title,
      metaDescription,
      content,
      articleType: 'win-totals',
      evergreenData,
      publishedAt: new Date(),
      author,
    },
  });

  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Matchup Cheat Sheet
// ---------------------------------------------------------------------------

export async function generateMatchupCheatSheet(season: number, force: boolean): Promise<void> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  const slug = buildMatchupCheatSheetSlug(season, weekNumber);

  const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existing && !force) {
    console.log(`[evergreen] Cheat Sheet ${slug} already exists — skipping`);
    return;
  }

  console.log(`[evergreen] Fetching matchup data week ${weekNumber}...`);
  const ctx = await buildMlbMatchupCheatSheetContext(season);

  console.log(`[evergreen] Generating article via AI...`);
  const rawText = await completePrompt(buildMatchupCheatSheetPrompt(ctx));
  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `MLB Matchup Cheat Sheet Week ${weekNumber}`).replace(/\*\*/g, '');
  const rawContent = lines.slice(2).join('\n').trim();
  const matchupTeams: FixableTeam[] = ctx.matchups.flatMap((m) => [
    { teamName: m.homeTeam.name, wins: m.homeTeam.wins, losses: m.homeTeam.losses, winPct: m.homeTeam.winPct, last10: m.homeTeam.last10, streak: m.homeTeam.streak },
    { teamName: m.awayTeam.name, wins: m.awayTeam.wins, losses: m.awayTeam.losses, winPct: m.awayTeam.winPct, last10: m.awayTeam.last10, streak: m.awayTeam.streak },
  ]);
  const content = fixRecords(rawContent, matchupTeams);
  const gameId = await getOrCreateEvergreenGame(slug);

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId, slug, title,
      metaDescription: buildMatchupCheatSheetMetaDescription(ctx),
      content, pick: 'Matchup Analysis', sport: 'mlb',
      articleType: 'matchup-cheat-sheet',
      evergreenData: { type: 'matchup-cheat-sheet', season, weekNumber } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
    update: {
      title, metaDescription: buildMatchupCheatSheetMetaDescription(ctx),
      content, articleType: 'matchup-cheat-sheet',
      evergreenData: { type: 'matchup-cheat-sheet', season, weekNumber } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
  });
  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Betting Trends
// ---------------------------------------------------------------------------

export async function generateBettingTrends(season: number, force: boolean): Promise<void> {
  const now = new Date();
  const slug = buildBettingTrendsSlug(season, now);

  const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existing && !force) {
    console.log(`[evergreen] Betting Trends ${slug} already exists — skipping`);
    return;
  }

  console.log(`[evergreen] Fetching betting trends data...`);
  const ctx = await buildMlbBettingTrendsContext(season);

  console.log(`[evergreen] Generating article via AI...`);
  const rawText = await completePrompt(buildBettingTrendsPrompt(ctx));
  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `MLB Betting Trends ${ctx.periodLabel}`).replace(/\*\*/g, '');
  const rawContent = lines.slice(2).join('\n').trim();
  const content = fixRecords(rawContent, ctx.allTeams);
  const gameId = await getOrCreateEvergreenGame(slug);

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId, slug, title,
      metaDescription: buildBettingTrendsMetaDescription(ctx),
      content, pick: 'Betting Trends', sport: 'mlb',
      articleType: 'betting-trends',
      evergreenData: { type: 'betting-trends', season, periodLabel: ctx.periodLabel, hotTeams: ctx.hotTeams.slice(0, 3).map((t) => ({ teamId: t.teamId, teamName: t.teamName })) } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
    update: {
      title, metaDescription: buildBettingTrendsMetaDescription(ctx),
      content, articleType: 'betting-trends',
      evergreenData: { type: 'betting-trends', season, periodLabel: ctx.periodLabel, hotTeams: ctx.hotTeams.slice(0, 3).map((t) => ({ teamId: t.teamId, teamName: t.teamName })) } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
  });
  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Playoff Picture
// ---------------------------------------------------------------------------

export async function generatePlayoffPicture(season: number, force: boolean): Promise<void> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  const slug = buildPlayoffPictureSlug(season, weekNumber);

  const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existing && !force) {
    console.log(`[evergreen] Playoff Picture ${slug} already exists — skipping`);
    return;
  }

  console.log(`[evergreen] Fetching playoff standings data week ${weekNumber}...`);
  const ctx = await buildMlbPlayoffPictureContext(season);

  console.log(`[evergreen] Generating article via AI...`);
  const rawText = await completePrompt(buildPlayoffPicturePrompt(ctx));
  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `MLB Playoff Picture Week ${weekNumber}`).replace(/\*\*/g, '');
  const rawContent = lines.slice(2).join('\n').trim();
  const allPlayoffTeams = [
    ...ctx.alDivisionLeaders, ...ctx.nlDivisionLeaders,
    ...ctx.alWildCard, ...ctx.nlWildCard, ...ctx.bubbleTeams,
  ];
  const content = fixRecords(rawContent, allPlayoffTeams);
  const gameId = await getOrCreateEvergreenGame(slug);

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId, slug, title,
      metaDescription: buildPlayoffPictureMetaDescription(ctx),
      content, pick: 'Playoff Picture', sport: 'mlb',
      articleType: 'playoff-picture',
      evergreenData: { type: 'playoff-picture', season, weekNumber, alDivisionLeaders: ctx.alDivisionLeaders.slice(0, 3).map((t) => ({ teamId: t.teamId, teamName: t.teamName })), nlDivisionLeaders: ctx.nlDivisionLeaders.slice(0, 3).map((t) => ({ teamId: t.teamId, teamName: t.teamName })) } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
    update: {
      title, metaDescription: buildPlayoffPictureMetaDescription(ctx),
      content, articleType: 'playoff-picture',
      evergreenData: { type: 'playoff-picture', season, weekNumber, alDivisionLeaders: ctx.alDivisionLeaders.slice(0, 3).map((t) => ({ teamId: t.teamId, teamName: t.teamName })), nlDivisionLeaders: ctx.nlDivisionLeaders.slice(0, 3).map((t) => ({ teamId: t.teamId, teamName: t.teamName })) } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
  });
  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Award Races
// ---------------------------------------------------------------------------

export async function generateAwardRaces(season: number, force: boolean): Promise<void> {
  const now = new Date();
  const slug = buildAwardRacesSlug(season, now);

  const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existing && !force) {
    console.log(`[evergreen] Award Races ${slug} already exists — skipping`);
    return;
  }

  console.log(`[evergreen] Fetching award race data...`);
  const ctx = await buildMlbAwardRacesContext(season);

  console.log(`[evergreen] Generating article via AI...`);
  const rawText = await completePrompt(buildAwardRacesPrompt(ctx));
  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `MLB Award Races ${ctx.periodLabel}`).replace(/\*\*/g, '');
  const content = lines.slice(2).join('\n').trim();
  const gameId = await getOrCreateEvergreenGame(slug);

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId, slug, title,
      metaDescription: buildAwardRacesMetaDescription(ctx),
      content, pick: 'Award Races', sport: 'mlb',
      articleType: 'award-races',
      evergreenData: { type: 'award-races', season, periodLabel: ctx.periodLabel } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
    update: {
      title, metaDescription: buildAwardRacesMetaDescription(ctx),
      content, articleType: 'award-races',
      evergreenData: { type: 'award-races', season, periodLabel: ctx.periodLabel } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
  });
  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Team Profile
// ---------------------------------------------------------------------------

export async function generateTeamProfile(teamId: number, season: number, force: boolean): Promise<void> {
  const ctx = await (async () => {
    console.log(`[evergreen] Fetching team profile data for teamId=${teamId}...`);
    return buildMlbTeamProfileContext(teamId, season);
  })();

  const slug = buildTeamProfileSlug(ctx.abbr || String(teamId), season);

  const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existing && !force) {
    console.log(`[evergreen] Team Profile ${slug} already exists — skipping`);
    return;
  }

  console.log(`[evergreen] Generating article via AI...`);
  const rawText = await completePrompt(buildTeamProfilePrompt(ctx));
  const lines = rawText.split('\n');
  const title = (lines[0]?.trim() ?? `${ctx.teamName} ${season} Season Profile`).replace(/\*\*/g, '');
  const rawContent = lines.slice(2).join('\n').trim();
  const content = ctx.standings
    ? fixRecords(rawContent, [{ teamName: ctx.teamName, wins: ctx.standings.wins, losses: ctx.standings.losses, winPct: ctx.standings.winPct, last10: ctx.standings.last10, streak: ctx.standings.streak, gamesBack: ctx.standings.gamesBack }])
    : rawContent;
  const gameId = await getOrCreateEvergreenGame(slug);

  await prisma.article.upsert({
    where: { slug },
    create: {
      gameId, slug, title,
      metaDescription: buildTeamProfileMetaDescription(ctx),
      content, pick: `${ctx.teamName} Profile`, sport: 'mlb',
      articleType: 'team-profile',
      evergreenData: { type: 'team-profile', season, teamId, teamName: ctx.teamName } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
    update: {
      title, metaDescription: buildTeamProfileMetaDescription(ctx),
      content, articleType: 'team-profile',
      evergreenData: { type: 'team-profile', season, teamId, teamName: ctx.teamName } as Prisma.InputJsonValue,
      publishedAt: new Date(), author: pickAuthor(slug),
    },
  });
  console.log(`[evergreen] Published: /${slug}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const season = new Date().getFullYear();
  console.log(`[evergreen] Running variant="${VARIANT_ARG}" season=${season} force=${FORCE_FLAG}`);

  // team-profile accepts optional team ID as 3rd arg
  const teamIdArg = process.argv[3] ? parseInt(process.argv[3], 10) : null;

  switch (VARIANT_ARG) {
    case 'power-rankings':
      await generatePowerRankings(season, FORCE_FLAG);
      break;
    case 'win-totals':
      await generateWinTotals(season, FORCE_FLAG);
      break;
    case 'matchup-cheat-sheet':
      await generateMatchupCheatSheet(season, FORCE_FLAG);
      break;
    case 'betting-trends':
      await generateBettingTrends(season, FORCE_FLAG);
      break;
    case 'playoff-picture':
      await generatePlayoffPicture(season, FORCE_FLAG);
      break;
    case 'award-races':
      await generateAwardRaces(season, FORCE_FLAG);
      break;
    case 'team-profile': {
      if (teamIdArg) {
        await generateTeamProfile(teamIdArg, season, FORCE_FLAG);
      } else {
        // Generate for 2 random teams per run
        const ids = getAllTeamIds();
        const shuffled = ids.sort(() => Math.random() - 0.5).slice(0, 2);
        for (const id of shuffled) {
          await generateTeamProfile(id, season, FORCE_FLAG);
        }
      }
      break;
    }
    default: {
      const _exhaustive: never = VARIANT_ARG;
      console.error(`[evergreen] Unknown variant: ${_exhaustive}`);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
