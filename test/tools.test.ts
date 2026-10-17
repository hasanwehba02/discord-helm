import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dispatchTool,
  ackPhaseTools,
  replyPhaseTools,
  acknowledgeTool,
  proceedTool,
  sendMessageTool,
  ToolRegistry,
  tools,
} from '../src/llm/tools.ts';
import type { ToolCall } from '../src/llm/provider.ts';

interface FakeSent {
  id: string;
  createdTimestamp: number;
}

function fakeContext() {
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
  };
  const ctx = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: channel as any,
    onSent: (content: string, messageId: string, createdAt: number) => {
      persisted.push({ content, messageId, createdAt });
    },
  };
  return { ctx, sends, persisted, getTypingCount: () => typingCount };
}

function call(name: string, args: unknown): ToolCall {
  return {
    id: 'x',
    name,
    arguments: typeof args === 'string' ? args : JSON.stringify(args),
  };
}

test('send_message sends short content as a single message', async () => {
  const { ctx, sends, persisted, getTypingCount } = fakeContext();
  const out = await dispatchTool(call('send_message', { content: 'hello' }), ctx);
  assert.equal(out, 'Message sent.');
  assert.deepEqual(sends, ['hello']);
  assert.deepEqual(persisted, [{ content: 'hello', messageId: 'm1', createdAt: 1001 }]);
  assert.equal(getTypingCount(), 1);
});

test('send_message splits content longer than 2000 chars', async () => {
  const { ctx, sends, persisted } = fakeContext();
  const long = 'a'.repeat(2500);
  await dispatchTool(call('send_message', { content: long }), ctx);
  assert.equal(sends.length, 2);
  for (const s of sends) assert.ok(s.length <= 2000);
  assert.equal(sends.join('').length, 2500);
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0].messageId, 'm1');
  assert.equal(persisted[1].messageId, 'm2');
});

test('send_message splits on newline boundaries when content exceeds limit', async () => {
  const { ctx, sends } = fakeContext();
  const part1 = 'a'.repeat(1500);
  const part2 = 'b'.repeat(1000);
  const content = `${part1}\n${part2}`;
  await dispatchTool(call('send_message', { content }), ctx);
  assert.equal(sends.length, 2);
  assert.equal(sends[0], part1);
  assert.equal(sends[1], part2);
});

test('send_message with empty content returns an error and sends nothing', async () => {
  const { ctx, sends } = fakeContext();
  const out = await dispatchTool(call('send_message', {}), ctx);
  assert.match(out, /empty/i);
  assert.deepEqual(sends, []);
});

test('send_message with empty string or non-string content returns an error', async () => {
  const { ctx, sends } = fakeContext();
  const outEmpty = await dispatchTool(call('send_message', { content: '' }), ctx);
  assert.match(outEmpty, /empty/i);

  const outNull = await dispatchTool(call('send_message', { content: null }), ctx);
  assert.match(outNull, /empty/i);
  assert.deepEqual(sends, []);
});

test('unknown tool returns an error', async () => {
  const { ctx } = fakeContext();
  const out = await dispatchTool(call('do_something', {}), ctx);
  assert.match(out, /Unknown tool/);
});

test('tool descriptors define required parameters and valid schemas', () => {
  assert.equal(sendMessageTool.name, 'send_message');
  const sendParams = sendMessageTool.parameters as { required?: string[] };
  assert.deepEqual(sendParams.required, ['content']);

  assert.equal(acknowledgeTool.name, 'acknowledge');
  const ackParams = acknowledgeTool.parameters as { required?: string[] };
  assert.deepEqual(ackParams.required, ['note']);

  assert.equal(proceedTool.name, 'proceed');
  assert.deepEqual(proceedTool.parameters, { type: 'object', properties: {} });
});

test('ack phase offers acknowledge and proceed, not send_message', () => {
  assert.deepEqual(ackPhaseTools, [acknowledgeTool, proceedTool]);
  const names = ackPhaseTools.map((t) => t.name);
  assert.deepEqual(names, ['acknowledge', 'proceed']);
});

