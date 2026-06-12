import type { Transport } from './client';
import { gradeQuiz, parseQuizAnswerKey } from '../quiz/grading';
import { parseQuizInstructions, parseQuizSubmission } from '../quiz/types';
import { isInstructorFilename, isStudentFilename } from './types';
import type {
  AssignmentGroupJson,
  AssignmentGroupMembershipJson,
  AssignmentJson,
  SubmissionJson,
} from './types';

export interface OfflineSeed {
  assignment: AssignmentJson;
  submission: SubmissionJson;
}

/** A multi-task seed: one AssignmentGroup with ordered member tasks. */
export interface OfflineActivitySeed {
  group: AssignmentGroupJson | null;
  memberships: AssignmentGroupMembershipJson[];
  tasks: OfflineSeed[];
}

export function createOfflineSeed(
  assignment: Partial<AssignmentJson> = {},
  submission: Partial<SubmissionJson> = {},
): OfflineSeed {
  const now = new Date().toISOString();
  const fullAssignment: AssignmentJson = {
    id: 1,
    name: 'Untitled',
    url: '',
    type: 'blockpy',
    instructions: '',
    reviewed: false,
    hidden: false,
    public: false,
    subordinate: false,
    ip_ranges: '',
    points: 1,
    settings: '',
    on_run: '',
    on_change: '',
    on_eval: '',
    starting_code: '',
    extra_instructor_files: '',
    extra_starting_files: '',
    forked_id: null,
    forked_version: null,
    owner_id: 0,
    course_id: 0,
    version: 1,
    date_created: now,
    date_modified: now,
    ...assignment,
  };
  const fullSubmission: SubmissionJson = {
    id: 1,
    code: fullAssignment.starting_code,
    extra_files: '',
    url: '',
    endpoint: '',
    score: 0,
    correct: false,
    submission_status: 'Started',
    grading_status: 'NotReady',
    assignment_id: fullAssignment.id,
    assignment_group_id: null,
    assignment_version: fullAssignment.version,
    course_id: fullAssignment.course_id,
    user_id: 0,
    version: 1,
    date_started: now,
    date_submitted: null,
    date_due: null,
    date_locked: null,
    time_limit: null,
    feedback: null,
    ...submission,
  };
  return { assignment: fullAssignment, submission: fullSubmission };
}

interface OfflineState {
  group: AssignmentGroupJson | null;
  memberships: AssignmentGroupMembershipJson[];
  tasks: OfflineSeed[];
  logCount: number;
}

/** Persisted shape from before activities existed (single task). */
interface LegacyOfflineState {
  assignment: AssignmentJson;
  submission: SubmissionJson;
  logCount: number;
}

const FILENAME_TO_ASSIGNMENT_FIELD: Record<string, keyof AssignmentJson> = {
  '!on_run.py': 'on_run',
  '!on_change.py': 'on_change',
  '!on_eval.py': 'on_eval',
  '^starting_code.py': 'starting_code',
  '!assignment_settings.blockpy': 'settings',
  '!instructions.md': 'instructions',
  '#extra_instructor_files.blockpy': 'extra_instructor_files',
  '#extra_starting_files.blockpy': 'extra_starting_files',
};

function normalizeSeed(seed: OfflineSeed | OfflineActivitySeed): Omit<OfflineState, 'logCount'> {
  if ('tasks' in seed) {
    return { group: seed.group, memberships: seed.memberships, tasks: seed.tasks };
  }
  return { group: null, memberships: [], tasks: [seed] };
}

/**
 * Serverless transport (docs/architecture/01 §3 rule 2): resolves loads from
 * mount-config seed data and persists saves to localStorage. The UI sees the
 * same routes and response shapes as the real server. Holds one or more
 * tasks (assignment + submission pairs); requests route by explicit ids.
 */
export class OfflineTransport implements Transport {
  private readonly storageKey: string;
  private state: OfflineState;

  constructor(seed: OfflineSeed | OfflineActivitySeed, storageKey: string) {
    this.storageKey = storageKey;
    this.state = this.restore() ?? { ...normalizeSeed(seed), logCount: 0 };
  }

