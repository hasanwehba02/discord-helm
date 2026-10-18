import type { SendableChannels } from 'discord.js';

export const MAX_DISCORD_CONTENT = 2000;

export type OnMessageSent = (content: string, messageId: string, createdAt: number) => void;

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

export async function sendChunked(
  text: string,
  channel: SendableChannels,
  onSent: OnMessageSent,
): Promise<void> {
  const chunks = chunkContent(text);
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const sent = await channel.send(chunk);
    onSent(chunk, sent.id, sent.createdTimestamp);
    void channel.sendTyping().catch(() => undefined);
  }
}
