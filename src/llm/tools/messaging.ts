import type { ToolContext } from './types.js';

export const MAX_DISCORD_CONTENT = 2000;

export function chunkContent(content: string, limit: number = MAX_DISCORD_CONTENT): string[] {
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

export async function sendChunked(text: string, ctx: ToolContext): Promise<void> {
  const chunks = chunkContent(text, MAX_DISCORD_CONTENT);
  for (const chunk of chunks) {
    const sent = await ctx.channel.send(chunk);
    ctx.onSent(chunk, sent.id, sent.createdTimestamp);
    void ctx.channel.sendTyping().catch(() => undefined);
  }
}
