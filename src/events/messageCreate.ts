import { Events, type Client, type Message } from 'discord.js';
import type { EventModule } from './types.js';

function stripMention(content: string, botId: string): string {
  return content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
}

async function onMessageCreate(client: Client, message: Message): Promise<void> {
  if (message.author.bot || message.system) return;

  const botId = client.user?.id;
  if (!botId) return;

  if (!message.mentions.users.has(botId)) return;

  const prompt = stripMention(message.content, botId);

  if (prompt === '') {
    await message.reply("empty");
    return;
  }

  await message.reply(`${prompt}`);
}

export const messageCreate: EventModule<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: onMessageCreate,
};
