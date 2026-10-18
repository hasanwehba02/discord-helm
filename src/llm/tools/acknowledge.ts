import type { ToolContext, Tool } from './types.js';
import { sendChunked } from './messaging.js';

export const acknowledge = {
  definition: {
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
  },
  async execute(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const note = typeof args.note === 'string' ? args.note.trim() : '';
    if (note) await sendChunked(note, ctx);
    return 'Acknowledged. Now produce the full answer.';
  },
} satisfies Tool;
