import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchTool, ackPhaseTools, replyPhaseTools } from '../src/llm/tools.ts';
import type { ToolCall } from '../src/llm/provider.ts';

interface FakeSent {
  id: string;
  createdTimestamp: number;
}

function fakeContext() {
  const sends: string[] = [];
  const persisted: string[] = [];
  let counter = 0;
  const channel = {
    send: async (content: string): Promise<FakeSent> => {
      sends.push(content);
      counter += 1;
      return { id: `m${counter}`, createdTimestamp: 1000 + counter };
    },
    sendTyping: async (): Promise<void> => {},
  };
  const ctx = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: channel as any,
    onSent: (content: string) => {
      persisted.push(content);
    },
  };
  return { ctx, sends, persisted };
}

function call(name: string, args: unknown): ToolCall {
  return { id: 'x', name, arguments: JSON.stringify(args) };
}

test('send_message sends short content as a single message', async () => {
  const { ctx, sends, persisted } = fakeContext();
  const out = await dispatchTool(call('send_message', { content: 'hello' }), ctx);
  assert.equal(out, 'Message sent.');
  assert.deepEqual(sends, ['hello']);
  assert.deepEqual(persisted, ['hello']);
});

test('send_message splits content longer than 2000 chars', async () => {
  const { ctx, sends } = fakeContext();
  const long = 'a'.repeat(2500);
  await dispatchTool(call('send_message', { content: long }), ctx);
  assert.equal(sends.length, 2);
  for (const s of sends) assert.ok(s.length <= 2000);
  assert.equal(sends.join('').length, 2500);
});

test('send_message with empty content returns an error and sends nothing', async () => {
  const { ctx, sends } = fakeContext();
  const out = await dispatchTool(call('send_message', {}), ctx);
  assert.match(out, /empty/i);
  assert.deepEqual(sends, []);
});

test('unknown tool returns an error', async () => {
  const { ctx } = fakeContext();
  const out = await dispatchTool(call('do_something', {}), ctx);
  assert.match(out, /Unknown tool/);
});

test('send_message tool is defined with a required content parameter', () => {
  const def = replyPhaseTools.find((t) => t.name === 'send_message');
  assert.ok(def);
  const params = def.parameters as { required?: string[] };
  assert.deepEqual(params.required, ['content']);
});

test('ack phase offers acknowledge and proceed, not send_message', () => {
  const names = ackPhaseTools.map((t) => t.name).sort();
  assert.deepEqual(names, ['acknowledge', 'proceed']);
});

test('reply phase offers only send_message', () => {
  const names = replyPhaseTools.map((t) => t.name);
  assert.deepEqual(names, ['send_message']);
});

test('acknowledge sends the note and asks for the full answer', async () => {
  const { ctx, sends, persisted } = fakeContext();
  const out = await dispatchTool(call('acknowledge', { note: 'まとめますね' }), ctx);
  assert.match(out, /full answer/i);
  assert.deepEqual(sends, ['まとめますね']);
  assert.deepEqual(persisted, ['まとめますね']);
});

test('proceed sends nothing and advances to the answer', async () => {
  const { ctx, sends } = fakeContext();
  const out = await dispatchTool(call('proceed', {}), ctx);
  assert.match(out, /proceed/i);
  assert.deepEqual(sends, []);
});
