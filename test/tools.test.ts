import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchTool, toolDefinitions } from '../src/llm/tools.ts';
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
  const def = toolDefinitions.find((t) => t.name === 'send_message');
  assert.ok(def);
  const params = def.parameters as { required?: string[] };
  assert.deepEqual(params.required, ['content']);
});
