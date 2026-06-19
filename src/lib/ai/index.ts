import { describeAiConfig, getResolvedAiConfig, type ResolvedAiConfig } from '@/lib/ai/config';
import type { AiProviderClient } from '@/lib/ai/provider';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { OpenAiCompatibleProvider } from '@/lib/ai/providers/openai-compatible';
import { aiModel } from '@/lib/feature-flags';

function assertConfig(config: ResolvedAiConfig): void {
  if (config.provider === 'openai' && !config.apiKey) {
    throw new Error('OPENAI_API_KEY is missing from .env — required for the openai provider');
  }
  if (config.provider === 'anthropic' && !config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing from .env — required for the anthropic provider');
  }
}

function createProvider(config: ResolvedAiConfig): AiProviderClient {
  assertConfig(config);

  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
    case 'ollama':
      return new OpenAiCompatibleProvider(config);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider satisfies never}`);
  }
}

let cachedProvider: AiProviderClient | null = null;
let cachedDescription: string | null = null;

export function getAiProvider(): AiProviderClient {
  const config = getResolvedAiConfig(aiModel);
  const description = describeAiConfig(config);

  if (!cachedProvider || cachedDescription !== description) {
    cachedProvider = createProvider(config);
    cachedDescription = description;
  }

  return cachedProvider;
}

export async function completePrompt(prompt: string): Promise<string> {
  return getAiProvider().complete(prompt);
}

export function getActiveAiConfig(): ResolvedAiConfig {
  return getResolvedAiConfig(aiModel);
}

export { describeAiConfig };