  post(route: string, params: Record<string, string>): Promise<unknown> {
    switch (route) {
      case 'blockpy/load_assignment': {
        const task = this.findByAssignment(params.assignment_id);
        if (!task) {
          return Promise.resolve({ success: false, message: 'Unknown assignment' });
        }
        return Promise.resolve({
          success: true,
          assignment: task.assignment,
          submission: task.submission,
        });
      }
      case 'assignments/get_ids':
        return Promise.resolve({
          success: true,
          assignments: this.state.tasks.map((task) => task.assignment),
          groups: this.state.group ? [this.state.group] : [],
          memberships: this.state.memberships,
          errors: [],
        });
      case 'blockpy/save_file':
        return Promise.resolve(this.saveFile(params));
      case 'blockpy/log_event':
        this.state.logCount += 1;
        this.persist();
        return Promise.resolve({ success: true, log_id: this.state.logCount });
      case 'blockpy/update_submission':
        return Promise.resolve(this.updateSubmission(params));
      case 'blockpy/update_submission_status': {
        const task = this.findBySubmission(params.submission_id);
        if (task && params.status) {
          this.replaceTask(task, {
            submission: {
              ...task.submission,
              submission_status: params.status as SubmissionJson['submission_status'],
            },
          });
        }
        return Promise.resolve({ success: true });
      }
      default:
        return Promise.resolve({
          success: false,
          message: `Offline mode does not support ${route}`,
        });
    }
  }

  private findByAssignment(id: string | undefined): OfflineSeed | null {
    if (id === undefined) {
      return this.state.tasks[0] ?? null;
    }
    const parsed = Number.parseInt(id, 10);
    return this.state.tasks.find((task) => task.assignment.id === parsed) ?? null;
  }

  private findBySubmission(id: string | undefined): OfflineSeed | null {
    if (id === undefined) {
      return this.state.tasks[0] ?? null;
    }
    const parsed = Number.parseInt(id, 10);
    return this.state.tasks.find((task) => task.submission.id === parsed) ?? null;
  }

  private replaceTask(task: OfflineSeed, patch: Partial<OfflineSeed>): void {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((candidate) =>
        candidate === task ? { ...candidate, ...patch } : candidate,
      ),
    };
    this.persist();
  }

  private saveFile(params: Record<string, string>): Record<string, unknown> {
    const { filename = '', code = '' } = params;
    if (isStudentFilename(filename)) {
      const task = this.findBySubmission(params.submission_id);
      if (!task) {
        return { success: false, message: 'Unknown submission' };
      }
      this.replaceTask(task, {
        submission:
          filename === 'answer.py'
            ? { ...task.submission, code }
            : { ...task.submission, extra_files: code },
      });
      return { success: true };
    }
    if (isInstructorFilename(filename)) {
      const task = this.findByAssignment(params.assignment_id);
      if (!task) {
        return { success: false, message: 'Unknown assignment' };
      }
      const field = FILENAME_TO_ASSIGNMENT_FIELD[filename];
      this.replaceTask(task, {
        assignment: {
          ...task.assignment,
          [field]: code,
          version: task.assignment.version + 1,
        },
      });
      return { success: true };
    }
    return { success: false, message: `Unknown filename: ${filename}` };
  }

  private updateSubmission(params: Record<string, string>): Record<string, unknown> {
    const task = this.findBySubmission(params.submission_id);
    if (!task) {
      return { success: false, message: 'Unknown submission' };
    }
    if (task.assignment.type === 'quiz') {
      return this.regradeQuiz(task);
    }
    const score = Number.parseInt(params.score ?? '', 10);
    const submission: SubmissionJson = {
      ...task.submission,
      score: Number.isNaN(score) ? task.submission.score : score,
      correct: params.correct === 'true',
    };
    this.replaceTask(task, { submission });
    return {
      success: true,
      submission_status: submission.submission_status,
      correct: submission.correct,
    };
  }

  /** Simulates the server's regrade_if_quiz: grades on_run against code. */
  private regradeQuiz(task: OfflineSeed): Record<string, unknown> {
    const instructions = parseQuizInstructions(task.assignment.instructions);
    if (!instructions) {
      return { success: false, message: 'Malformed quiz instructions' };
    }
    const result = gradeQuiz(
      instructions,
      parseQuizAnswerKey(task.assignment.on_run),
      parseQuizSubmission(task.submission.code),
      task.submission.id,
    );
    const submission: SubmissionJson = {
      ...task.submission,
      score: Math.round(100 * result.score),
      correct: result.correct,
      submission_status: 'Submitted',
    };
    this.replaceTask(task, { submission });
    return {
      success: true,
      submission_status: submission.submission_status,
      correct: submission.correct,
      feedbacks: result.feedback,
    };
  }

  private restore(): OfflineState | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as OfflineState | LegacyOfflineState;
      if ('tasks' in parsed) {
        return parsed;
      }
      // Migrate the pre-activity single-task shape.
      return {
        group: null,
        memberships: [],
        tasks: [{ assignment: parsed.assignment, submission: parsed.submission }],
        logCount: parsed.logCount,
      };
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Storage unavailable: offline progress is session-only.
    }
  }
}
