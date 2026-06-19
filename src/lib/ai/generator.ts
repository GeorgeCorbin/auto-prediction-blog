import { completePrompt } from '@/lib/ai';
import { SportConfig } from '@/lib/sports/config';
import { buildMlbPrompt, MlbGameContext } from './prompts/mlb';

export interface ArticleResult {
  title: string;
  content: string;
  pick: string;
  metaDescription: string;
}

function buildMetaDescription(ctx: MlbGameContext, pick: string): string {
  const date = ctx.scheduledAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const desc = `${ctx.awayTeam} vs ${ctx.homeTeam} prediction for ${date}. Our pick: ${pick}. Expert analysis with starting pitcher stats and team trends.`;
  return desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
}

export async function generateArticle(
  sport: SportConfig,
  context: MlbGameContext
): Promise<ArticleResult> {
  let prompt: string;

  switch (sport.promptTemplate) {
    case 'mlb':
      prompt = buildMlbPrompt(context);
      break;
    default:
      throw new Error(`No prompt template found for sport: ${sport.promptTemplate}`);
  }

  const rawText = await completePrompt(prompt);
  const lines = rawText.split('\n');

  const title = lines[0]?.trim() ?? `${context.awayTeam} vs ${context.homeTeam} Prediction`;
  const content = lines.slice(2).join('\n').trim();

  const pick = context.pickLabel;
  const metaDescription = buildMetaDescription(context, pick);

  return { title, content, pick, metaDescription };
}
