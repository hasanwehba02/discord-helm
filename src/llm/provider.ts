export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[]): Promise<string>;
}
