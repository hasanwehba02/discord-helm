import type { ToolDefinition } from './provider.js';

export interface ToolContext {
  send(content: string): Promise<void>;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<string> | string;

export interface Tool {
  definition: ToolDefinition;
  execute: ToolHandler;
}
