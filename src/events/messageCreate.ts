import { Events, type Client, type Message } from 'discord.js';
import type { EventModule } from './types.js';

interface MessageInput {
  authorId: string;
  authorName: string;
  text: string;
}

interface PromptInput {
  message: MessageInput;
  repliedTo?: MessageInput;
}

function stripMention(content: string, botId: string): string {
  return content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
}

async function resolveRepliedTo(
  message: Message,
  botId: string,
): Promise<MessageInput | undefined> {
  if (!message.reference?.messageId) return undefined;

  try {
    const ref = await message.fetchReference();
    const text = stripMention(ref.content, botId);
    if (!text) return undefined;
    return { authorId: ref.author.id, authorName: ref.author.displayName, text };
  } catch {
    return undefined;
  }
}

function formatPrompt(input: PromptInput): string {
  if (!input.repliedTo) {
    return input.message.text;
  }

  const lines = [`[Replying to] ${input.repliedTo.authorName}: ${input.repliedTo.text}`];
  if (input.message.text) {
    lines.push('', `${input.message.authorName}: ${input.message.text}`);
  }
  return lines.join('\n');
}

async function onMessageCreate(client: Client, message: Message): Promise<void> {
  if (message.author.bot || message.system) return;

  const botId = client.user?.id;
  if (!botId) return;

  if (!message.mentions.users.has(botId)) return;

  const userText = stripMention(message.content, botId);
  const repliedTo = await resolveRepliedTo(message, botId);

  if (!userText && !repliedTo) {
    await message.reply('empty');
    return;
  }

  const prompt = formatPrompt({
    message: {
      authorId: message.author.id,
      authorName: message.author.displayName,
      text: userText,
    },
    repliedTo,
  });

  await message.reply(prompt);
}

export const messageCreate: EventModule<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: onMessageCreate,
};
