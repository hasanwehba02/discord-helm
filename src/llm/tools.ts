import type { SendableChannels } from 'discord.js';
import type { ToolCall, ToolDefinition } from './provider.js';

export interface ToolContext {
  channel: SendableChannels;
  onSent: (content: string, messageId: string, createdAt: number) => void;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'send_message',
    description:
      'Send a message to the current Discord thread. Call this to reply to the user. ' +
      'Keep each message within 2000 characters; call multiple times to send longer content.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The message text to send.' },
      },
      required: ['content'],
    },
  },
];

const MAX_DISCORD_CONTENT = 2000;

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function dispatchTool(call: ToolCall, ctx: ToolContext): Promise<string> {
  if (call.name !== 'send_message') {
    return `Unknown tool: ${call.name}`;
  }

  const args = parseArgs(call.arguments);
  const content = typeof args.content === 'string' ? args.content : '';
  if (!content) {
    return 'Error: content was empty.';
  }

  const chunks = chunkContent(content, MAX_DISCORD_CONTENT);
  for (const chunk of chunks) {
    const sent = await ctx.channel.send(chunk);
    ctx.onSent(chunk, sent.id, sent.createdTimestamp);
  }
  return 'Message sent.';
}

function chunkContent(content: string, limit: number): string[] {
  if (content.length <= limit) return [content];
  const chunks: string[] = [];
  let remaining = content;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf('\n', limit);
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, '');
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}
