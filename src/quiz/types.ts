// Quiz schema (docs/architecture/06 §1.1), wire-compatible with the legacy
// quizzer: assignment.instructions = QuizInstructions JSON, submission.code =
// QuizSubmission JSON, assignment.on_run = answer key JSON (server-side only).
// Pure types and tolerant parsers; no I/O.

export type QuizFeedbackType = 'IMMEDIATE' | 'NONE' | 'SUMMARY';
export type QuizPoolRandomness = 'ATTEMPT' | 'SEED' | 'NONE' | 'GROUP';

export interface QuizSettings {
  /** -1 = unlimited. */
  attemptLimit: number;
  /** Seconds between attempts; -1 = none. */
  coolDown: number;
  feedbackType: QuizFeedbackType;
  /** -1 = all questions on one page. */
  questionsPerPage: number;
  poolRandomness: QuizPoolRandomness;
  /** Optional reading preamble shown above the quiz. */
  readingId: number | null;
}

export interface QuizPool {
  name: string;
  amount: number;
  questions: string[];
  group?: string;
}

export interface QuizInstructions {
  /** Keyed by question id; insertion order is presentation order. */
  questions: Record<string, QuizQuestion>;
  settings: QuizSettings;
  pools: QuizPool[];
}

interface QuestionBase {
  id: string;
  /** Markdown body; blank-style questions embed `[key]` markers. */
  body: string;
  points: number;
}

export interface McqQuestion extends QuestionBase {
  type: 'multiple_choice_question';
  answers: string[];
}

export interface MultipleAnswersQuestion extends QuestionBase {
  type: 'multiple_answers_question';
  answers: string[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false_question';
}

export interface TextOnlyQuestion extends QuestionBase {
  type: 'text_only_question';
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching_question';
  statements: string[];
  answers: string[];
}

export interface MultipleDropdownsQuestion extends QuestionBase {
  type: 'multiple_dropdowns_question';
  /** Options per `[key]` marker in the body. */
  answers: Record<string, string[]>;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: 'short_answer_question';
}

export interface FillInMultipleBlanksQuestion extends QuestionBase {
  type: 'fill_in_multiple_blanks_question';
}

export interface CalculatedQuestion extends QuestionBase {
  type: 'calculated_question';
  tolerance: number;
}

export interface EssayQuestion extends QuestionBase {
  type: 'essay_question';
}

export interface FileUploadQuestion extends QuestionBase {
  type: 'file_upload_question';
}

export interface NumericalQuestion extends QuestionBase {
  type: 'numerical_question';
  tolerance: number;
}

/** Fallback so malformed content never crashes the quiz (Story 15.3). */
export interface UnknownQuestion extends QuestionBase {
  type: 'unknown_question';
  rawType: string;
}

export type QuizQuestion =
  | McqQuestion
  | MultipleAnswersQuestion
  | TrueFalseQuestion
  | TextOnlyQuestion
  | MatchingQuestion
  | MultipleDropdownsQuestion
  | ShortAnswerQuestion
  | FillInMultipleBlanksQuestion
  | CalculatedQuestion
  | EssayQuestion
  | FileUploadQuestion
  | NumericalQuestion
  | UnknownQuestion;

/**
 * One answer slot: a single choice/text, a checkbox set, or a map keyed by
 * blank/statement (fill-in-blanks, dropdowns, matching, file upload).
 */
export type QuizAnswerValue = string | string[] | Record<string, string>;

export interface QuizFeedback {
  correct: boolean;
  /** Earned fraction of the question's points, in [0, 1]. */
  score: number;
  message: string;
  status: 'graded' | 'pending';
}

export interface QuizAttempt {
  attempting: boolean;
  count: number;
  mulligans: number;
}

export interface QuizSubmission {
  studentAnswers: Record<string, QuizAnswerValue>;
  attempt: QuizAttempt;
  feedback: Record<string, QuizFeedback>;
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  attemptLimit: -1,
  coolDown: -1,
  feedbackType: 'IMMEDIATE',
  questionsPerPage: -1,
  poolRandomness: 'NONE',
  readingId: null,
};

const QUESTION_TYPES: readonly QuizQuestion['type'][] = [
  'multiple_choice_question',
  'multiple_answers_question',
  'true_false_question',
  'text_only_question',
  'matching_question',
  'multiple_dropdowns_question',
  'short_answer_question',
  'fill_in_multiple_blanks_question',
  'calculated_question',
  'essay_question',
  'file_upload_question',
  'numerical_question',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function parseQuestion(id: string, raw: unknown): QuizQuestion {
  const record = isRecord(raw) ? raw : {};
  const base: QuestionBase = {
    id,
    body: typeof record.body === 'string' ? record.body : '',
    points: typeof record.points === 'number' ? record.points : 1,
  };
  const type = typeof record.type === 'string' ? record.type : '';
  switch (type as QuizQuestion['type']) {
    case 'multiple_choice_question':
    case 'multiple_answers_question':
      return {
        ...base,
        type: type as 'multiple_choice_question',
        answers: stringList(record.answers),
      };
    case 'matching_question':
      return {
        ...base,
        type: 'matching_question',
        statements: stringList(record.statements),
        answers: stringList(record.answers),
      };
    case 'multiple_dropdowns_question': {
      const answers: Record<string, string[]> = {};
      if (isRecord(record.answers)) {
        for (const [key, options] of Object.entries(record.answers)) {
          answers[key] = stringList(options);
        }
      }
      return { ...base, type: 'multiple_dropdowns_question', answers };
    }
    case 'calculated_question':
    case 'numerical_question':
      return {
        ...base,
        type: type as 'numerical_question',
        tolerance: typeof record.tolerance === 'number' ? record.tolerance : 0,
      };
    case 'true_false_question':
    case 'text_only_question':
    case 'short_answer_question':
    case 'fill_in_multiple_blanks_question':
    case 'essay_question':
    case 'file_upload_question':
      return { ...base, type: type as 'essay_question' };
    default:
      return { ...base, type: 'unknown_question', rawType: type };
  }
}

function parseSettings(raw: unknown): QuizSettings {
  const record = isRecord(raw) ? raw : {};
  const feedbackType = record.feedbackType;
  const poolRandomness = record.poolRandomness;
  return {
    attemptLimit:
      typeof record.attemptLimit === 'number'
        ? record.attemptLimit
        : DEFAULT_QUIZ_SETTINGS.attemptLimit,
    coolDown:
      typeof record.coolDown === 'number' ? record.coolDown : DEFAULT_QUIZ_SETTINGS.coolDown,
    feedbackType:
      feedbackType === 'IMMEDIATE' || feedbackType === 'NONE' || feedbackType === 'SUMMARY'
        ? feedbackType
        : DEFAULT_QUIZ_SETTINGS.feedbackType,
    questionsPerPage:
      typeof record.questionsPerPage === 'number'
        ? record.questionsPerPage
        : DEFAULT_QUIZ_SETTINGS.questionsPerPage,
    poolRandomness:
      poolRandomness === 'ATTEMPT' ||
      poolRandomness === 'SEED' ||
      poolRandomness === 'NONE' ||
      poolRandomness === 'GROUP'
        ? poolRandomness
        : DEFAULT_QUIZ_SETTINGS.poolRandomness,
    readingId: typeof record.readingId === 'number' ? record.readingId : null,
  };
}

/**
 * Tolerant parser for assignment.instructions. Returns null only when the
 * top-level JSON is unusable; individual malformed questions degrade to
 * `unknown_question` instead of failing the whole quiz.
 */
export function parseQuizInstructions(raw: string): QuizInstructions | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.questions)) {
    return null;
  }
  const questions: Record<string, QuizQuestion> = {};
  for (const [id, value] of Object.entries(parsed.questions)) {
    questions[id] = parseQuestion(id, value);
  }
  const pools: QuizPool[] = Array.isArray(parsed.pools)
    ? parsed.pools.filter(isRecord).map((pool) => ({
        name: typeof pool.name === 'string' ? pool.name : '',
        amount: typeof pool.amount === 'number' ? pool.amount : 0,
        questions: stringList(pool.questions),
        ...(typeof pool.group === 'string' ? { group: pool.group } : {}),
      }))
    : [];
  return { questions, settings: parseSettings(parsed.settings), pools };
}

