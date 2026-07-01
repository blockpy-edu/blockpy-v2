import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useStore } from "zustand";
import { ApiProvider } from "../api/ApiProvider";
import { BlockPyApiClient, HttpTransport } from "../api/client";
import type { Transport } from "../api/client";
import { createOfflineSeed, OfflineTransport } from "../api/offline";
import type { OfflineActivitySeed, OfflineSeed } from "../api/offline";
import { EventLog } from "../api/endpoints/events";
import type { AssignmentGroupCategory, AssignmentType } from "../api/types";
import { buildActivity, taskStatusFromSubmission } from "../domain/activity";
import type { ActivityMember, TaskStatus } from "../domain/activity";
import { fromAssignmentJson } from "../domain/assignment";
import { fromSubmissionJson } from "../domain/submission";
import { EngineHost } from "../engine/EngineHost";
import { serializeBundle } from "../vfs/bundle";
import type { SaveIds } from "../vfs/savePlan";
import type { VfsRole } from "../vfs/types";
import { createActivityStore, focusedTask } from "./activity/activityStore";
import type { ActivityStore } from "./activity/activityStore";
import { taskIdFromHash } from "./activity/deepLink";
import { createTaskRuntime } from "./activity/taskRuntime";
import type { TaskRuntime } from "./activity/taskRuntime";
import { createLayoutStore } from "./layout/layoutStore";
import type { LayoutPresetId } from "./layout/types";
import { RunCoordinator } from "./run/RunCoordinator";
import { createRunStore } from "./run/runStore";
import { WorkspaceContext } from "./useWorkspace";
import type { WorkspaceContextValue } from "./useWorkspace";
import type { BlockPyResolvedConfig } from "../types";
import type { TaskKind } from "../domain/activity";

interface WorkspaceProviderProps {
    config: BlockPyResolvedConfig;
    children: ReactNode;
}

function layoutStorageKey(config: BlockPyResolvedConfig): string {
    const courseId = config.initialState.user.courseId || "default";
    return `blockpy.layout.${courseId}`;
}