test('reply phase offers only send_message', () => {
  assert.deepEqual(replyPhaseTools, [sendMessageTool]);
  const names = replyPhaseTools.map((t) => t.name);
  assert.deepEqual(names, ['send_message']);
});

test('acknowledge sends the note and asks for the full answer', async () => {
  const { ctx, sends, persisted } = fakeContext();
  const out = await dispatchTool(call('acknowledge', { note: 'まとめますね' }), ctx);
  assert.match(out, /full answer/i);
  assert.deepEqual(sends, ['まとめますね']);
  assert.deepEqual(
    persisted.map((p) => p.content),
    ['まとめますね'],
  );
});

test('acknowledge with empty or whitespace-only note sends nothing', async () => {
  const { ctx, sends } = fakeContext();
  const outWhitespace = await dispatchTool(call('acknowledge', { note: '   \n  ' }), ctx);
  assert.match(outWhitespace, /full answer/i);
  assert.deepEqual(sends, []);

  const outEmpty = await dispatchTool(call('acknowledge', { note: '' }), ctx);
  assert.match(outEmpty, /full answer/i);
  assert.deepEqual(sends, []);

  const outMissing = await dispatchTool(call('acknowledge', {}), ctx);
  assert.match(outMissing, /full answer/i);
  assert.deepEqual(sends, []);
});

test('proceed sends nothing and advances to the answer', async () => {
  const { ctx, sends } = fakeContext();
  const out = await dispatchTool(call('proceed', {}), ctx);
  assert.match(out, /proceed/i);
  assert.deepEqual(sends, []);
});

test('ToolRegistry dispatches tools by name and passes parsed arguments', async () => {
  const customRegistry = new ToolRegistry();
  let receivedArgs: Record<string, unknown> | null = null;
  customRegistry.register({
    name: 'custom_tool',
    definition: {
      name: 'custom_tool',
      description: 'A test custom tool',
      parameters: { type: 'object', properties: {} },
    },
    execute: (args) => {
      receivedArgs = args;
      return 'custom tool output';
    },
  });

  const { ctx } = fakeContext();
  const res = await customRegistry.dispatch(call('custom_tool', { foo: 'bar' }), ctx);
  assert.equal(res, 'custom tool output');
  assert.deepEqual(receivedArgs, { foo: 'bar' });
});

test('ToolRegistry returns error for unregistered tool', async () => {
  const emptyRegistry = new ToolRegistry();
  const { ctx } = fakeContext();
  const res = await emptyRegistry.dispatch(call('nonexistent', {}), ctx);
  assert.equal(res, 'Unknown tool: nonexistent');
});

test('ToolRegistry rejects duplicate tool registrations', () => {
  const customRegistry = new ToolRegistry();
  const dummyTool = {
    name: 'sample',
    definition: {
      name: 'sample',
      description: 'sample',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => 'ok',
  };

  customRegistry.register(dummyTool);
  assert.throws(() => customRegistry.register(dummyTool), /Tool already registered: sample/);

  assert.throws(() => new ToolRegistry([dummyTool, dummyTool]), /Tool already registered: sample/);
});

test('dispatchTool handles malformed JSON arguments gracefully', async () => {
  const { ctx, sends } = fakeContext();
  const outAck = await dispatchTool(
    { id: '1', name: 'acknowledge', arguments: '{invalid json' },
    ctx,
  );
  assert.match(outAck, /full answer/i);
  assert.deepEqual(sends, []);

  const outSend = await dispatchTool(
    { id: '2', name: 'send_message', arguments: 'not json at all' },
    ctx,
  );
  assert.match(outSend, /empty/i);
});

test('tool modules export self-contained definitions and execute handlers', () => {
  for (const tool of tools) {
    assert.ok(tool.name, 'tool must have a name');
    assert.equal(tool.name, tool.definition.name, 'tool name must match definition name');
    assert.ok(tool.definition.description, 'tool must have a description');
    assert.equal(typeof tool.execute, 'function', 'tool must have an execute function');
  }
});
