/// <reference lib="webworker" />
// Engine worker (docs/architecture/05 §1): bootstraps Pyodide and executes
// run/evaluate requests. Each phase runs with fresh globals; evaluate reuses
// the globals of the last student.run so the REPL can inspect program state.

import { PEDAL_SHIM_SOURCE, parseShimResult } from '../pedalShim';
import type { FromWorker, PythonErrorInfo, RunRequest, RunOutcome, ToWorker } from '../protocol';

interface PyProxy {
  destroy(): void;
  toString(): string;
  get(key: string): unknown;
}

interface PyodideApi {
  runPythonAsync(code: string, options?: { globals?: PyProxy }): Promise<unknown>;
  runPython(code: string, options?: { globals?: PyProxy }): unknown;
  globals: { get(name: string): (() => PyProxy) | undefined };
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  FS: {
    writeFile(path: string, data: string): void;
  };
}

declare function postMessage(message: FromWorker): void;

let pyodide: PyodideApi | null = null;
let lastRunGlobals: PyProxy | null = null;

const post = (message: FromWorker) => postMessage(message);

const INPUT_PENDING_MARKER = '__BlockPyInputPending__:';

/** Prelude installed before every run: queue-backed input(). */
const INPUT_PRELUDE = `
import builtins as __bp_builtins

__bp_inputs = __BLOCKPY_INPUTS__


def __bp_input(prompt=""):
    text = str(prompt)
    if __bp_inputs:
        value = __bp_inputs.pop(0)
        print(text + value)
        return value
    raise RuntimeError("${INPUT_PENDING_MARKER}" + text)


__bp_builtins.input = __bp_input
`;

async function initialize(indexUrl: string): Promise<void> {
  if (pyodide) {
    post({ kind: 'ready' });
    return;
  }
  const moduleUrl = `${indexUrl}pyodide.mjs`;
  const pyodideModule = (await import(/* @vite-ignore */ moduleUrl)) as {
    loadPyodide(options: { indexURL: string }): Promise<PyodideApi>;
  };
  pyodide = await pyodideModule.loadPyodide({ indexURL: indexUrl });
  post({ kind: 'ready' });
}

function freshGlobals(api: PyodideApi): PyProxy {
  const dict = api.globals.get('dict');
  if (!dict) {
    throw new Error('Pyodide globals missing dict constructor');
  }
  return dict();
}

function toErrorInfo(error: unknown, mainFile: string): PythonErrorInfo {
  const err = error as Error & { type?: string };
  const message = err.message ?? String(error);
  // Pyodide embeds the Python traceback in the message.
  const typeMatch = /\n([A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Interrupt|Exit))(?::|\n|$)/.exec(
    `\n${message}`,
  );
  const lineMatches = [...message.matchAll(/File "([^"]+)", line (\d+)/g)].filter(
    ([, file]) => file.endsWith(mainFile) || file === '<exec>',
  );
  const lastLine = lineMatches.at(-1);
  const lastMessageLine = message.trim().split('\n').at(-1) ?? message;
  return {
    type: err.type ?? typeMatch?.[1] ?? err.name ?? 'PythonError',
    message: lastMessageLine,
    traceback: message,
    line: lastLine ? Number.parseInt(lastLine[2], 10) : null,
  };
}

function extractInputPrompt(info: PythonErrorInfo): string | null {
  const index = info.traceback.indexOf(INPUT_PENDING_MARKER);
  if (index === -1) {
    return null;
  }
  const rest = info.traceback.slice(index + INPUT_PENDING_MARKER.length);
  return rest.split('\n')[0] ?? '';
}

function writeFiles(api: PyodideApi, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    if (!name.includes('..')) {
      api.FS.writeFile(name, content);
    }
  }
}

function bindStreams(api: PyodideApi, runId: number): void {
  api.setStdout({ batched: (text) => post({ kind: 'stdout', text, runId }) });
  api.setStderr({ batched: (text) => post({ kind: 'stderr', text, runId }) });
}

async function executeRun(request: RunRequest): Promise<void> {
  if (!pyodide) {
    post({ kind: 'fatal', message: 'Engine is not initialized' });
    return;
  }
  const api = pyodide;
  const { runId, files, main, inputs, phase, context } = request;
  writeFiles(api, files);
  bindStreams(api, runId);

  const globals = freshGlobals(api);
  const isInstructorPhase = phase.startsWith('instructor.');
  let outcome: RunOutcome;
  try {
    const prelude = INPUT_PRELUDE.replace('__BLOCKPY_INPUTS__', JSON.stringify(inputs));
    await api.runPythonAsync(prelude, { globals });
    if (isInstructorPhase) {
      await api.runPythonAsync(PEDAL_SHIM_SOURCE, { globals });
      const setup = `student = __BlockPyStudent(${pyLiteral(context?.studentCode ?? '')}, ${pyLiteral(
        context?.studentOutput ?? '',
      )}, ${pyLiteral(context?.studentError ? context.studentError.message : null)})`;
      await api.runPythonAsync(setup, { globals });
    }
    const code = files[main] ?? '';
    await api.runPythonAsync(code, { globals });
    outcome = { status: 'success' };
    if (phase === 'student.run') {
      lastRunGlobals?.destroy();
      lastRunGlobals = globals;
    }
  } catch (error) {
    const info = toErrorInfo(error, main);
    const inputPrompt = extractInputPrompt(info);
    if (inputPrompt !== null) {
      outcome = { status: 'input-pending', prompt: inputPrompt };
    } else if (info.type === 'SyntaxError' || info.type === 'IndentationError') {
      outcome = { status: 'syntax-error', error: info };
    } else {
      outcome = { status: 'runtime-error', error: info };
    }
  }

  if (isInstructorPhase && outcome.status === 'success') {
    try {
      const raw = (await api.runPythonAsync('__blockpy_feedback_json()', { globals })) as string;
      post({ kind: 'feedback-raw', runId, payload: parseShimResult(raw) });
    } catch {
      // Instructor script ran but feedback collection failed: report nothing.
    }
  }
  post({ kind: 'result', runId, outcome });
}

/** Serializes a JS string/null as a Python literal. */
function pyLiteral(value: string | null): string {
  return value === null ? 'None' : JSON.stringify(value);
}

async function executeEvaluate(runId: number, code: string): Promise<void> {
  if (!pyodide) {
    post({ kind: 'fatal', message: 'Engine is not initialized' });
    return;
  }
  const api = pyodide;
  bindStreams(api, runId);
  const globals = lastRunGlobals ?? freshGlobals(api);
  try {
    const value = await api.runPythonAsync(code, { globals });
    const repr =
      value === undefined || value === null
        ? null
        : typeof value === 'object' && 'toString' in (value as object)
          ? String(value)
          : (JSON.stringify(value) ?? String(value));
    post({ kind: 'evaluate-result', runId, repr });
    post({ kind: 'result', runId, outcome: { status: 'success' } });
  } catch (error) {
    const info = toErrorInfo(error, '<console>');
    post({ kind: 'result', runId, outcome: { status: 'runtime-error', error: info } });
  }
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  switch (message.kind) {
    case 'init':
      void initialize(message.indexUrl).catch((error: unknown) => {
        post({
          kind: 'fatal',
          message: error instanceof Error ? error.message : 'Failed to load Pyodide',
        });
      });
      break;
    case 'run':
      void executeRun(message);
      break;
    case 'evaluate':
      void executeEvaluate(message.runId, message.code);
      break;
  }
};