function parseId(value: string): number | null {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function vfsRoleFromConfig(config: BlockPyResolvedConfig): VfsRole {
    const role = config.initialState.user.role;
    return role === "instructor" || role === "ta" || role === "admin" ? "instructor" : "student";
}

function isOffline(config: BlockPyResolvedConfig): boolean {
    return !config.initialState.server.urls.base;
}

function bundleFromRecord(record: Record<string, string>): string {
    const entries = Object.entries(record).map(([filename, contents]) => ({
        filename,
        contents,
        extra: {},
    }));
    return entries.length > 0 ? serializeBundle(entries) : "";
}

const ASSIGNMENT_TYPES: readonly string[] = [
    "blockpy",
    "reading",
    "quiz",
    "maze",
    "textbook",
    "explain",
    "kettle",
];

function parseAssignmentType(raw: string | undefined): AssignmentType {
    return raw && ASSIGNMENT_TYPES.includes(raw) ? (raw as AssignmentType) : "blockpy";
}

const GROUP_CATEGORIES: readonly string[] = [
    "none",
    "exam",
    "homework",
    "classwork",
    "project",
    "quiz",
    "lab",
    "reading",
];

function parseGroupCategory(raw: string | undefined): AssignmentGroupCategory {
    return raw && GROUP_CATEGORIES.includes(raw) ? (raw as AssignmentGroupCategory) : "none";
}

/** Everything derived synchronously from the mount config's seed data. */
interface ActivitySetup {
    members: ActivityMember[];
    group: { id: number; name: string; category: AssignmentGroupCategory } | null;
    runtimes: Map<number, TaskRuntime>;
    statuses: Record<number, TaskStatus>;
    offlineSeed: OfflineSeed | OfflineActivitySeed;
    offlineStorageKey: string;
}

/**
 * In offline mode the transport seeds itself with id 1 when the mount has
 * no numeric ids; the save pipeline must address those same ids.
 */
function singleTaskSetup(config: BlockPyResolvedConfig): ActivitySetup {
    const { assignment, submission, user } = config.initialState;
    const fallback = isOffline(config) ? 1 : null;
    const saveIds: SaveIds = {
        submissionId: parseId(submission.id) ?? fallback,
        assignmentId: parseId(assignment.id) ?? fallback,
    };
    const onRun = assignment.instructorHooks.onRun;
    const seed = createOfflineSeed(
        {
            id: parseId(assignment.id) ?? 1,
            name: assignment.name,
            type: parseAssignmentType(assignment.type),
            instructions: assignment.instructions,
            url: assignment.url,
            points: assignment.points,
            starting_code: assignment.startingCode,
            on_run: typeof onRun === "string" ? onRun : "",
            extra_instructor_files: bundleFromRecord(assignment.extraFiles),
        },
        {
            id: parseId(submission.id) ?? 1,
            code: submission.code,
            extra_files: bundleFromRecord(submission.extraFiles),
            version: submission.version,
        },
    );
    const domainAssignment = fromAssignmentJson(seed.assignment);
    const domainSubmission = fromSubmissionJson(seed.submission);
    return {
        members: [{ assignment: domainAssignment, position: 0, policy: "" }],
        group: null,
        runtimes: new Map([
            [domainAssignment.id, createTaskRuntime(domainAssignment, domainSubmission, saveIds)],
        ]),
        statuses: {},
        offlineSeed: seed,
        offlineStorageKey: `blockpy.offline.${assignment.id || "default"}.${user.id || "anonymous"}`,
    };
}

function activitySetup(config: BlockPyResolvedConfig): ActivitySetup {
    const activity = config.initialState.activity;
    if (!activity) {
        return singleTaskSetup(config);
    }
    const { user } = config.initialState;
    const groupId = parseId(activity.id) ?? 1;
    const seeds: OfflineSeed[] = activity.tasks.map((task, index) => {
        const assignmentId = parseId(task.id) ?? index + 1;
        return createOfflineSeed(
            {
                id: assignmentId,
                name: task.name,
                type: parseAssignmentType(task.type),
                instructions: task.instructions ?? "",
                points: task.points ?? 1,
                starting_code: task.startingCode ?? "",
                on_run: task.onRun ?? "",
            },
            {
                id: parseId(task.submission?.id ?? "") ?? assignmentId,
                code: task.submission?.code ?? task.startingCode ?? "",
                assignment_id: assignmentId,
                assignment_group_id: groupId,
            },
        );
    });
    const memberships = activity.tasks.map((task, index) => ({
        id: index + 1,
        assignment_group_id: groupId,
        assignment_id: seeds[index].assignment.id,
        position: index,
        policy: task.policy ? JSON.stringify(task.policy) : "",
    }));

    const runtimes = new Map<number, TaskRuntime>();
    const statuses: Record<number, TaskStatus> = {};
    const members: ActivityMember[] = seeds.map((seed, index) => {
        const assignment = fromAssignmentJson(seed.assignment);
        const submission = fromSubmissionJson(seed.submission);
        runtimes.set(
            assignment.id,
            createTaskRuntime(assignment, submission, {
                submissionId: submission.id,
                assignmentId: assignment.id,
            }),
        );
        statuses[assignment.id] = taskStatusFromSubmission(submission, assignment.startingCode);
        return { assignment, position: index, policy: memberships[index].policy };
    });

    return {
        members,
        group: {
            id: groupId,
            name: activity.name,
            category: parseGroupCategory(activity.category),
        },
        runtimes,
        statuses,
        offlineSeed: {
            group: {
                id: groupId,
                name: activity.name,
                url: "",
                category: parseGroupCategory(activity.category),
                position: 0,
                forked_id: null,
                forked_version: null,
                owner_id: 0,
                course_id: 0,
                version: 1,
            },
            memberships,
            tasks: seeds,
        },
        offlineStorageKey: `blockpy.offline.group.${activity.id}.${user.id || "anonymous"}`,
    };
}

const PRESET_FOR_KIND: Record<TaskKind["type"], LayoutPresetId> = {
    code: "classic",
    reading: "reading",
    quiz: "quiz",
    explain: "reading",
    textbookPage: "reading",
    unsupported: "classic",
};

interface WorkspaceInstances {
    config: BlockPyResolvedConfig;
    activityStore: ActivityStore;
    runtimes: Map<number, TaskRuntime>;
    layoutStore: ReturnType<typeof createLayoutStore>;
    vfsRole: VfsRole;
    runStore: ReturnType<typeof createRunStore>;
    runCoordinator: RunCoordinator;
    apiClient: BlockPyApiClient;
    events: EventLog;
    queryClient: QueryClient;
}

function createInstances(config: BlockPyResolvedConfig): WorkspaceInstances {
    const setup = activitySetup(config);
    const activity = buildActivity(setup.group, setup.members);
    const activityStore = createActivityStore(activity, {
        focusedTaskId: taskIdFromHash(window.location.hash) ?? undefined,
        statuses: setup.statuses,
    });

    const focusedRuntime = (): TaskRuntime => {
        const { focusedTaskId } = activityStore.getState();
        const runtime = setup.runtimes.get(focusedTaskId) ?? setup.runtimes.values().next().value;
        if (!runtime) {
            throw new Error("Workspace has no tasks");
        }
        return runtime;
    };

    const { user, submission } = config.initialState;
    const baseUrl = config.initialState.server.urls.base;
    const transport: Transport = baseUrl
        ? new HttpTransport(baseUrl)
        : new OfflineTransport(setup.offlineSeed, setup.offlineStorageKey);
    const apiClient = new BlockPyApiClient(transport, () => ({
        assignment_id: focusedRuntime().saveIds.assignmentId,
        assignment_group_id: activity.groupId ?? parseId(user.groupId),
        course_id: parseId(user.courseId),
        submission_id: focusedRuntime().saveIds.submissionId,
        user_id: parseId(user.id),
        version: submission.version,
    }));
    const events = new EventLog(apiClient);
    const runStore = createRunStore();
    const runCoordinator = new RunCoordinator({
        engine: new EngineHost(),
        getRuntime: focusedRuntime,
        runStore,
        client: apiClient,
        events,
        onGraded: (_score, correct) => {
            const state = activityStore.getState();
            state.setStatus(state.focusedTaskId, correct ? "graded" : "inProgress");
        },
    });

    return {
        config,
        activityStore,
        runtimes: setup.runtimes,
        layoutStore: createLayoutStore(layoutStorageKey(config)),
        vfsRole: vfsRoleFromConfig(config),
        runStore,
        runCoordinator,
        apiClient,
        events,
        queryClient: new QueryClient({
            defaultOptions: {
                queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
            },
        }),
    };
}

export function WorkspaceProvider({ config, children }: WorkspaceProviderProps) {
    // Stores and clients are created once per mount so multiple BlockPy
    // instances can coexist on a single page (docs/architecture/03 §1).
    const [instances] = useState<WorkspaceInstances>(() => createInstances(config));
    const { activityStore, layoutStore, runtimes } = instances;
    const focusedTaskId = useStore(activityStore, (state) => state.focusedTaskId);
    const multiTask = useStore(activityStore, (state) => state.activity.tasks.length > 1);

    const value = useMemo<WorkspaceContextValue>(() => {
        const runtime = runtimes.get(focusedTaskId) ?? runtimes.values().next().value;
        if (!runtime) {
            throw new Error("Workspace has no tasks");
        }
        return {
            config: instances.config,
            layoutStore: instances.layoutStore,
            activityStore: instances.activityStore,
            vfsStore: runtime.vfsStore,
            vfsRole: instances.vfsRole,
            saveIds: runtime.saveIds,
            runStore: instances.runStore,
            runCoordinator: instances.runCoordinator,
        };
    }, [instances, runtimes, focusedTaskId]);

    // Deep links: focused task ↔ #task=<id> (multi-task mounts only).
    useEffect(() => {
        if (!multiTask) {
            return;
        }
        const expected = `#task=${focusedTaskId}`;
        if (window.location.hash !== expected) {
            window.location.hash = expected;
        }
        const onHashChange = () => {
            const requested = taskIdFromHash(window.location.hash);
            if (requested === null || requested === activityStore.getState().focusedTaskId) {
                return;
            }
            const verdict = activityStore.getState().focusTask(requested);
            if (!verdict.allowed) {
                // Restore the hash for the task that stays focused.
                window.location.hash = `#task=${activityStore.getState().focusedTaskId}`;
            }
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, [activityStore, focusedTaskId, multiTask]);

    // Preset auto-switching: follow the focused task kind unless the user
    // pinned a preset from the toolbar (docs/architecture/02 §3.2).
    useEffect(() => {
        const task = focusedTask(activityStore.getState());
        if (!task) {
            return;
        }
        const layout = layoutStore.getState();
        const target = PRESET_FOR_KIND[task.kind.type];
        if (!layout.presetPinned && layout.presetId !== target) {
            layout.setPreset(target);
        }
    }, [activityStore, layoutStore, focusedTaskId]);

    return (
        <QueryClientProvider client={instances.queryClient}>
            <ApiProvider client={instances.apiClient} events={instances.events}>
                <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
            </ApiProvider>
        </QueryClientProvider>
    );
}
