// Per-task workspace runtime (docs/architecture/03 §2.3): each activity task
// owns its own VFS and save ids, created once per mount.

import { buildVfsFiles } from "../../vfs/vfs";
import { createVfsStore } from "../../vfs/vfsStore";
import type { VfsStore } from "../../vfs/vfsStore";
import type { SaveIds } from "../../vfs/savePlan";
import type { Assignment } from "../../domain/assignment";
import type { Submission } from "../../domain/submission";

export interface TaskRuntime {
    taskId: number;
    vfsStore: VfsStore;
    saveIds: SaveIds;
}

export function createTaskRuntime(
    assignment: Assignment,
    submission: Submission,
    saveIds: SaveIds,
): TaskRuntime {
    return {
        taskId: assignment.id,
        vfsStore: createVfsStore(buildVfsFiles(assignment, submission)),
        saveIds,
    };
}

export type TaskRuntimeMap = ReadonlyMap<number, TaskRuntime>;
