import type { SendableChannels } from 'discord.js';
import type { ToolCall, ToolDefinition } from './provider.js';

export interface ToolContext {
  channel: SendableChannels;
  onSent: (content: string, messageId: string, createdAt: number) => void;
}

const MAX_DISCORD_CONTENT = 2000;

export const acknowledgeTool: ToolDefinition = {
  name: 'acknowledge',
  description:
    'Send a short heads-up to the user before you prepare the full answer. ' +
    'Use this when the reply will be long or take time. ' +
    'After this, you will be asked to produce the full answer.',
  parameters: {
    type: 'object',
    properties: {
      note: { type: 'string', description: 'The short heads-up message to send now.' },
    },
    required: ['note'],
  },
};

export const proceedTool: ToolDefinition = {
  name: 'proceed',
  description:
    'Skip the heads-up and go straight to the full answer. ' +
    'Use this for short or quick replies that do not need a heads-up.',
  parameters: { type: 'object', properties: {} },
};

export const sendMessageTool: ToolDefinition = {
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
};

export const ackPhaseTools: ToolDefinition[] = [acknowledgeTool, proceedTool];
export const replyPhaseTools: ToolDefinition[] = [sendMessageTool];

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function sendChunked(text: string, ctx: ToolContext): Promise<void> {
  const chunks = chunkContent(text, MAX_DISCORD_CONTENT);
  for (const chunk of chunks) {
    const sent = await ctx.channel.send(chunk);
    ctx.onSent(chunk, sent.id, sent.createdTimestamp);
    void ctx.channel.sendTyping().catch(() => undefined);
  }
}

export async function dispatchTool(call: ToolCall, ctx: ToolContext): Promise<string> {
  const args = parseArgs(call.arguments);

  switch (call.name) {
    case 'acknowledge': {
      const note = typeof args.note === 'string' ? args.note.trim() : '';
      if (note) await sendChunked(note, ctx);
      return 'Acknowledged. Now produce the full answer.';
    }
    case 'proceed':
      return 'Proceed to the full answer.';
    case 'send_message': {
      const content = typeof args.content === 'string' ? args.content : '';
      if (!content) return 'Error: content was empty.';
      await sendChunked(content, ctx);
      return 'Message sent.';
    }
    default:
      return `Unknown tool: ${call.name}`;
  }
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
