// Shared types for the blockpy editor

export type SyncSource = 'blocks' | 'text' | 'external';

export interface ParseResult {
  success: boolean;
  blocksXml?: string;
  errors: TranslationError[];
}

export interface TranslationError {
  type: 'parse_error' | 'unsupported_syntax' | 'runtime_error' | 'sync_conflict';
  message: string;
  nodeType?: string;
  location?: SourceLocation;
  sourceExcerpt?: string;
}

export interface SourceLocation {
  line: number;
  col: number;
  endLine?: number;
  endCol?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  returnValue?: unknown;
  error?: RuntimeError;
  executionTime: number;
}

export interface RuntimeError {
  type: string;
  message: string;
  traceback: string;
}

export interface SyncState {
  source: SyncSource;
  isDirty: boolean;
  lastValidBlocksXml: string;
  lastValidPython: string;
  isParsing: boolean;
  parseErrors: TranslationError[];
}

export interface UnsupportedSyntaxError extends TranslationError {
  type: 'unsupported_syntax';
  nodeType: string;
  location: SourceLocation;
  sourceExcerpt: string;
}

export type UserRole = 'learner' | 'instructor' | 'ta' | 'admin' | 'guest' | string;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface BlockPyUserConfig {
  id: string;
  name: string;
  role: UserRole;
  courseId: string;
  groupId: string;
}

export interface BlockPyAssignmentVisibilityFlags {
  showInstructions: boolean;
  showPoints: boolean;
  showSamples: boolean;
  showFeedback: boolean;
}

export interface BlockPySampleSubmission {
  id: string;
  code: string;
  score?: number | null;
  correctness?: boolean | null;
}

export interface BlockPyAssignmentConfig {
  id: string;
  name: string;
  instructions: string;
  url: string;
  type: string;
  points: number;
  visibilityFlags: BlockPyAssignmentVisibilityFlags;
  settings: Record<string, unknown>;
  startingCode: string;
  instructorHooks: Record<string, unknown>;
  tags: string[];
  sampleSubmissions: BlockPySampleSubmission[];
  extraFiles: Record<string, string>;
}

export type BlockPySubmissionStatus =
  | 'draft'
  | 'saved'
  | 'submitted'
  | 'running'
  | 'completed'
  | 'error'
  | string;

export interface BlockPySubmissionConfig {
  id: string;
  code: string;
  extraFiles: Record<string, string>;
  score: number | null;
  correctness: boolean | null;
  status: BlockPySubmissionStatus;
  ownerId: string;
  endpoint: string;
  version: number;
}

export interface BlockPyServerConfig {
  urls: Record<string, string>;
  accessToken: string;
}

/**
 * One ordered task inside an inline activity mount
 * (docs/architecture/02 §2): an AssignmentGroup membership plus the
 * assignment fields the task needs.
 */
export interface BlockPyActivityTaskConfig {
  id: string;
  name: string;
  /** Assignment type; defaults to 'blockpy' (a code task). */
  type?: string;
  instructions?: string;
  startingCode?: string;
  onRun?: string;
  points?: number;
  /** Membership policy, e.g. { require_previous: true }. */
  policy?: Record<string, unknown>;
  submission?: {
    id?: string;
    code?: string;
  };
}

export interface BlockPyActivityConfig {
  id: string;
  name: string;
  /** AssignmentGroup category ('homework', 'exam', ...); defaults to 'none'. */
  category?: string;
  tasks: BlockPyActivityTaskConfig[];
}

export interface BlockPyDisplayConfig {
  readOnly: boolean;
}

export interface BlockPyRuntimeConfig {
  partId: string;
  executionTimeoutMs: number;
  expectedOutput: string | null;
  settings: Record<string, unknown>;
}

export interface BlockPyInitialState {
  user: BlockPyUserConfig;
  assignment: BlockPyAssignmentConfig;
  submission: BlockPySubmissionConfig;
  display: BlockPyDisplayConfig;
  runtime: BlockPyRuntimeConfig;
  server: BlockPyServerConfig;
  /** Multi-task activity; when present it supersedes the single assignment. */
  activity: BlockPyActivityConfig | null;
}

export interface BlockPyRunContext {
  result: ExecutionResult;
  state: BlockPyInitialState;
  code: string;
  parseErrors: TranslationError[];
}

export interface BlockPyLifecycleCallbacks {
  onReady?: (state: BlockPyInitialState) => void;
  onStateChange?: (state: BlockPyInitialState) => void;
  onRunStart?: (state: BlockPyInitialState) => void;
  onRunComplete?: (context: BlockPyRunContext) => void;
  onRunSuccess?: (context: BlockPyRunContext) => void;
  isCorrectRun?: (context: BlockPyRunContext) => boolean;
}

export interface BlockPyMountOptions extends DeepPartial<Omit<BlockPyInitialState, 'activity'>> {
  activity?: BlockPyActivityConfig | null;
  callbacks?: BlockPyLifecycleCallbacks;
}

export interface BlockPyResolvedConfig {
  initialState: BlockPyInitialState;
  callbacks: BlockPyLifecycleCallbacks;
}
