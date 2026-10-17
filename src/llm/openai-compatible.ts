import type {
  ChatMessage,
  ChatResult,
  LLMProvider,
  ToolCall,
  ToolDefinition,
} from './provider.js';

export interface OpenAICompatibleOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
}

interface RawToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: RawToolCall[] };
  }>;
}

function serializeMessage(message: ChatMessage): Record<string, unknown> {
  const out: Record<string, unknown> = { role: message.role, content: message.content };
  if (message.name) out.name = message.name;
  if (message.toolCallId) out.tool_call_id = message.toolCallId;
  if (message.toolCalls && message.toolCalls.length > 0) {
    out.tool_calls = message.toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    }));
  }
  return out;
}

function serializeTools(tools: ToolDefinition[]): Record<string, unknown>[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function parseToolCalls(raw: RawToolCall[] | undefined): ToolCall[] {
  if (!raw) return [];
  const calls: ToolCall[] = [];
  for (const tc of raw) {
    const name = tc.function?.name;
    if (!name) continue;
    calls.push({
      id: tc.id ?? name,
      name,
      arguments: tc.function?.arguments ?? '{}',
    });
  }
  return calls;
}

export class OpenAICompatibleProvider implements LLMProvider {
  constructor(private readonly options: OpenAICompatibleOptions) {}

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResult> {
    const url = `${this.options.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.options.apiKey) {
      headers.authorization = `Bearer ${this.options.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model: this.options.model,
      messages: messages.map(serializeMessage),
      stream: false,
    };
    if (this.options.temperature !== undefined) {
      body.temperature = this.options.temperature;
    }
    if (tools && tools.length > 0) {
      body.tools = serializeTools(tools);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `LLM request failed: ${response.status} ${response.statusText} ${detail}`.trim(),
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const message = data.choices?.[0]?.message;
    const toolCalls = parseToolCalls(message?.tool_calls);
    const content = typeof message?.content === 'string' ? message.content : null;

    if (content === null && toolCalls.length === 0) {
      throw new Error('LLM response did not contain content or tool calls');
    }

    return { content, toolCalls };
  }
}
