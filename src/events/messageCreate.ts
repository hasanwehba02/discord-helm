import { ChannelType, Events, type Client, type Message } from 'discord.js';
import type { EventModule } from './types.js';
import { insertMessage } from '../db/messages.js';

interface MessageInput {
  authorId: string;
  authorName: string;
  text: string;
}

const THREAD_NAME_MAX = 100;

function stripMention(content: string, botId: string): string {
  return content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
}

function buildThreadName(input: MessageInput): string {
  const flattened = `${input.authorName}: ${input.text}`.replace(/\s+/g, ' ').trim();
  return truncateThreadName(flattened);
}

function truncateThreadName(name: string): string {
  return name.length > THREAD_NAME_MAX ? name.slice(0, THREAD_NAME_MAX - 1) + '…' : name;
}

async function resolveRepliedTo(message: Message): Promise<MessageInput | undefined> {
  if (!message.reference?.messageId) return undefined;

  try {
    const ref = await message.fetchReference();
    const text = ref.content.replace(/\s+/g, ' ').trim();
    if (!text) return undefined;
    return { authorId: ref.author.id, authorName: ref.author.displayName, text };
  } catch {
    return undefined;
  }
}

function resolveThreadName(input: MessageInput, repliedTo: MessageInput | undefined): string {
  if (input.text) {
    return buildThreadName(input);
  }
  if (repliedTo) {
    return truncateThreadName(`${repliedTo.authorName}: ${repliedTo.text}`);
  }
  return truncateThreadName(`chat with ${input.authorName}`);
}

function formatReply(input: MessageInput, repliedTo: MessageInput | undefined): string {
  if (input.text) return input.text;
  if (repliedTo) return repliedTo.text;
  return 'empty';
}

async function handleInThread(message: Message, botId: string): Promise<void> {
  const channel = message.channel;
  if (!channel.isThread()) return;
  if (channel.ownerId !== botId) return;

  const text = stripMention(message.content, botId);

  insertMessage({
    threadId: channel.id,
    discordId: message.id,
    role: 'user',
    authorId: message.author.id,
    authorName: message.author.displayName,
    content: text,
    createdAt: message.createdTimestamp,
  });

  const reply = formatReply(
    {
      authorId: message.author.id,
      authorName: message.author.displayName,
      text,
    },
    undefined,
  );
  const sent = await channel.send(reply);

  insertMessage({
    threadId: channel.id,
    discordId: sent.id,
    role: 'assistant',
    content: reply,
    createdAt: sent.createdTimestamp,
  });
}

async function handleInChannel(message: Message, botId: string): Promise<void> {
  if (!message.mentions.users.has(botId)) return;
  if (message.channel.type !== ChannelType.GuildText) return;

  const input: MessageInput = {
    authorId: message.author.id,
    authorName: message.author.displayName,
    text: stripMention(message.content, botId),
  };

  const repliedTo = await resolveRepliedTo(message);
  const thread = await message.startThread({ name: resolveThreadName(input, repliedTo) });

  insertMessage({
    threadId: thread.id,
    discordId: message.id,
    role: 'user',
    authorId: input.authorId,
    authorName: input.authorName,
    content: formatReply(input, repliedTo),
    createdAt: message.createdTimestamp,
  });

  const reply = formatReply(input, repliedTo);
  const sent = await thread.send(reply);

  insertMessage({
    threadId: thread.id,
    discordId: sent.id,
    role: 'assistant',
    content: reply,
    createdAt: sent.createdTimestamp,
  });
}

async function onMessageCreate(client: Client, message: Message): Promise<void> {
  if (message.author.bot || message.system) return;

  const botId = client.user?.id;
  if (!botId) return;

  if (message.channel.isThread()) {
    await handleInThread(message, botId);
  } else {
    await handleInChannel(message, botId);
  }
}

export const messageCreate: EventModule<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: onMessageCreate,
};
