import type { ResolvedAiConfig } from '@/lib/ai/config';
import type { AiProviderClient } from '@/lib/ai/provider';

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  error?: { message?: string };
}

export class AnthropicProvider implements AiProviderClient {
  private readonly config: ResolvedAiConfig;

  constructor(config: ResolvedAiConfig) {
    this.config = config;
  }

  async complete(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY (or AI_API_KEY) is required when using the anthropic provider',
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        temperature: this.config.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = (await response.json()) as AnthropicResponse;

    if (!response.ok) {
      throw new Error(
        data.error?.message ?? `Anthropic request failed with status ${response.status}`,
      );
    }

    return (data.content ?? [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('')
      .trim();
  }
}
