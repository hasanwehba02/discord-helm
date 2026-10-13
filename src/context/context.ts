import { getThreadMessages } from '../db/messages.js';

export type Role = 'system' | 'user' | 'assistant';

export interface ContextMessage {
  role: Role;
  authorId?: string;
  authorName?: string;
  content: string;
}

export interface Context {
  system?: string;
  messages: ContextMessage[];
}

export interface BuildContextOptions {
  limit?: number;
  system?: string;
}

export function buildContext(threadId: string, options: BuildContextOptions = {}): Context {
  const rows = getThreadMessages(threadId, options.limit);

  const messages: ContextMessage[] = [];
  for (const row of rows) {
    if (!row.content) continue;
    messages.push({
      role: row.role,
      authorId: row.authorId ?? undefined,
      authorName: row.authorName ?? undefined,
      content: row.content,
    });
  }

  return options.system ? { system: options.system, messages } : { messages };
}
