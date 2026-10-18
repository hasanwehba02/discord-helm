import type { ToolCall, ToolDefinition } from './provider.js';
import type { Tool, ToolContext } from './tool.js';

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export class ToolSet {
  readonly definitions: readonly ToolDefinition[];
  private readonly tools = new Map<string, Tool>();

  constructor(tools: readonly Tool[]) {
    for (const tool of tools) {
      const name = tool.definition.name;
      if (this.tools.has(name)) {
        throw new Error(`Tool already registered: ${name}`);
      }
      this.tools.set(name, tool);
    }
    this.definitions = tools.map((tool) => tool.definition);
  }

  async dispatch(call: ToolCall, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return `Unknown tool: ${call.name}`;
    }
    return await tool.execute(parseArgs(call.arguments), ctx);
  }
}
