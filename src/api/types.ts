// Wire types mirroring blockpy-server `encode_json()` output exactly.
// snake_case is intentional: these match the server payloads byte-for-byte
// (docs/architecture/01 §1). Domain equivalents live in src/domain/.

export type AssignmentType =
  | 'blockpy'
  | 'reading'
  | 'quiz'
  | 'maze'
  | 'textbook'
  | 'explain'
  | 'kettle';

export interface AssignmentJson {
  id: number;
  name: string;
  url: string;
  type: AssignmentType;
  /** Markdown for readings, QuizInstructions JSON for quizzes, textbook JSON. */
  instructions: string;
  reviewed: boolean;
  /** Hide correctness/completion status from students. */
  hidden: boolean;
  public: boolean;
  /** Meant to be used inside another assignment. */
  subordinate: boolean;
  ip_ranges: string;
  points: number;
  /** JSON-encoded assignment settings; parse with parseAssignmentSettings. */
  settings: string;
  /** Grading script (python) for blockpy, or the quiz answer key JSON. */
  on_run: string;
  on_change: string;
  on_eval: string;
  starting_code: string;
  extra_instructor_files: string;
  extra_starting_files: string;
  forked_id: number | null;
  forked_version: number | null;
  owner_id: number;
  course_id: number;
  version: number;
  date_created: string;
  date_modified: string;
}

export type AssignmentGroupCategory =
  | 'none'
  | 'exam'
  | 'homework'
  | 'classwork'
  | 'project'
  | 'quiz'
  | 'lab'
  | 'reading';

export interface AssignmentGroupJson {
  id: number;
  name: string;
  url: string;
  category: AssignmentGroupCategory;
  position: number;
  forked_id: number | null;
  forked_version: number | null;
  owner_id: number;
  course_id: number;
  version: number;
}

export interface AssignmentGroupMembershipJson {
  id: number;
  assignment_group_id: number;
  assignment_id: number;
  position: number;
  /** JSON string: grading/visibility logic. */
  policy: string;
}

export type SubmissionStatus = 'Started' | 'inProgress' | 'Submitted' | 'Completed' | 'incomplete';

export type GradingStatus = 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';

export interface SubmissionJson {
  id: number;
  /** answer.py source, or QuizSubmission/ExplainSubmission JSON. */
  code: string;
  /** JSON bundle ("#extra_student_files.blockpy"). */
  extra_files: string;
  url: string;
  endpoint: string;
  /** Integer 0..100; domain Submission uses a 0..1 float. */
  score: number;
  correct: boolean;
  submission_status: SubmissionStatus;
  grading_status: GradingStatus;
  assignment_id: number | null;
  assignment_group_id: number | null;
  assignment_version: number;
  course_id: number | null;
  user_id: number | null;
  version: number;
  date_started: string | null;
  date_submitted?: string | null;
  date_due?: string | null;
  date_locked?: string | null;
  time_limit: string | null;
  feedback: string | null;
}

export interface UserJson {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/** Payload of blockpy/load_assignment (`Assignment.for_editor`). */
export interface EditorInformationJson {
  assignment: AssignmentJson;
  submission: SubmissionJson | null;
}

/** Payload of assignments/get_ids. */
export interface AssignmentIdsJson {
  assignments: AssignmentJson[];
  groups: AssignmentGroupJson[];
  /** Not all server versions send memberships; tolerate absence. */
  memberships?: AssignmentGroupMembershipJson[];
  errors: string[];
}

export interface LogEventEntry {
  event_type: string;
  file_path?: string;
  category?: string;
  label?: string;
  message?: string;
  extended?: boolean;
}

/**
 * Fields injected into every write request, mirroring the legacy
 * AssignmentInterface.saveFile payload (docs/architecture/01 §2.4).
 */
export interface RequestEnvelope {
  assignment_id: number | null;
  assignment_group_id: number | null;
  course_id: number | null;
  submission_id: number | null;
  user_id: number | null;
  /** Assignment version. */
  version: number;
  /** Date.now() at send time. */
  timestamp: number;
  /** new Date().getTimezoneOffset() at send time. */
  timezone: number;
  passcode?: string;
}

export const STUDENT_FILENAMES = ['answer.py', '#extra_student_files.blockpy'] as const;
export type StudentFilename = (typeof STUDENT_FILENAMES)[number];

export const INSTRUCTOR_FILENAMES = [
  '!on_run.py',
  '!on_change.py',
  '!on_eval.py',
  '^starting_code.py',
  '!assignment_settings.blockpy',
  '!instructions.md',
  '#extra_instructor_files.blockpy',
  '#extra_starting_files.blockpy',
] as const;
export type InstructorFilename = (typeof INSTRUCTOR_FILENAMES)[number];

export function isStudentFilename(filename: string): filename is StudentFilename {
  return (STUDENT_FILENAMES as readonly string[]).includes(filename);
}

export function isInstructorFilename(filename: string): filename is InstructorFilename {
  return (INSTRUCTOR_FILENAMES as readonly string[]).includes(filename);
}
