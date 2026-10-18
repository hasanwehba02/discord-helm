import { ChannelType, Events, type Client, type Message, type SendableChannels } from 'discord.js';
import type { EventModule } from './types.js';
import { insertMessage } from '../db/messages.js';
import { buildContext } from '../context/context.js';
import { toChatMessages } from '../context/to-chat-messages.js';
import { getProvider } from '../llm/index.js';
import { enqueue } from '../llm/queue.js';
import { ackTools, replyTools } from '../llm/tools/index.js';
import type { ChatMessage } from '../llm/provider.js';
import type { ToolContext } from '../llm/tool.js';
import { sendChunked } from '../discord/messaging.js';

interface MessageInput {
  authorId: string;
  authorName: string;
  text: string;
}

const THREAD_NAME_MAX = 100;
const MAX_AGENT_ROUNDS = 5;
const SYSTEM_PROMPT =
  'You are a helpful assistant chatting with one or more Discord users. ' +
  'Each user message is prefixed with the speaker name. Reply concisely. ' +
  'You reply in two steps. First, decide whether to send a short heads-up: ' +
  'call acknowledge(note) if the answer will be long or take time, otherwise call proceed. ' +
  'Then send your full answer with the send_message tool. ' +
  'You can only send messages through these tools.';

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

async function generateReply(channel: SendableChannels, threadId: string): Promise<void> {
  const context = buildContext(threadId, { system: SYSTEM_PROMPT });
  const messages: ChatMessage[] = toChatMessages(context);

  await channel.sendTyping();
  const typing = setInterval(() => {
    void channel.sendTyping().catch(() => undefined);
  }, 8000);

  const persist = (content: string, messageId: string, createdAt: number): void => {
    insertMessage({ threadId, discordId: messageId, role: 'assistant', content, createdAt });
  };
  const ctx: ToolContext = {
    send: (content) => sendChunked(content, channel, persist),
  };

  try {
    await runAckPhase(messages, ctx);
    await runReplyPhase(messages, ctx, threadId);
  } catch (err) {
    console.error('LLM request failed:', err);
  } finally {
    clearInterval(typing);
  }
}

async function runAckPhase(messages: ChatMessage[], ctx: ToolContext): Promise<void> {
  const result = await getProvider().chat(messages, ackTools.definitions);
  if (result.toolCalls.length === 0) {
    return;
  }
  messages.push({ role: 'assistant', content: result.content ?? '', toolCalls: result.toolCalls });
  for (const call of result.toolCalls) {
    const outcome = await ackTools.dispatch(call, ctx);
    messages.push({ role: 'tool', content: outcome, toolCallId: call.id });
  }
}

async function runReplyPhase(
  messages: ChatMessage[],
  ctx: ToolContext,
  threadId: string,
): Promise<void> {
  for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
    const result = await getProvider().chat(messages, replyTools.definitions);

    if (result.toolCalls.length === 0) {
      console.warn('[agent] model returned no tool call; sending nothing');
      return;
    }

    messages.push({
      role: 'assistant',
      content: result.content ?? '',
      toolCalls: result.toolCalls,
    });

    for (const call of result.toolCalls) {
      const outcome = await replyTools.dispatch(call, ctx);
      messages.push({ role: 'tool', content: outcome, toolCallId: call.id });
    }
  }
  console.warn(`[agent] reached max rounds (${MAX_AGENT_ROUNDS}) for thread ${threadId}`);
}

function generateAndSend(channel: SendableChannels, threadId: string): Promise<void> {
  return enqueue(threadId, () => generateReply(channel, threadId));
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

  await generateAndSend(channel, channel.id);
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

  await generateAndSend(thread, thread.id);
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
