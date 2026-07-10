// Live-server activity bootstrap (docs/architecture/02 §2): the drop-in
// replacement treats blockpy-server as the source of truth. Each activity
// task is fetched via blockpy/load_assignment (the same endpoint the legacy
// quizzer/reader/textbook/kettle components use), and the group's shape
// (order + policy) comes from the mount config the template renders.

import { loadAssignment } from "./endpoints/assignments";
import { fromAssignmentJson } from "../domain/assignment";
import { fromSubmissionJson } from "../domain/submission";
import type { BlockPyApiClient } from "./client";
import type { Assignment } from "../domain/assignment";
import type { Submission } from "../domain/submission";

export interface RemoteTaskRequest {
    assignmentId: number;
    /** Raw membership policy JSON rendered by the server template. */
    policy: string;
}

export interface LoadedTask {
    assignment: Assignment;
    /** null when the server has no submission (e.g. anonymous preview). */
    submission: Submission | null;
    policy: string;
}

/**
 * Loads every task of an activity from the server, in order. Requests run
 * in parallel; a single failure rejects the whole bootstrap so the caller
 * can show one retryable error instead of a half-loaded activity.
 */
export async function loadActivityFromServer(
    client: BlockPyApiClient,
    tasks: RemoteTaskRequest[],
    courseId: number | null,
): Promise<LoadedTask[]> {
    return Promise.all(
        tasks.map(async (task) => {
            const wire = await loadAssignment(client, {
                assignmentId: task.assignmentId,
                courseId: courseId ?? undefined,
            });
            return {
                assignment: fromAssignmentJson(wire.assignment),
                submission: wire.submission ? fromSubmissionJson(wire.submission) : null,
                policy: task.policy,
            };
        }),
    );
}
