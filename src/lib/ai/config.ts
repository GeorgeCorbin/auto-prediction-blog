export type AiProvider = 'openai' | 'ollama' | 'anthropic';

export interface AiPreset {
  provider: AiProvider;
  model: string;
  baseUrl?: string;
  temperature: number;
}

/**
 * Named presets — change `activePreset` below to switch models.
 * API keys for each provider live in .env (OPENAI_API_KEY / ANTHROPIC_API_KEY).
 *
 * local      → Ollama running locally (no API key needed)
 * production → OpenAI GPT-4o
 * claude     → Anthropic Claude Sonnet
 */
export const aiPresets = {
  local: {
    provider: 'ollama',
    model: 'llama3:8b',
    baseUrl: 'http://localhost:11434/v1',
    temperature: 0.7,
  },
  production: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
  },
  claude: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
  },
} as const satisfies Record<string, AiPreset>;

export type AiPresetName = keyof typeof aiPresets;

export interface ResolvedAiConfig extends AiPreset {
  apiKey: string | undefined;
  presetName: AiPresetName;
}

function resolveApiKey(provider: AiProvider): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'ollama':
      return 'ollama'; // Ollama doesn't require a real key
  }
}

export function getResolvedAiConfig(presetName: AiPresetName): ResolvedAiConfig {
  const preset = aiPresets[presetName];
  return {
    presetName,
    ...preset,
    apiKey: resolveApiKey(preset.provider),
  };
}

export function describeAiConfig(config: ResolvedAiConfig): string {
  const location = config.baseUrl ?? config.provider;
  return `${config.provider}/${config.model} (preset: ${config.presetName}, via ${location})`;
}
