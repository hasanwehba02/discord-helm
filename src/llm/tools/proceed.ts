import type { Tool } from './types.js';

export const proceed = {
  definition: {
    name: 'proceed',
    description:
      'Skip the heads-up and go straight to the full answer. ' +
      'Use this for short or quick replies that do not need a heads-up.',
    parameters: { type: 'object', properties: {} },
  },
  execute(): string {
    return 'Proceed to the full answer.';
  },
} satisfies Tool;
