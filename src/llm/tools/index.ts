import type { ToolDefinition, ToolCall } from '../provider.js';
import type { ToolContext, ToolModule } from './types.js';
import { acknowledge, acknowledgeTool } from './acknowledge.js';
import { proceed, proceedTool } from './proceed.js';
import { sendMessage, sendMessageTool } from './send-message.js';
import { ToolRegistry } from './registry.js';

export * from './types.js';
export * from './registry.js';
export * from './messaging.js';
export { acknowledge, acknowledgeTool, executeAcknowledge } from './acknowledge.js';
export { proceed, proceedTool, executeProceed } from './proceed.js';
export { sendMessage, sendMessageTool, executeSendMessage } from './send-message.js';

/**
 * All tool modules registered in the system.
 * Mirrors the events/ index.ts pattern.
 */
export const tools: ToolModule[] = [acknowledge, proceed, sendMessage];

export const toolRegistry = new ToolRegistry(tools);

// Phase-specific tool availability
export const ackPhaseTools: ToolDefinition[] = [acknowledgeTool, proceedTool];
export const replyPhaseTools: ToolDefinition[] = [sendMessageTool];

export function dispatchTool(call: ToolCall, ctx: ToolContext): Promise<string> {
  return toolRegistry.dispatch(call, ctx);
}
