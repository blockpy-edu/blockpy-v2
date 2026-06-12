import { describe, expect, it } from 'vitest';
import { RunCoordinator } from '../RunCoordinator';
import { createRunStore } from '../runStore';
import { BlockPyApiClient } from '../../../api/client';
import type { Transport } from '../../../api/client';
import { EventLog } from '../../../api/endpoints/events';
import type {
  EngineLike,
  EngineListener,
  EngineRunResult,
  EngineStreamEvent,
} from '../../../engine/EngineHost';
import type { Phase } from '../../../engine/protocol';
import type { RuntimeFileMap, VfsFile } from '../../../vfs/types';
import { createVfsStore } from '../../../vfs/vfsStore';
import type { SaveIds } from '../../../vfs/savePlan';

interface RunCall {
  phase: Phase;
  files: RuntimeFileMap;
  main: string;
  inputs: string[];
  context?: { studentCode: string; studentOutput: string };
}

type ScriptedStep = {
  result: EngineRunResult;
  streams?: Array<Pick<EngineStreamEvent, 'kind' | 'text'>>;
};

class FakeEngine implements EngineLike {
  readonly runCalls: RunCall[] = [];
  readonly evaluateCalls: string[] = [];
  interrupted = 0;
  private readonly listeners: EngineListener[] = [];
  private readonly script: ScriptedStep[];

  constructor(script: ScriptedStep[]) {
    this.script = [...script];
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.push(listener);
    return () => {};
  }

  run(
    phase: Phase,
    files: RuntimeFileMap,
    main: string,
    inputs: string[],
    options?: { context?: { studentCode: string; studentOutput: string } },
  ): Promise<EngineRunResult> {
    this.runCalls.push({ phase, files, main, inputs, context: options?.context });
    const step = this.script.shift();
    if (!step) {
      throw new Error('FakeEngine script exhausted');
    }
    for (const stream of step.streams ?? []) {
      for (const listener of this.listeners) {
        listener.onStream?.({ ...stream, runId: 1 });
      }
    }
    return Promise.resolve(step.result);
  }

  evaluate(code: string): Promise<EngineRunResult> {
    this.evaluateCalls.push(code);
    const step = this.script.shift();
    if (!step) {
      throw new Error('FakeEngine script exhausted');
    }
    return Promise.resolve(step.result);
  }

  interrupt(): void {
    this.interrupted += 1;
  }
}

class RecordingTransport implements Transport {
  readonly calls: Array<{ route: string; params: Record<string, string> }> = [];

  post(route: string, params: Record<string, string>): Promise<unknown> {
    this.calls.push({ route, params });
    return Promise.resolve({ success: true });
  }
}

const STUDENT_FILE: VfsFile = {
  name: 'answer.py',
  namespace: 'student',
  content: 'print("hi")',
  origin: 'column',
};

const ON_RUN: VfsFile = {
  name: 'on_run.py',
  namespace: 'instructor',
  content: 'set_success()',
  origin: 'column',
};

const success: EngineRunResult = { outcome: { status: 'success' }, feedback: null };

function makeCoordinator(
  script: ScriptedStep[],
  files: VfsFile[],
  saveIds: SaveIds = { submissionId: 7, assignmentId: 3 },
) {
  const engine = new FakeEngine(script);
  const vfsStore = createVfsStore(files);
  const runStore = createRunStore();
  const transport = new RecordingTransport();
  const client = new BlockPyApiClient(transport, () => ({
    assignment_id: saveIds.assignmentId,
    assignment_group_id: null,
    course_id: null,
    submission_id: saveIds.submissionId,
    user_id: null,
    version: 1,
  }));
  const events = new EventLog(client);
  const coordinator = new RunCoordinator({
    engine,
    getRuntime: () => ({ vfsStore, saveIds }),
    runStore,
    client,
    events,
  });
  return { engine, runStore, transport, coordinator, events };
}

