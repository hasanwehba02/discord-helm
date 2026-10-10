import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const messages = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    threadId: text('thread_id').notNull(),
    discordId: text('discord_id').notNull().unique(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    authorId: text('author_id'),
    authorName: text('author_name'),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_messages_thread').on(table.threadId, table.createdAt)],
);

export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
