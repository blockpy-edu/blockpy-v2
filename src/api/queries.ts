import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fromAssignmentJson } from '../domain/assignment';
import { fromSubmissionJson } from '../domain/submission';
import { getAssignmentIds, loadAssignment } from './endpoints/assignments';
import type { LoadAssignmentParams } from './endpoints/assignments';
import { saveFile } from './endpoints/submissions';
import type { SaveFileParams, SaveFileResult } from './endpoints/submissions';
import { useApi } from './useApi';
import type { Assignment } from '../domain/assignment';
import type { Submission } from '../domain/submission';

// Reads go through TanStack Query for caching/invalidation; writes are
// imperative mutations that invalidate the relevant queries
// (docs/architecture/01 §3 rule 5).

export const queryKeys = {
  editor: (params: LoadAssignmentParams) =>
    [
      'blockpy',
      'editor',
      params.assignmentId,
      params.courseId ?? null,
      params.studentId ?? null,
    ] as const,
  assignmentIds: (assignmentIds: number[], courseId: number) =>
    ['blockpy', 'assignmentIds', assignmentIds.join(','), courseId] as const,
};

export interface EditorInformation {
  assignment: Assignment;
  submission: Submission | null;
}

export function useEditorInformation(params: LoadAssignmentParams, enabled = true) {
  const { client } = useApi();
  return useQuery<EditorInformation>({
    queryKey: queryKeys.editor(params),
    enabled,
    queryFn: async () => {
      const wire = await loadAssignment(client, params);
      return {
        assignment: fromAssignmentJson(wire.assignment),
        submission: wire.submission ? fromSubmissionJson(wire.submission) : null,
      };
    },
  });
}

export function useAssignmentIds(assignmentIds: number[], courseId: number, enabled = true) {
  const { client } = useApi();
  return useQuery({
    queryKey: queryKeys.assignmentIds(assignmentIds, courseId),
    enabled,
    queryFn: async () => {
      const wire = await getAssignmentIds(client, { assignmentIds, courseId });
      return {
        assignments: wire.assignments.map(fromAssignmentJson),
        groups: wire.groups,
        errors: wire.errors,
      };
    },
  });
}

export function useSaveFile() {
  const { client } = useApi();
  const queryClient = useQueryClient();
  return useMutation<SaveFileResult, Error, SaveFileParams>({
    mutationFn: (params) => saveFile(client, params),
    onSuccess: (_result, params) => {
      // Instructor saves bump the assignment version; refetch editor reads.
      if (params.kind === 'instructor') {
        void queryClient.invalidateQueries({ queryKey: ['blockpy', 'editor'] });
      }
    },
  });
}