describe('RunCoordinator', () => {
  it('runs the student program and reports a clean run', async () => {
    const { coordinator, engine, runStore } = makeCoordinator(
      [{ result: success, streams: [{ kind: 'stdout', text: 'hi' }] }],
      [STUDENT_FILE],
    );
    await coordinator.run();

    expect(engine.runCalls).toHaveLength(1);
    expect(engine.runCalls[0].phase).toBe('student.run');
    expect(engine.runCalls[0].files['answer.py']).toBe('print("hi")');
    const state = runStore.getState();
    expect(state.status).toBe('ready');
    expect(state.entries.some((entry) => entry.kind === 'separator')).toBe(true);
    expect(state.entries.some((entry) => entry.kind === 'stdout' && entry.text === 'hi')).toBe(
      true,
    );
    expect(state.feedback?.label).toBe('Run complete');
    expect(state.feedback?.score).toBeNull();
  });

  it('runs the grader, suppresses its output, and uploads the score', async () => {
    const { coordinator, engine, runStore, transport, events } = makeCoordinator(
      [
        { result: success, streams: [{ kind: 'stdout', text: 'student output' }] },
        {
          result: {
            outcome: { status: 'success' },
            feedback: { success: true, partial: 1, messages: [] },
          },
          streams: [{ kind: 'stdout', text: 'grader secret' }],
        },
      ],
      [STUDENT_FILE, ON_RUN],
    );
    await coordinator.run();
    await events.flush();

    expect(engine.runCalls).toHaveLength(2);
    const grading = engine.runCalls[1];
    expect(grading.phase).toBe('instructor.onRun');
    expect(grading.main).toBe('on_run.py');
    expect(grading.files['on_run.py']).toBe('set_success()');
    expect(grading.context?.studentCode).toBe('print("hi")');
    expect(grading.context?.studentOutput).toContain('student output');

    const state = runStore.getState();
    expect(state.entries.some((entry) => entry.text === 'grader secret')).toBe(false);
    expect(state.feedback?.category).toBe('success');
    expect(state.feedback?.score).toBe(1);

    const update = transport.calls.find((call) => call.route === 'blockpy/update_submission');
    expect(update).toBeDefined();
    // Scores travel as 0-100 integers on the wire.
    expect(update?.params.score).toBe('100');
    expect(update?.params.correct).toBe('true');
    expect(
      transport.calls.some(
        (call) => call.route === 'blockpy/log_event' && call.params.event_type === 'Intervention',
      ),
    ).toBe(true);
  });

  it('does not run the grader when on_run.py is empty', async () => {
    const { coordinator, engine } = makeCoordinator(
      [{ result: success }],
      [STUDENT_FILE, { ...ON_RUN, content: '   ' }],
    );
    await coordinator.run();
    expect(engine.runCalls).toHaveLength(1);
  });

  it('replays the run with collected inputs after input()', async () => {
    const { coordinator, engine, runStore } = makeCoordinator(
      [
        {
          result: { outcome: { status: 'input-pending', prompt: 'Name?' }, feedback: null },
          streams: [{ kind: 'stdout', text: 'before input' }],
        },
        { result: success, streams: [{ kind: 'stdout', text: 'after input' }] },
      ],
      [STUDENT_FILE],
    );
    await coordinator.run();

    let state = runStore.getState();
    expect(state.status).toBe('awaiting-input');
    expect(state.inputPrompt).toBe('Name?');

    await coordinator.submitInput('Ada');

    expect(engine.runCalls[1].inputs).toEqual(['Ada']);
    state = runStore.getState();
    expect(state.status).toBe('ready');
    expect(state.inputPrompt).toBeNull();
    // First attempt's output is cleared; the separator survives.
    expect(state.entries.some((entry) => entry.text === 'before input')).toBe(false);
    expect(state.entries.some((entry) => entry.kind === 'separator')).toBe(true);
    expect(state.entries.some((entry) => entry.text === 'after input')).toBe(true);
  });

  it('shows runtime errors in the console and feedback', async () => {
    const { coordinator, runStore } = makeCoordinator(
      [
        {
          result: {
            outcome: {
              status: 'runtime-error',
              error: {
                type: 'NameError',
                message: "NameError: name 'x' is not defined",
                traceback: '',
                line: 1,
              },
            },
            feedback: null,
          },
        },
      ],
      [STUDENT_FILE],
    );
    await coordinator.run();

    const state = runStore.getState();
    expect(state.feedback?.category).toBe('runtime');
    expect(
      state.entries.some((entry) => entry.kind === 'stderr' && entry.text.includes('NameError')),
    ).toBe(true);
  });

  it('skips the grade upload when there is no submission id', async () => {
    const { coordinator, transport } = makeCoordinator(
      [
        { result: success },
        {
          result: {
            outcome: { status: 'success' },
            feedback: { success: true, partial: 1, messages: [] },
          },
        },
      ],
      [STUDENT_FILE, ON_RUN],
      { submissionId: null, assignmentId: null },
    );
    await coordinator.run();
    expect(transport.calls.some((call) => call.route === 'blockpy/update_submission')).toBe(false);
  });

  it('evaluate echoes the expression and surfaces errors', async () => {
    const { coordinator, runStore } = makeCoordinator(
      [
        {
          result: {
            outcome: {
              status: 'runtime-error',
              error: { type: 'NameError', message: 'NameError: nope', traceback: '', line: null },
            },
            feedback: null,
          },
        },
      ],
      [STUDENT_FILE],
    );
    await coordinator.evaluate('nope');

    const texts = runStore.getState().entries.map((entry) => entry.text);
    expect(texts).toContain('>>> nope');
    expect(texts).toContain('NameError: nope');
  });

  it('interrupt stops the engine and notifies the console', () => {
    const { coordinator, engine, runStore } = makeCoordinator([], [STUDENT_FILE]);
    coordinator.interrupt();
    expect(engine.interrupted).toBe(1);
    const state = runStore.getState();
    expect(state.status).toBe('ready');
    expect(state.entries.some((entry) => entry.kind === 'notice')).toBe(true);
  });
});
