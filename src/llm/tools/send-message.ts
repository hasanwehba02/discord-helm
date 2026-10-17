import type { ToolDefinition } from '../provider.js';
import type { ToolContext, ToolModule } from './types.js';
import { sendChunked } from './messaging.js';

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

export async function executeSendMessage(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const content = typeof args.content === 'string' ? args.content : '';
  if (!content) return 'Error: content was empty.';
  await sendChunked(content, ctx);
  return 'Message sent.';
}

export const sendMessage: ToolModule = {
  name: 'send_message',
  definition: sendMessageTool,
  execute: executeSendMessage,
};
