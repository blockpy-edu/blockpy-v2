import { ApiError } from '../client';
import type { BlockPyApiClient } from '../client';
import type { AssignmentIdsJson, AssignmentJson, EditorInformationJson } from '../types';

export interface LoadAssignmentParams {
  assignmentId: number;
  courseId?: number;
  studentId?: number;
  forceQuiz?: boolean;
  withHistory?: boolean;
}

export async function loadAssignment(
  client: BlockPyApiClient,
  params: LoadAssignmentParams,
): Promise<EditorInformationJson> {
  const body = await client.post('blockpy/load_assignment', {
    assignment_id: params.assignmentId,
    course_id: params.courseId,
    student_id: params.studentId,
    force_quiz: params.forceQuiz,
    with_history: params.withHistory,
  });
  const assignment = body.assignment;
  if (typeof assignment !== 'object' || assignment === null) {
    throw new ApiError('server', 'blockpy/load_assignment', 'Missing assignment in response');
  }
  return {
    assignment: assignment as AssignmentJson,
    submission: (body.submission ?? null) as EditorInformationJson['submission'],
  };
}

export async function getAssignmentIds(
  client: BlockPyApiClient,
  params: { assignmentIds: number[]; courseId: number },
): Promise<AssignmentIdsJson> {
  const body = await client.post('assignments/get_ids', {
    assignment_ids: params.assignmentIds.join(','),
    course_id: params.courseId,
  });
  return {
    assignments: (body.assignments ?? []) as AssignmentJson[],
    groups: (body.groups ?? []) as AssignmentIdsJson['groups'],
    memberships: (body.memberships ?? []) as AssignmentIdsJson['memberships'],
    errors: (body.errors ?? []) as string[],
  };
}

export interface SaveAssignmentParams {
  assignmentId: number;
  name?: string;
  url?: string;
  hidden?: boolean;
  reviewed?: boolean;
  public?: boolean;
  ipRanges?: string;
  settings?: string;
  points?: number;
}

export async function saveAssignment(
  client: BlockPyApiClient,
  params: SaveAssignmentParams,
): Promise<void> {
  await client.post('blockpy/save_assignment', {
    assignment_id: params.assignmentId,
    name: params.name,
    url: params.url,
    hidden: params.hidden,
    reviewed: params.reviewed,
    public: params.public,
    ip_ranges: params.ipRanges,
    settings: params.settings,
    points: params.points,
  });
}
