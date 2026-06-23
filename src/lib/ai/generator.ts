import { completePrompt } from '@/lib/ai';
import { stripRedundantPickCallouts } from '@/lib/articles/content';
import { SportConfig } from '@/lib/sports/config';
import type { AnySportModule, PromptContextBase } from '@/lib/sports/types';

export interface ArticleResult {
  title: string;
  content: string;
  pick: string;
  metaDescription: string;
}

export async function generateArticle<T extends PromptContextBase>(
  sport: SportConfig,
  mod: AnySportModule,
  context: T,
): Promise<ArticleResult> {
  const prompt = mod.buildPrompt(context);
  const rawText = await completePrompt(prompt);
  const lines = rawText.split('\n');

  const title = lines[0]?.trim() ?? `${context.awayTeam} vs ${context.homeTeam} Prediction`;
  const rawContent = lines.slice(2).join('\n').trim();
  const content = stripRedundantPickCallouts(rawContent, context.pickLabel);

  const pick = context.pickLabel;
  const metaDescription = mod.buildMetaDescription(context, pick);

  return { title, content, pick, metaDescription };
}
