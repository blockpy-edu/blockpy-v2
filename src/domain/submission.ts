import type { GradingStatus, SubmissionJson, SubmissionStatus } from '../api/types';

/**
 * Camel-case domain projection of a submission. The wire `score` is an
 * integer 0..100; the domain `score` is a float in [0, 1]. The conversion
 * happens here and nowhere else (docs/architecture/01 §1.4).
 */
export interface Submission {
  id: number;
  code: string;
  extraFiles: string;
  url: string;
  endpoint: string;
  /** Float in [0, 1]. */
  score: number;
  correct: boolean;
  submissionStatus: SubmissionStatus;
  gradingStatus: GradingStatus;
  assignmentId: number | null;
  assignmentGroupId: number | null;
  assignmentVersion: number;
  courseId: number | null;
  userId: number | null;
  version: number;
  dateStarted: string | null;
  dateSubmitted: string | null;
  dateDue: string | null;
  dateLocked: string | null;
  timeLimit: string | null;
  feedback: string | null;
}

export function wireScoreToFloat(score: number): number {
  return score / 100;
}

export function floatScoreToWire(score: number): number {
  return Math.round(100 * score);
}

export function fromSubmissionJson(json: SubmissionJson): Submission {
  return {
    id: json.id,
    code: json.code,
    extraFiles: json.extra_files,
    url: json.url,
    endpoint: json.endpoint,
    score: wireScoreToFloat(json.score),
    correct: json.correct,
    submissionStatus: json.submission_status,
    gradingStatus: json.grading_status,
    assignmentId: json.assignment_id,
    assignmentGroupId: json.assignment_group_id,
    assignmentVersion: json.assignment_version,
    courseId: json.course_id,
    userId: json.user_id,
    version: json.version,
    dateStarted: json.date_started,
    dateSubmitted: json.date_submitted ?? null,
    dateDue: json.date_due ?? null,
    dateLocked: json.date_locked ?? null,
    timeLimit: json.time_limit,
    feedback: json.feedback,
  };
}

export function toSubmissionJson(submission: Submission): SubmissionJson {
  return {
    id: submission.id,
    code: submission.code,
    extra_files: submission.extraFiles,
    url: submission.url,
    endpoint: submission.endpoint,
    score: floatScoreToWire(submission.score),
    correct: submission.correct,
    submission_status: submission.submissionStatus,
    grading_status: submission.gradingStatus,
    assignment_id: submission.assignmentId,
    assignment_group_id: submission.assignmentGroupId,
    assignment_version: submission.assignmentVersion,
    course_id: submission.courseId,
    user_id: submission.userId,
    version: submission.version,
    date_started: submission.dateStarted,
    date_submitted: submission.dateSubmitted,
    date_due: submission.dateDue,
    date_locked: submission.dateLocked,
    time_limit: submission.timeLimit,
    feedback: submission.feedback,
  };
}
