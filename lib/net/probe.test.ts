import { describe, expect, it, vi } from 'vitest';
import {
  WORKER_SOURCE,
  extractCode,
  firstRunnable,
  formatResult,
  isRunnable,
  runProbe,
  type WorkerLike,
} from './probe';

/**
 * Probes execute generated code in the user's browser, so the two things worth
 * pinning down are what the sandbox removes before that code runs, and that no
 * outcome — crash, hang, dead worker — can leave the UI waiting forever.
 */

describe('extractCode', () => {
  it('pulls fenced blocks with their language', () => {
    const blocks = extractCode('Prose.\n\n```js\nconst a = 1;\n```\n\nMore.\n\n```py\nx = 1\n```');
    expect(blocks).toEqual([
      { language: 'js', code: 'const a = 1;' },
      { language: 'py', code: 'x = 1' },
    ]);
  });

  it('returns nothing for prose with no code', () => {
    expect(extractCode('Just an argument, no artifact.')).toEqual([]);
  });

  it('ignores an empty fence', () => {
    expect(extractCode('```js\n\n```')).toEqual([]);
  });

  it('labels an unfenced language as text', () => {
    expect(extractCode('```\nplain\n```')[0].language).toBe('text');
  });

  it('treats only JS-family blocks as runnable', () => {
    expect(isRunnable({ language: 'js', code: 'x' })).toBe(true);
    expect(isRunnable({ language: 'typescript', code: 'x' })).toBe(true);
    expect(isRunnable({ language: 'python', code: 'x' })).toBe(false);
    expect(isRunnable({ language: 'sql', code: 'x' })).toBe(false);
  });

  it('finds the first runnable block, skipping earlier non-runnable ones', () => {
    const probe = firstRunnable('```sql\nselect 1\n```\n```js\nreturn 42;\n```');
    expect(probe?.code).toBe('return 42;');
  });

  it('returns null when the only code is not runnable here', () => {
    expect(firstRunnable('```python\nprint(1)\n```')).toBeNull();
  });
});

describe('WORKER_SOURCE', () => {
  // A Worker shares the page's origin, so leaving any of these reachable would
  // let generated code exfiltrate using the user's cookies.
  it.each(['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', 'navigator'])(
    'strips %s from the worker global',
    name => {
      expect(WORKER_SOURCE).toContain(`'${name}'`);
    },
  );

  it('strips nested Worker constructors, which would return a clean global', () => {
    expect(WORKER_SOURCE).toContain("'Worker'");
    expect(WORKER_SOURCE).toContain("'SharedWorker'");
  });

  it('removes the globals before evaluating the probe, not after', () => {
    expect(WORKER_SOURCE.indexOf('BLOCKED')).toBeLessThan(WORKER_SOURCE.indexOf('new Function'));
  });

  it('caps retained output so a runaway logger cannot exhaust memory', () => {
    expect(WORKER_SOURCE).toContain('lines.length < 500');
  });
});

/** A worker stub that replies with whatever the test wants. */
function fakeWorker(reply: unknown | null, opts: { crash?: boolean } = {}): { spawn: () => WorkerLike; terminated: () => boolean } {
  let terminated = false;
  const worker: WorkerLike = {
    onmessage: null,
    onerror: null,
    terminate: () => {
      terminated = true;
    },
    postMessage: () => {
      queueMicrotask(() => {
        if (opts.crash) worker.onerror?.({ message: 'boom' });
        else if (reply !== null) worker.onmessage?.({ data: reply });
        // reply === null and no crash: the worker never answers, so the
        // timeout is the only thing that can settle the promise.
      });
    },
  };
  return { spawn: () => worker, terminated: () => terminated };
}

describe('runProbe', () => {
  it('returns captured output and the return value', async () => {
    const { spawn } = fakeWorker({ output: ['42'], value: '42', ms: 3 });
    const result = await runProbe('return 42;', { spawn });

    expect(result).toMatchObject({ output: ['42'], value: '42', ms: 3, timedOut: false });
    expect(result.error).toBeUndefined();
  });

  it('surfaces a thrown error as a result rather than rejecting', async () => {
    const { spawn } = fakeWorker({ output: [], error: 'TypeError: x is not a function', ms: 1 });
    await expect(runProbe('x()', { spawn })).resolves.toMatchObject({
      error: 'TypeError: x is not a function',
      timedOut: false,
    });
  });

  it('terminates a probe that never answers, and says so', async () => {
    const { spawn, terminated } = fakeWorker(null);
    const result = await runProbe('while (true) {}', { spawn, timeoutMs: 20 });

    expect(result.timedOut).toBe(true);
    expect(result.error).toContain('20ms');
    // A hung worker keeps burning a core until it is killed.
    expect(terminated()).toBe(true);
  });

  it('terminates the worker after a normal result too', async () => {
    const { spawn, terminated } = fakeWorker({ output: [], ms: 1 });
    await runProbe('return 1;', { spawn });
    expect(terminated()).toBe(true);
  });

  it('reports a sandbox crash instead of hanging', async () => {
    const { spawn } = fakeWorker(null, { crash: true });
    await expect(runProbe('nope', { spawn })).resolves.toMatchObject({ error: 'boom' });
  });

  it('settles once, even if the worker answers after the timeout fired', async () => {
    let worker: WorkerLike;
    const spawn = () => {
      worker = {
        onmessage: null,
        onerror: null,
        terminate: () => {},
        postMessage: () => {
          setTimeout(() => worker.onmessage?.({ data: { output: ['late'], ms: 99 } }), 40);
        },
      };
      return worker;
    };

    const result = await runProbe('slow()', { spawn, timeoutMs: 10 });
    expect(result.timedOut).toBe(true);

    // Give the late reply time to arrive; it must not overwrite the result.
    await new Promise(r => setTimeout(r, 60));
    expect(result.output).toEqual([]);
  });

  it('returns a result when the sandbox cannot even start', async () => {
    const spawn = () => {
      throw new Error('Worker is not defined');
    };

    await expect(runProbe('return 1;', { spawn })).resolves.toMatchObject({
      error: expect.stringContaining('Could not start the sandbox'),
    });
  });

  it('sends the probe source to the worker unmodified', async () => {
    const postMessage = vi.fn();
    const spawn = (): WorkerLike => {
      const worker: WorkerLike = {
        onmessage: null,
        onerror: null,
        terminate: () => {},
        postMessage: (data: unknown) => {
          postMessage(data);
          queueMicrotask(() => worker.onmessage?.({ data: { output: [], ms: 0 } }));
        },
      };
      return worker;
    };

    await runProbe('const x = 1;\nreturn x;', { spawn });
    expect(postMessage).toHaveBeenCalledWith('const x = 1;\nreturn x;');
  });
});

describe('formatResult', () => {
  it('labels the block so the agent reads it as measurement, not opinion', () => {
    const text = formatResult({ output: ['occupancy 0.42'], value: '0.42', ms: 12, timedOut: false });
    expect(text).toContain('PROBE RESULT (12ms)');
    expect(text).toContain('occupancy 0.42');
    expect(text).toContain('returned: 0.42');
  });

  it('marks a throw distinctly from a timeout', () => {
    expect(formatResult({ output: [], error: 'RangeError', ms: 2, timedOut: false })).toContain('threw: RangeError');
    expect(formatResult({ output: [], error: 'Timed out after 5000ms — terminated.', ms: 5000, timedOut: true })).toContain(
      'Timed out',
    );
  });

  it('says so explicitly when a probe produced nothing at all', () => {
    expect(formatResult({ output: [], ms: 1, timedOut: false })).toContain('no output, no return value');
  });
});
