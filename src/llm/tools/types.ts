import type { SendableChannels } from 'discord.js';
import type { ToolDefinition } from '../provider.js';

export interface ToolContext {
  channel: SendableChannels;
  onSent: (content: string, messageId: string, createdAt: number) => void;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<string> | string;

export interface ToolModule {
  name: string;
  definition: ToolDefinition;
  execute: ToolHandler;
}
