import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from './concurrency';

function defer<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => (resolve = r));
  return { promise, resolve };
}

describe('runWithConcurrency', () => {
  it('processes every item exactly once', async () => {
    const seen: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async n => {
      seen.push(n);
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('never runs more than `limit` workers at once', async () => {
    const gates = [defer<void>(), defer<void>(), defer<void>(), defer<void>()];
    let inFlight = 0;
    let maxInFlight = 0;

    const run = runWithConcurrency([0, 1, 2, 3], 2, async i => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await gates[i].promise;
      inFlight--;
    });

    // Let the scheduler start as many as it will.
    await Promise.resolve();
    await Promise.resolve();
    expect(maxInFlight).toBe(2);

    gates.forEach(g => g.resolve());
    await run;
    expect(maxInFlight).toBe(2);
  });

  it('keeps going after one item throws, and surfaces the error to the caller', async () => {
    const seen: number[] = [];
    await expect(
      runWithConcurrency([1, 2, 3], 3, async n => {
        seen.push(n);
        if (n === 2) throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(seen.sort()).toEqual([1, 2, 3]);
  });

  it('does nothing for an empty list', async () => {
    let calls = 0;
    await runWithConcurrency([], 3, async () => {
      calls++;
    });
    expect(calls).toBe(0);
  });

  it('caps concurrency at the item count when limit is larger', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await runWithConcurrency([1, 2], 10, async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
    });
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
