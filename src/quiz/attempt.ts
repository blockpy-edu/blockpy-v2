// Attempt lifecycle helpers (docs/architecture/06 §1.2). Pure functions over
// QuizSubmission; cooldown/attempt limits are computed client-side for UX and
// enforced server-side (Epic 20).

import type { QuizSettings, QuizSubmission } from './types';

export type AttemptVerdict = { allowed: true } | { allowed: false; reason: string };

export function canStartAttempt(settings: QuizSettings, submission: QuizSubmission): AttemptVerdict {
  const { attemptLimit } = settings;
  const allowedAttempts = attemptLimit < 0 ? Infinity : attemptLimit + submission.attempt.mulligans;
  if (submission.attempt.count >= allowedAttempts) {
    return { allowed: false, reason: 'No attempts remaining.' };
  }
  return { allowed: true };
}

/** startQuiz(): bumps the attempt count, clears feedback, keeps answers. */
export function startAttempt(submission: QuizSubmission): QuizSubmission {
  return {
    ...submission,
    attempt: { ...submission.attempt, attempting: true, count: submission.attempt.count + 1 },
    feedback: {},
  };
}

/** Closes the attempt locally; the graded feedback arrives from the server. */
export function finishAttempt(submission: QuizSubmission): QuizSubmission {
  return {
    ...submission,
    attempt: { ...submission.attempt, attempting: false },
  };
}
