import type { Context, ContextMessage } from './context.js';
import type { ChatMessage } from '../llm/provider.js';

function sanitizeName(authorId: string): string {
  const cleaned = authorId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `user_${cleaned}`;
}

function toUserMessage(message: ContextMessage): ChatMessage {
  const content = message.authorName
    ? `${message.authorName}: ${message.content}`
    : message.content;

  const chat: ChatMessage = { role: 'user', content };
  if (message.authorId) {
    chat.name = sanitizeName(message.authorId);
  }
  return chat;
}

export function toChatMessages(context: Context): ChatMessage[] {
  const result: ChatMessage[] = [];

  if (context.system) {
    result.push({ role: 'system', content: context.system });
  }

  for (const message of context.messages) {
    if (message.role === 'user') {
      result.push(toUserMessage(message));
    } else if (message.role === 'assistant') {
      result.push({ role: 'assistant', content: message.content });
    } else {
      result.push({ role: 'system', content: message.content });
    }
  }

  return result;
}
