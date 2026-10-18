import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ackTools, replyTools } from '../src/llm/tools/index.ts';
import { ToolSet } from '../src/llm/tool-set.ts';
import type { ToolCall } from '../src/llm/provider.ts';

function fakeContext() {
  const sends: string[] = [];
  const ctx = {
    send: async (content: string): Promise<void> => {
      sends.push(content);
    },
  };
  return { ctx, sends };
}

function call(name: string, args: unknown): ToolCall {
  return {
    id: 'x',
    name,
    arguments: typeof args === 'string' ? args : JSON.stringify(args),
  };
}

test('send_message sends short content as a single message', async () => {
  const { ctx, sends } = fakeContext();
  const out = await replyTools.dispatch(call('send_message', { content: 'hello' }), ctx);
  assert.equal(out, 'Message sent.');
  assert.deepEqual(sends, ['hello']);
});

test('send_message with empty content returns an error and sends nothing', async () => {
  const { ctx, sends } = fakeContext();
  const out = await replyTools.dispatch(call('send_message', {}), ctx);
  assert.match(out, /empty/i);
  assert.deepEqual(sends, []);
});

test('send_message with empty, whitespace-only, or non-string content returns an error', async () => {
  const { ctx, sends } = fakeContext();
  const outEmpty = await replyTools.dispatch(call('send_message', { content: '' }), ctx);
  assert.match(outEmpty, /empty/i);

  const outWhitespace = await replyTools.dispatch(call('send_message', { content: '\n' }), ctx);
  assert.match(outWhitespace, /empty/i);

  const outNull = await replyTools.dispatch(call('send_message', { content: null }), ctx);
  assert.match(outNull, /empty/i);
  assert.deepEqual(sends, []);
});

test('unknown tool returns an error', async () => {
  const { ctx } = fakeContext();
  const out = await replyTools.dispatch(call('do_something', {}), ctx);
  assert.match(out, /Unknown tool/);
});

test('tool descriptors define required parameters and valid schemas', () => {
  const sendMessageTool = replyTools.definitions[0];
  const acknowledgeTool = ackTools.definitions[0];
  const proceedTool = ackTools.definitions[1];

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
  const names = ackTools.definitions.map((tool) => tool.name);
  assert.deepEqual(names, ['acknowledge', 'proceed']);
});

test('reply phase offers only send_message', () => {
  const names = replyTools.definitions.map((tool) => tool.name);
  assert.deepEqual(names, ['send_message']);
});

test('each phase rejects tools that it did not offer', async () => {
  const { ctx } = fakeContext();
  assert.equal(
    await ackTools.dispatch(call('send_message', { content: 'hello' }), ctx),
    'Unknown tool: send_message',
  );
  assert.equal(
    await replyTools.dispatch(call('acknowledge', { note: 'hello' }), ctx),
    'Unknown tool: acknowledge',
  );
});

test('acknowledge sends the note and asks for the full answer', async () => {
  const { ctx, sends } = fakeContext();
  const out = await ackTools.dispatch(call('acknowledge', { note: 'まとめますね' }), ctx);
  assert.match(out, /full answer/i);
  assert.deepEqual(sends, ['まとめますね']);
});

test('acknowledge with empty or whitespace-only note sends nothing', async () => {
  const { ctx, sends } = fakeContext();
  const outWhitespace = await ackTools.dispatch(call('acknowledge', { note: '   \n  ' }), ctx);
  assert.match(outWhitespace, /full answer/i);
  assert.deepEqual(sends, []);

  const outEmpty = await ackTools.dispatch(call('acknowledge', { note: '' }), ctx);
  assert.match(outEmpty, /full answer/i);
  assert.deepEqual(sends, []);

  const outMissing = await ackTools.dispatch(call('acknowledge', {}), ctx);
  assert.match(outMissing, /full answer/i);
  assert.deepEqual(sends, []);
});

test('proceed sends nothing and advances to the answer', async () => {
  const { ctx, sends } = fakeContext();
  const out = await ackTools.dispatch(call('proceed', {}), ctx);
  assert.match(out, /proceed/i);
  assert.deepEqual(sends, []);
});

test('ToolSet dispatches tools by name and passes parsed arguments', async () => {
  let receivedArgs: Record<string, unknown> | null = null;
  const customTools = new ToolSet([
    {
      definition: {
        name: 'custom_tool',
        description: 'A test custom tool',
        parameters: { type: 'object', properties: {} },
      },
      execute: (args) => {
        receivedArgs = args;
        return 'custom tool output';
      },
    },
  ]);

  const { ctx } = fakeContext();
  const res = await customTools.dispatch(call('custom_tool', { foo: 'bar' }), ctx);
  assert.equal(res, 'custom tool output');
  assert.deepEqual(receivedArgs, { foo: 'bar' });
});

test('ToolSet returns error for a tool outside the set', async () => {
  const emptyTools = new ToolSet([]);
  const { ctx } = fakeContext();
  const res = await emptyTools.dispatch(call('nonexistent', {}), ctx);
  assert.equal(res, 'Unknown tool: nonexistent');
});

test('ToolSet rejects duplicate tool definitions', () => {
  const dummyTool = {
    definition: {
      name: 'sample',
      description: 'sample',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => 'ok',
  };

  assert.throws(() => new ToolSet([dummyTool, dummyTool]), /Tool already registered: sample/);
});

test('ToolSet handles malformed JSON arguments gracefully', async () => {
  const { ctx, sends } = fakeContext();
  const outAck = await ackTools.dispatch(
    { id: '1', name: 'acknowledge', arguments: '{invalid json' },
    ctx,
  );
  assert.match(outAck, /full answer/i);
  assert.deepEqual(sends, []);

  const outSend = await replyTools.dispatch(
    { id: '2', name: 'send_message', arguments: 'not json at all' },
    ctx,
  );
  assert.match(outSend, /empty/i);
});

test('tool sets expose self-contained definitions', () => {
  for (const definition of [...ackTools.definitions, ...replyTools.definitions]) {
    assert.ok(definition.name, 'tool must have a name');
    assert.ok(definition.description, 'tool must have a description');
    assert.ok(definition.parameters, 'tool must have a parameter schema');
  }
});
