import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enqueue } from '../src/llm/queue.ts';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('same-key jobs run serially in order', async () => {
  const order: number[] = [];
  const a = deferred<void>();

  const p1 = enqueue('k', async () => {
    await a.promise;
    order.push(1);
  });
  const p2 = enqueue('k', async () => {
    order.push(2);
  });

  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(order, []);

  a.resolve();
  await Promise.all([p1, p2]);
  assert.deepEqual(order, [1, 2]);
});

test('a failing job does not break the chain for the same key', async () => {
  await assert.rejects(enqueue('e', async () => Promise.reject(new Error('boom'))));
  const result = await enqueue('e', async () => 'ok');
  assert.equal(result, 'ok');
});

test('different keys run concurrently', async () => {
  const order: string[] = [];
  const slow = deferred<void>();

  const pSlow = enqueue('slow', async () => {
    await slow.promise;
    order.push('slow');
  });
  const pFast = enqueue('fast', async () => {
    order.push('fast');
  });

  await pFast;
  assert.deepEqual(order, ['fast']);

  slow.resolve();
  await pSlow;
  assert.deepEqual(order, ['fast', 'slow']);
});

test('enqueue returns the job result', async () => {
  const value = await enqueue('r', async () => 42);
  assert.equal(value, 42);
});
