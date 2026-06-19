import OpenAI from 'openai';
import type { ResolvedAiConfig } from '@/lib/ai/config';
import type { AiProviderClient } from '@/lib/ai/provider';

export class OpenAiCompatibleProvider implements AiProviderClient {
  private readonly client: OpenAI;
  private readonly config: ResolvedAiConfig;

  constructor(config: ResolvedAiConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey ?? 'ollama',
      baseURL: config.baseUrl,
    });
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }
}
