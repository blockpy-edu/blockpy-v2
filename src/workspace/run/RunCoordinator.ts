// Orchestrates the run pipeline (docs/architecture/05 §3):
// student.run → instructor.onRun → feedback → Intervention/update_submission.
// input() uses a deterministic replay strategy: when the program requests an
// unqueued input, the attempt's console output is cleared, the collected
// value is appended to the input list, and the program re-runs from the top.

import { buildFeedback } from '../../engine/feedback/feedbackEngine';
import type { EngineLike } from '../../engine/EngineHost';
import type { InstructorFeedbackRaw, PythonErrorInfo, RunOutcome } from '../../engine/protocol';
import { updateSubmission } from '../../api/endpoints/submissions';
import type { BlockPyApiClient } from '../../api/client';
import type { EventLog } from '../../api/endpoints/events';
import { MAIN_STUDENT_FILE, readFile, resolveForRuntime } from '../../vfs/vfs';
import type { SaveIds } from '../../vfs/savePlan';
import type { VfsStore } from '../../vfs/vfsStore';
import type { RunStore } from './runStore';

const ON_RUN_FILE = 'on_run.py';

export interface RunCoordinatorDeps {
  engine: EngineLike;
  /** Resolves the focused task's VFS and save ids at run time. */
  getRuntime: () => { vfsStore: VfsStore; saveIds: SaveIds };
  runStore: RunStore;
  client: BlockPyApiClient;
  events: EventLog;
  /** Invoked after a graded run, with the score as a 0–1 float. */
  onGraded?: (score: number, correct: boolean) => void;
}

export class RunCoordinator {
  private readonly deps: RunCoordinatorDeps;
  private epoch = 0;
  private inputs: string[] = [];
  /** Instructor-phase output must never reach the student console. */
  private suppressStreams = false;
  private collectedStdout: string[] = [];

  constructor(deps: RunCoordinatorDeps) {
    this.deps = deps;
    deps.engine.subscribe({
      onStream: (event) => {
        if (this.suppressStreams) {
          return;
        }
        this.collectedStdout.push(event.text);
        const kind =
          event.kind === 'stdout'
            ? 'stdout'
            : event.kind === 'stderr'
              ? 'stderr'
              : event.kind === 'image'
                ? 'image'
                : 'result';
        this.deps.runStore.getState().append(kind, event.text, this.epoch);
      },
      onStatus: (status) => {
        if (status === 'loading') {
          this.deps.runStore.getState().setStatus('loading');
        } else if (status === 'failed') {
          this.deps.runStore.getState().setStatus('failed');
        }
      },
    });
  }

  /** Starts a fresh run: clears collected inputs and bumps the epoch. */
  async run(): Promise<void> {
    this.inputs = [];
    await this.attempt(true);
  }

  /** Supplies a value for the pending input() and replays the run. */
  async submitInput(value: string): Promise<void> {
    this.inputs.push(value);
    const run = this.deps.runStore.getState();
    run.setInputPrompt(null);
    run.clearEpoch(this.epoch);
    await this.attempt(false);
  }

  async evaluate(code: string): Promise<void> {
    const run = this.deps.runStore.getState();
    run.append('echo', `>>> ${code}`, this.epoch);
    run.setStatus('running');
    const result = await this.deps.engine.evaluate(code);
    if (result.outcome.status === 'runtime-error') {
      run.append('stderr', result.outcome.error.message, this.epoch);
    }
    run.setStatus('ready');
    this.deps.events.log({
      event_type: 'Compile',
      file_path: '<console>',
      category: 'evaluate',
      label: '',
      message: code,
    });
  }

  interrupt(): void {
    this.deps.engine.interrupt();
    const run = this.deps.runStore.getState();
    run.append('notice', 'Stopped. Restarting Python…', this.epoch);
    run.setStatus('ready');
    run.setInputPrompt(null);
  }

  private async attempt(isFreshRun: boolean): Promise<void> {
    const { engine, runStore } = this.deps;
    const { vfsStore, saveIds } = this.deps.getRuntime();
    const run = runStore.getState();
    const { files } = vfsStore.getState();

    if (isFreshRun) {
      this.epoch += 1;
      run.append('separator', `Run ${this.epoch} — ${new Date().toLocaleTimeString()}`, this.epoch);
    }
    run.setStatus('running');
    run.setFeedback(null);
    run.setInputPrompt(null);
    this.collectedStdout = [];

    const studentFiles = resolveForRuntime(files, 'student');
    const result = await engine.run('student.run', studentFiles, MAIN_STUDENT_FILE, [
      ...this.inputs,
    ]);

    if (result.outcome.status === 'input-pending') {
      run.setInputPrompt(result.outcome.prompt);
      run.setStatus('awaiting-input');
      return;
    }

    const studentError = extractError(result.outcome);
    if (studentError) {
      run.append('stderr', studentError.message, this.epoch);
    }

    const onRun = readFile(files, ON_RUN_FILE, 'instructor');
    let instructorOutcome: RunOutcome | null = null;
    let instructorFeedback: InstructorFeedbackRaw | null | undefined;
    if (onRun && onRun.content.trim()) {
      this.suppressStreams = true;
      try {
        const instructorFiles = {
          ...resolveForRuntime(files, 'instructor'),
          [ON_RUN_FILE]: onRun.content,
        };
        const graded = await engine.run('instructor.onRun', instructorFiles, ON_RUN_FILE, [], {
          context: {
            studentCode: studentFiles[MAIN_STUDENT_FILE] ?? '',
            studentOutput: this.collectedStdout.join('\n'),
            studentError,
          },
        });
        instructorOutcome = graded.outcome;
        instructorFeedback = graded.feedback;
      } finally {
        this.suppressStreams = false;
      }
    }

    const feedback = buildFeedback({
      studentOutcome: result.outcome,
      instructorOutcome,
      instructorFeedback,
      mainFile: MAIN_STUDENT_FILE,
    });
    run.setFeedback(feedback);
    run.setStatus('ready');

    this.deps.events.log({
      event_type: 'Run.Program',
      file_path: MAIN_STUDENT_FILE,
      category: 'run',
      label: feedback.category,
      message: '',
    });
    this.deps.events.log({
      event_type: 'Intervention',
      file_path: MAIN_STUDENT_FILE,
      category: feedback.category,
      label: feedback.label,
      message: feedback.message,
    });

    if (feedback.score !== null) {
      this.deps.onGraded?.(feedback.score, feedback.correct);
      if (saveIds.submissionId !== null) {
        try {
          await updateSubmission(this.deps.client, {
            submissionId: saveIds.submissionId,
            score: feedback.score,
            correct: feedback.correct,
          });
        } catch {
          // Grade upload failures must not break the run experience; the
          // score is re-sent on the next run.
        }
      }
    }
  }
}

function extractError(outcome: RunOutcome): PythonErrorInfo | null {
  return outcome.status === 'syntax-error' || outcome.status === 'runtime-error'
    ? outcome.error
    : null;
}
