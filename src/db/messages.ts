import { getDb } from './index.js';
import { messages, type NewMessageRow } from './schema.js';

export type MessageRole = 'user' | 'assistant';

export interface StoredMessage {
  threadId: string;
  discordId: string;
  role: MessageRole;
  authorId?: string;
  authorName?: string;
  content: string;
  createdAt: number;
}

export function insertMessage(message: StoredMessage): void {
  const row: NewMessageRow = {
    threadId: message.threadId,
    discordId: message.discordId,
    role: message.role,
    authorId: message.authorId ?? null,
    authorName: message.authorName ?? null,
    content: message.content,
    createdAt: message.createdAt,
  };

  getDb().insert(messages).values(row).onConflictDoNothing().run();
}
