import { desc, eq } from 'drizzle-orm';
import { getDb } from './index.js';
import { messages, type MessageRow, type NewMessageRow } from './schema.js';

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

export function getThreadMessages(threadId: string, limit = 40): MessageRow[] {
  const rows = getDb()
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit)
    .all();

  return rows.reverse();
}
