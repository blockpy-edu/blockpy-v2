import type { ExecutionResult, RuntimeError } from '../types';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadPyodide?: (options?: Record<string, unknown>) => Promise<any>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodideInstance: any = null;
let loadingPromise: Promise<void> | null = null;

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
const EXECUTION_TIMEOUT_MS = 10000;

export async function loadPyodide(): Promise<void> {
  if (pyodideInstance) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PYODIDE_CDN;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide from CDN'));
        document.head.appendChild(script);
      });
    }

    if (!window.loadPyodide) {
      throw new Error('loadPyodide function not available after script load');
    }

    pyodideInstance = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });
  })();

  await loadingPromise;
}

export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null;
}

export async function runPython(code: string): Promise<ExecutionResult> {
  const startTime = performance.now();

  if (!pyodideInstance) {
    return {
      stdout: '',
      stderr: '',
      error: {
        type: 'RuntimeError',
        message: 'Pyodide is not loaded. Click run to load it first.',
        traceback: '',
      },
      executionTime: 0,
    };
  }

  let stdout = '';
  let stderr = '';

  try {
    pyodideInstance.setStdout({ batched: (text: string) => { stdout += text + '\n'; } });
    pyodideInstance.setStderr({ batched: (text: string) => { stderr += text + '\n'; } });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout')), EXECUTION_TIMEOUT_MS),
    );

    const runPromise = pyodideInstance.runPythonAsync(code) as Promise<unknown>;
    const returnValue = await Promise.race([runPromise, timeoutPromise]);
    const executionTime = performance.now() - startTime;

    return { stdout: stdout.trim(), stderr: stderr.trim(), returnValue, executionTime };
  } catch (e) {
    const executionTime = performance.now() - startTime;
    if (e instanceof Error && e.message === 'Execution timeout') {
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: { type: 'TimeoutError', message: 'Code execution timed out after 10s', traceback: '' },
        executionTime,
      };
    }

    const error = e as Error & { traceback?: string };
    const runtimeError: RuntimeError = {
      type: error.name ?? 'PythonError',
      message: error.message ?? String(e),
      traceback: error.traceback ?? '',
    };
    return { stdout: stdout.trim(), stderr: stderr.trim(), error: runtimeError, executionTime };
  }
}

export function resetPyodide(): void {
  pyodideInstance = null;
  loadingPromise = null;
}
