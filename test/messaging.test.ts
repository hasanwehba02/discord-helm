import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SendableChannels } from 'discord.js';
import { sendChunked } from '../src/discord/messaging.ts';

interface FakeSent {
  id: string;
  createdTimestamp: number;
}

function fakeMessaging() {
  const sends: string[] = [];
  const persisted: Array<{ content: string; messageId: string; createdAt: number }> = [];
  let counter = 0;
  let typingCount = 0;
  const channel = {
    send: async (content: string): Promise<FakeSent> => {
      sends.push(content);
      counter += 1;
      return { id: `m${counter}`, createdTimestamp: 1000 + counter };
    },
    sendTyping: async (): Promise<void> => {
      typingCount += 1;
    },
  } as unknown as SendableChannels;
  const onSent = (content: string, messageId: string, createdAt: number): void => {
    persisted.push({ content, messageId, createdAt });
  };
  return { channel, onSent, sends, persisted, getTypingCount: () => typingCount };
}

test('sendChunked sends short content as a single Discord message', async () => {
  const { channel, onSent, sends, persisted, getTypingCount } = fakeMessaging();
  await sendChunked('hello', channel, onSent);

  assert.deepEqual(sends, ['hello']);
  assert.deepEqual(persisted, [{ content: 'hello', messageId: 'm1', createdAt: 1001 }]);
  assert.equal(getTypingCount(), 1);
});

test('sendChunked does not send whitespace-only content', async () => {
  const { channel, onSent, sends, persisted, getTypingCount } = fakeMessaging();
  await sendChunked('\n', channel, onSent);

  assert.deepEqual(sends, []);
  assert.deepEqual(persisted, []);
  assert.equal(getTypingCount(), 0);
});

test('sendChunked splits content longer than the Discord limit', async () => {
  const { channel, onSent, sends, persisted } = fakeMessaging();
  await sendChunked('a'.repeat(2500), channel, onSent);

  assert.equal(sends.length, 2);
  for (const content of sends) assert.ok(content.length <= 2000);
  assert.equal(sends.join('').length, 2500);
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0].messageId, 'm1');
  assert.equal(persisted[1].messageId, 'm2');
});

test('sendChunked splits on newline boundaries', async () => {
  const { channel, onSent, sends } = fakeMessaging();
  const first = 'a'.repeat(1500);
  const second = 'b'.repeat(1000);

  await sendChunked(`${first}\n${second}`, channel, onSent);

  assert.deepEqual(sends, [first, second]);
});
