// Per-mount activity state (docs/architecture/03 §2.2): the loaded activity,
// the focused task, and per-task progress used by policy gating.

import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import { canNavigate } from "../../domain/activity";
import type { Activity, NavigationVerdict, TaskStatus } from "../../domain/activity";

export interface ActivityState {
    activity: Activity;
    focusedTaskId: number;
    statuses: Record<number, TaskStatus>;
    /** Runs the policy check; switches focus only when allowed. */
    focusTask(id: number): NavigationVerdict;
    setStatus(id: number, status: TaskStatus): void;
}

export type ActivityStore = StoreApi<ActivityState>;

export function createActivityStore(
    activity: Activity,
    initial: { focusedTaskId?: number; statuses?: Record<number, TaskStatus> } = {},
): ActivityStore {
    const fallbackId = activity.tasks[0]?.assignmentId ?? 0;
    const requestedId = initial.focusedTaskId;
    const statuses = initial.statuses ?? {};
    const focusedTaskId =
        requestedId !== undefined && canNavigate(activity, statuses, requestedId).allowed
            ? requestedId
            : fallbackId;

    return createStore<ActivityState>()((set, get) => ({
        activity,
        focusedTaskId,
        statuses,

        focusTask: (id) => {
            const state = get();
            const verdict = canNavigate(state.activity, state.statuses, id);
            if (verdict.allowed && id !== state.focusedTaskId) {
                set({ focusedTaskId: id });
            }
            return verdict;
        },

        setStatus: (id, status) =>
            set((state) => ({ statuses: { ...state.statuses, [id]: status } })),
    }));
}

export function focusedTask(state: ActivityState) {
    return (
        state.activity.tasks.find((task) => task.assignmentId === state.focusedTaskId) ??
        state.activity.tasks[0] ??
        null
    );
}
