const chains = new Map<string, Promise<unknown>>();

export function enqueue<T>(key: string, job: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev.then(job, job);

  const tracked = next.catch(() => undefined);
  chains.set(key, tracked);

  void tracked.then(() => {
    if (chains.get(key) === tracked) {
      chains.delete(key);
    }
  });

  return next;
}
