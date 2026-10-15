import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempDir = mkdtempSync(join(tmpdir(), 'discord-llm-test-'));
process.env.DB_PATH = join(tempDir, 'test.sqlite');
process.env.LLM_MODEL = 'test-model';

const { insertMessage, getThreadMessages } = await import('../src/db/messages.ts');
const { closeDb } = await import('../src/db/index.ts');
const { buildContext } = await import('../src/context/context.ts');

before(() => {
  insertMessage({
    threadId: 't1',
    discordId: 'm1',
    role: 'user',
    authorId: 'u1',
    authorName: 'ritz',
    content: 'hello',
    createdAt: 1000,
  });
  insertMessage({
    threadId: 't1',
    discordId: 'm2',
    role: 'assistant',
    content: 'hi there',
    createdAt: 1001,
  });
  insertMessage({
    threadId: 't1',
    discordId: 'm3',
    role: 'user',
    authorId: 'u2',
    authorName: 'yo',
    content: 'second user',
    createdAt: 1002,
  });
  insertMessage({
    threadId: 't2',
    discordId: 'm4',
    role: 'user',
    authorId: 'u1',
    authorName: 'ritz',
    content: 'other thread',
    createdAt: 2000,
  });
});

after(() => {
  closeDb();
  rmSync(tempDir, { recursive: true, force: true });
});

test('getThreadMessages returns only the given thread in chronological order', () => {
  const rows = getThreadMessages('t1');
  assert.deepEqual(
    rows.map((r) => r.discordId),
    ['m1', 'm2', 'm3'],
  );
});

test('getThreadMessages respects the limit and keeps the latest messages', () => {
  const rows = getThreadMessages('t1', 2);
  assert.deepEqual(
    rows.map((r) => r.discordId),
    ['m2', 'm3'],
  );
});

test('buildContext maps rows to context messages with roles and authors', () => {
  const ctx = buildContext('t1');
  assert.equal(ctx.system, undefined);
  assert.deepEqual(ctx.messages, [
    { role: 'user', authorId: 'u1', authorName: 'ritz', content: 'hello' },
    { role: 'assistant', authorId: undefined, authorName: undefined, content: 'hi there' },
    { role: 'user', authorId: 'u2', authorName: 'yo', content: 'second user' },
  ]);
});

test('buildContext includes system prompt when provided', () => {
  const ctx = buildContext('t1', { system: 'You are helpful.', limit: 1 });
  assert.equal(ctx.system, 'You are helpful.');
  assert.deepEqual(
    ctx.messages.map((m) => m.content),
    ['second user'],
  );
});

test('buildContext returns empty messages for unknown thread', () => {
  const ctx = buildContext('does-not-exist');
  assert.deepEqual(ctx.messages, []);
});
