// Typed message protocol between the main thread and the engine worker
// (docs/architecture/05 §1.1). `runId` correlates streams to runs so stale
// worker messages can never pollute a newer run's console.

import type { RuntimeFileMap } from '../vfs/types';

export type Phase =
  | 'student.run'
  | 'instructor.onRun'
  | 'student.evaluate'
  | 'instructor.onEval'
  | 'instructor.onChange'
  | 'sample.run';

export interface RunSettings {
  /** Per-phase wall-clock timeout in ms; 0 disables (disableTimeout). */
  timeoutMs: number;
}

export interface PythonErrorInfo {
  /** Python exception class name ("NameError"). */
  type: string;
  message: string;
  /** Raw traceback text; rewritten for students by the feedback engine. */
  traceback: string;
  /** 1-based line in the main file, when determinable. */
  line: number | null;
}

export type RunOutcome =
  | { status: 'success' }
  | { status: 'syntax-error'; error: PythonErrorInfo }
  | { status: 'runtime-error'; error: PythonErrorInfo }
  | {
      /**
       * input() was called with no queued value. The host collects a value
       * and replays the run with the extended input queue (deterministic
       * fallback that needs no SharedArrayBuffer).
       */
      status: 'input-pending';
      prompt: string;
    }
  | { status: 'timeout' }
  | { status: 'terminated' };

/** Raw results from the instructor feedback shim, parsed from JSON. */
export interface InstructorFeedbackRaw {
  success: boolean;
  /** 0..1 partial credit accumulated via give_partial. */
  partial: number;
  messages: InstructorFeedbackMessage[];
}

export interface InstructorFeedbackMessage {
  kind: 'gently' | 'explain' | 'compliment' | 'system';
  label: string;
  message: string;
  line: number | null;
}

export interface RunRequest {
  kind: 'run';
  runId: number;
  phase: Phase;
  files: RuntimeFileMap;
  /** Name of the file to execute (e.g. "answer.py"). */
  main: string;
  /** Pre-supplied values for input() in order. */
  inputs: string[];
  settings: RunSettings;
  /** Extra globals exposed to instructor phases (student code, output). */
  context?: InstructorContext;
}

export interface InstructorContext {
  studentCode: string;
  studentOutput: string;
  studentError: PythonErrorInfo | null;
}

export type ToWorker =
  | { kind: 'init'; indexUrl: string }
  | RunRequest
  | { kind: 'evaluate'; runId: number; code: string; settings: RunSettings };

export type FromWorker =
  | { kind: 'ready' }
  | { kind: 'stdout'; text: string; runId: number }
  | { kind: 'stderr'; text: string; runId: number }
  | { kind: 'image'; png: string; runId: number }
  | { kind: 'result'; runId: number; outcome: RunOutcome }
  | { kind: 'evaluate-result'; runId: number; repr: string | null }
  | { kind: 'feedback-raw'; runId: number; payload: InstructorFeedbackRaw }
  | { kind: 'fatal'; message: string };

export const DEFAULT_TIMEOUT_MS = 7_000;
export const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/';
