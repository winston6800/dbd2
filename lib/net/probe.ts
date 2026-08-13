/**
 * Probes — running the Artificer's code and feeding the result back into the net.
 *
 * The Artificer is told to emit a real, runnable artifact rather than a sketch.
 * Without this module that code dies in a transcript: the user has to copy it
 * out, build a harness, run it, and come back days later, which in practice
 * means never. So the net runs it, and the output becomes a message on the node
 * — which means the *next* agent turn argues against a measured number instead
 * of against an assumption. That loop is the point.
 *
 * ── On safety ──────────────────────────────────────────────────────────────
 * This is generated code executing in the user's browser, so two controls apply.
 *
 * The real one is consent: the code is always shown before it runs and never
 * executes without a click. That is the same trust model as pasting a snippet
 * into your own terminal.
 *
 * The second is containment. A Worker cannot touch the DOM, but it *does* share
 * the page's origin, so a naive worker could fetch any same-origin endpoint with
 * the user's cookies — which matters here because a node's transcript can carry
 * text the user pasted from somewhere else, and prompt injection could steer an
 * agent into emitting exactly that. So every escape hatch is removed from the
 * worker's global scope *before* the generated code is evaluated: network,
 * storage, and nested workers (which would otherwise hand back a clean global
 * with `fetch` intact).
 *
 * That is defence in depth, not a security boundary against a determined
 * attacker — a browser is not a sandbox vendor. It is enough to make the
 * realistic failure mode (an agent talked into emitting something it should
 * not) inert, while the click is what stops the rest.
 */

export interface ProbeResult {
  /** Anything written with console.log/warn/error, in order. */
  output: string[];
  /** The probe's return value, formatted. Undefined when it returned nothing. */
  value?: string;
  error?: string;
  /** Wall-clock duration in ms — often the number the probe exists to measure. */
  ms: number;
  timedOut: boolean;
}

export interface ProbeCode {
  language: string;
  code: string;
}

const RUNNABLE = new Set(['js', 'javascript', 'ts', 'typescript', 'mjs']);

/**
 * Pulls fenced code blocks out of an agent reply.
 *
 * Only JS-family blocks are runnable; a Python or SQL block is still worth
 * showing but there is nothing in a browser to run it with, so it comes back
 * flagged by language and the UI offers no run button.
 */
export function extractCode(prose: string): ProbeCode[] {
  const blocks: ProbeCode[] = [];
  const fence = /```([a-zA-Z0-9+#-]*)\n([\s\S]*?)```/g;

  for (const match of prose.matchAll(fence)) {
    const code = match[2].trim();
    if (code) blocks.push({ language: (match[1] || 'text').toLowerCase(), code });
  }

  return blocks;
}

export function isRunnable(block: ProbeCode): boolean {
  return RUNNABLE.has(block.language);
}

/** The first runnable block in a reply — what the run button targets. */
export function firstRunnable(prose: string): ProbeCode | null {
  return extractCode(prose).find(isRunnable) ?? null;
}

/**
 * The worker bootstrap.
 *
 * Order matters: the globals are stripped before the generated code is ever
 * evaluated, so there is no window in which it could capture a reference to
 * one of them.
 */
export const WORKER_SOURCE = `
self.onmessage = function (event) {
  var BLOCKED = [
    'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts',
    'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker',
    'navigator', 'Notification', 'openDatabase', 'sendBeacon'
  ];

  for (var i = 0; i < BLOCKED.length; i++) {
    var name = BLOCKED[i];
    try { delete self[name]; } catch (e) {}
    try {
      Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false });
    } catch (e) {}
  }

  var lines = [];

  function fmt(value) {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.name + ': ' + value.message;
    try {
      var json = JSON.stringify(value);
      return json === undefined ? String(value) : json;
    } catch (e) {
      return String(value);
    }
  }

  function record(prefix) {
    return function () {
      var parts = [];
      for (var i = 0; i < arguments.length; i++) parts.push(fmt(arguments[i]));
      // Cap retained output: a runaway loop logging forever would otherwise
      // grow until the tab dies, and the timeout could never fire cleanly.
      if (lines.length < 500) lines.push(prefix + parts.join(' '));
    };
  }

  self.console = {
    log: record(''), info: record(''), debug: record(''),
    warn: record('warn: '), error: record('error: '),
  };

  var started = Date.now();

  try {
    // Wrapped in an async IIFE so the probe can use top-level await and return.
    var run = new Function('return (async function () {\\n' + event.data + '\\n})();');

    Promise.resolve(run()).then(
      function (value) {
        self.postMessage({
          output: lines,
          value: value === undefined ? undefined : fmt(value),
          ms: Date.now() - started,
        });
      },
      function (err) {
        self.postMessage({ output: lines, error: fmt(err), ms: Date.now() - started });
      }
    );
  } catch (err) {
    self.postMessage({ output: lines, error: fmt(err), ms: Date.now() - started });
  }
};
`;

/** The subset of Worker this module uses, so tests can supply a fake. */
export interface WorkerLike {
  postMessage(data: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export interface RunOptions {
  timeoutMs?: number;
  /** Injectable for tests, and for environments with no Worker at all. */
  spawn?: (source: string) => WorkerLike;
}

function defaultSpawn(source: string): WorkerLike {
  const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
  const worker = new Worker(url);
  // Safe to revoke immediately — the worker holds its own reference to the
  // script once constructed, and this avoids leaking a blob per run.
  URL.revokeObjectURL(url);
  return worker as unknown as WorkerLike;
}

/**
 * Runs a probe to completion, a timeout, or a crash — always resolving, never
 * rejecting, because every one of those outcomes is a result worth showing the
 * user and feeding back to the agent. A probe that hangs is a finding.
 */
export async function runProbe(code: string, options: RunOptions = {}): Promise<ProbeResult> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const spawn = options.spawn ?? defaultSpawn;
  const started = Date.now();

  let worker: WorkerLike;
  try {
    worker = spawn(WORKER_SOURCE);
  } catch (err) {
    return { output: [], error: `Could not start the sandbox: ${String(err)}`, ms: 0, timedOut: false };
  }

  return new Promise<ProbeResult>(resolve => {
    let settled = false;

    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        output: [],
        error: `Timed out after ${timeoutMs}ms — terminated.`,
        ms: timeoutMs,
        timedOut: true,
      });
    }, timeoutMs);

    worker.onmessage = event => {
      const data = (event.data ?? {}) as Partial<ProbeResult>;
      finish({
        output: data.output ?? [],
        value: data.value,
        error: data.error,
        ms: data.ms ?? Date.now() - started,
        timedOut: false,
      });
    };

    worker.onerror = event => {
      const message = (event as { message?: string })?.message ?? 'The sandbox crashed';
      finish({ output: [], error: message, ms: Date.now() - started, timedOut: false });
    };

    worker.postMessage(code);
  });
}

/**
 * Renders a result as the transcript message the next agent turn will read.
 *
 * Deliberately plain and labelled: the agent has to be able to tell measured
 * output from the user's own prose, or it will treat a stack trace as an
 * argument.
 */
export function formatResult(result: ProbeResult): string {
  const parts = [`PROBE RESULT (${result.ms}ms)`];

  if (result.output.length) parts.push(result.output.join('\n'));
  if (result.value !== undefined) parts.push(`returned: ${result.value}`);
  if (result.error) parts.push(result.timedOut ? result.error : `threw: ${result.error}`);
  if (!result.output.length && result.value === undefined && !result.error) {
    parts.push('(no output, no return value)');
  }

  return parts.join('\n\n');
}
