import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toChatMessages } from '../src/context/to-chat-messages.ts';
import type { Context } from '../src/context/context.ts';

test('prepends system message when present', () => {
  const ctx: Context = { system: 'be nice', messages: [] };
  assert.deepEqual(toChatMessages(ctx), [{ role: 'system', content: 'be nice' }]);
});

test('omits system message when absent', () => {
  const ctx: Context = {
    messages: [{ role: 'assistant', content: 'hi' }],
  };
  assert.deepEqual(toChatMessages(ctx), [{ role: 'assistant', content: 'hi' }]);
});

test('user messages prefix the author name and set a sanitized name field', () => {
  const ctx: Context = {
    messages: [{ role: 'user', authorId: '503123', authorName: 'ritz', content: 'hello' }],
  };
  assert.deepEqual(toChatMessages(ctx), [
    { role: 'user', content: 'ritz: hello', name: 'user_503123' },
  ]);
});

test('user without authorName or authorId keeps raw content and no name', () => {
  const ctx: Context = {
    messages: [{ role: 'user', content: 'anon' }],
  };
  assert.deepEqual(toChatMessages(ctx), [{ role: 'user', content: 'anon' }]);
});

test('sanitizes disallowed characters in the name field', () => {
  const ctx: Context = {
    messages: [{ role: 'user', authorId: 'a.b#c!1', authorName: 'x', content: 'y' }],
  };
  const [msg] = toChatMessages(ctx);
  assert.equal(msg.name, 'user_abc1');
});

test('preserves order across mixed roles', () => {
  const ctx: Context = {
    system: 'sys',
    messages: [
      { role: 'user', authorId: '1', authorName: 'a', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', authorId: '2', authorName: 'b', content: 'q2' },
    ],
  };
  assert.deepEqual(
    toChatMessages(ctx).map((m) => `${m.role}:${m.content}`),
    ['system:sys', 'user:a: q1', 'assistant:a1', 'user:b: q2'],
  );
});
