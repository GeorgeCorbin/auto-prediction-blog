export interface AiProviderClient {
  complete(prompt: string): Promise<string>;
}
