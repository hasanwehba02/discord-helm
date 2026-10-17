import type { ToolDefinition } from '../provider.js';
import type { ToolModule } from './types.js';

export const proceedTool: ToolDefinition = {
  name: 'proceed',
  description:
    'Skip the heads-up and go straight to the full answer. ' +
    'Use this for short or quick replies that do not need a heads-up.',
  parameters: { type: 'object', properties: {} },
};

export function executeProceed(): string {
  return 'Proceed to the full answer.';
}

export const proceed: ToolModule = {
  name: 'proceed',
  definition: proceedTool,
  execute: executeProceed,
};