export function emptyQuizSubmission(): QuizSubmission {
  return {
    studentAnswers: {},
    attempt: { attempting: false, count: 0, mulligans: 0 },
    feedback: {},
  };
}

function parseAnswerValue(value: unknown): QuizAnswerValue | null {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    );
    return Object.fromEntries(entries);
  }
  return null;
}

function parseFeedback(value: unknown): QuizFeedback | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    correct: value.correct === true,
    score: typeof value.score === 'number' ? value.score : 0,
    message: typeof value.message === 'string' ? value.message : '',
    status: value.status === 'pending' ? 'pending' : 'graded',
  };
}

/** Tolerant parser for submission.code; malformed JSON yields a fresh state. */
export function parseQuizSubmission(raw: string): QuizSubmission {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyQuizSubmission();
  }
  if (!isRecord(parsed)) {
    return emptyQuizSubmission();
  }
  const submission = emptyQuizSubmission();
  if (isRecord(parsed.studentAnswers)) {
    for (const [id, value] of Object.entries(parsed.studentAnswers)) {
      const answer = parseAnswerValue(value);
      if (answer !== null) {
        submission.studentAnswers[id] = answer;
      }
    }
  }
  if (isRecord(parsed.attempt)) {
    submission.attempt = {
      attempting: parsed.attempt.attempting === true,
      count: typeof parsed.attempt.count === 'number' ? parsed.attempt.count : 0,
      mulligans: typeof parsed.attempt.mulligans === 'number' ? parsed.attempt.mulligans : 0,
    };
  }
  if (isRecord(parsed.feedback)) {
    for (const [id, value] of Object.entries(parsed.feedback)) {
      const feedback = parseFeedback(value);
      if (feedback) {
        submission.feedback[id] = feedback;
      }
    }
  }
  return submission;
}

export function serializeQuizSubmission(submission: QuizSubmission): string {
  return JSON.stringify(submission);
}

/** Parses the `feedbacks` payload of update_submission (server regrade). */
export function parseQuizFeedbackMap(raw: unknown): Record<string, QuizFeedback> {
  const feedback: Record<string, QuizFeedback> = {};
  if (isRecord(raw)) {
    for (const [id, value] of Object.entries(raw)) {
      const parsed = parseFeedback(value);
      if (parsed) {
        feedback[id] = parsed;
      }
    }
  }
  return feedback;
}

export function isQuestionType(
  type: string,
): type is Exclude<QuizQuestion['type'], 'unknown_question'> {
  return (QUESTION_TYPES as readonly string[]).includes(type);
}
