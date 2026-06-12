import type { BlockPyApiClient } from '../client';
import type { InstructorFilename, StudentFilename, SubmissionStatus } from '../types';

/**
 * save_file routes by filename class (docs/architecture/01 §2.2):
 * student filenames target a submission, instructor filenames an assignment.
 * The discriminated union makes it impossible to send the wrong id.
 */
export type SaveFileParams =
  | {
      kind: 'student';
      filename: StudentFilename;
      submissionId: number;
      code: string;
      partId?: string;
    }
  | {
      kind: 'instructor';
      filename: InstructorFilename;
      assignmentId: number;
      code: string;
    };

export interface SaveFileResult {
  /** Set when the server reports the assignment version drifted. */
  versionChange: boolean;
}

export async function saveFile(
  client: BlockPyApiClient,
  params: SaveFileParams,
): Promise<SaveFileResult> {
  const body =
    params.kind === 'student'
      ? await client.post('blockpy/save_file', {
          filename: params.filename,
          code: params.code,
          submission_id: params.submissionId,
          part_id: params.partId,
        })
      : await client.post('blockpy/save_file', {
          filename: params.filename,
          code: params.code,
          assignment_id: params.assignmentId,
        });
  return { versionChange: body.version_change === true };
}

export interface UpdateSubmissionParams {
  submissionId: number;
  /** Float in [0, 1]; converted to the wire's 0..100 integer here. */
  score: number;
  correct: boolean;
  forceUpdate?: boolean;
}

export interface UpdateSubmissionResult {
  submissionStatus: SubmissionStatus | null;
  correct: boolean;
  /** Per-question quiz feedback JSON, when the server regraded a quiz. */
  feedbacks: unknown;
}

export async function updateSubmission(
  client: BlockPyApiClient,
  params: UpdateSubmissionParams,
): Promise<UpdateSubmissionResult> {
  const body = await client.post('blockpy/update_submission', {
    submission_id: params.submissionId,
    score: Math.round(100 * params.score),
    correct: params.correct,
    force_update: params.forceUpdate,
  });
  return {
    submissionStatus:
      typeof body.submission_status === 'string'
        ? (body.submission_status as SubmissionStatus)
        : null,
    correct: body.correct === true,
    feedbacks: body.feedbacks ?? null,
  };
}

export async function updateSubmissionStatus(
  client: BlockPyApiClient,
  params: { submissionId: number; status: SubmissionStatus },
): Promise<void> {
  await client.post('blockpy/update_submission_status', {
    submission_id: params.submissionId,
    status: params.status,
  });
}
