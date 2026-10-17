import type { ToolCall } from '../provider.js';
import type { ToolContext, ToolModule } from './types.js';

export function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolModule>();

  constructor(tools: ToolModule[] = []) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool: ToolModule): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): ToolModule | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async dispatch(call: ToolCall, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return `Unknown tool: ${call.name}`;
    }

    const args = parseArgs(call.arguments);
    return await tool.execute(args, ctx);
  }
}
