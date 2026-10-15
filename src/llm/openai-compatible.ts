import type { ChatMessage, LLMProvider } from './provider.js';

export interface OpenAICompatibleOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAICompatibleProvider implements LLMProvider {
  constructor(private readonly options: OpenAICompatibleOptions) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const url = `${this.options.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.options.apiKey) {
      headers.authorization = `Bearer ${this.options.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model: this.options.model,
      messages,
      stream: false,
    };
    if (this.options.temperature !== undefined) {
      body.temperature = this.options.temperature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`LLM request failed: ${response.status} ${response.statusText} ${detail}`.trim());
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('LLM response did not contain any message content');
    }

    return content;
  }
}
