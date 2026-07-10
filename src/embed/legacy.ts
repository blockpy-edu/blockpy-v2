// Drop-in adapter for the legacy blockpy-server mount contract.
// blockpy-server templates instantiate the editor as
//   new blockpy.BlockPy({'attachment.point': ..., 'urls': window.$blockPyUrls,
//                        'user.id': ..., 'display.instructor': ..., ...})
// (templates/blockpy/editor.html). This module accepts that dotted-key
// config, converts it to BlockPyMountOptions, and mounts the v2 workspace.

import { mountBlockPy } from "../mount";
import type { BlockPyMountHandle } from "../mount";
import type { BlockPyActivityTaskConfig, BlockPyMountOptions, UserRole } from "../types";

/** The dotted-key settings object the legacy templates construct. */
export type LegacyBlockPySettings = Record<string, unknown>;

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
    student: "learner",
    owner: "instructor",
    instructor: "instructor",
    grader: "ta",
    anonymous: "guest",
};

function asString(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return "";
}

function asUrlMap(value: unknown): Record<string, string> {
    if (typeof value !== "object" || value === null) {
        return {};
    }
    const urls: Record<string, string> = {};
    for (const [key, url] of Object.entries(value)) {
        if (typeof url === "string" && url) {
            urls[key] = url;
        }
    }
    return urls;
}

/**
 * Group members for the activity rail. The legacy template can render
 * `'group.assignments': [{id, name, type}, ...]` from
 * parse_assignment_load's assignments list; each becomes a remote task.
 */
function asGroupTasks(value: unknown): BlockPyActivityTaskConfig[] | null {
    if (!Array.isArray(value)) {
        return null;
    }
    const tasks: BlockPyActivityTaskConfig[] = [];
    for (const entry of value) {
        if (typeof entry !== "object" || entry === null) {
            continue;
        }
        const record = entry as Record<string, unknown>;
        const id = asString(record.id);
        if (!id) {
            continue;
        }
        tasks.push({
            id,
            name: asString(record.name) || `Task ${tasks.length + 1}`,
            type: asString(record.type) || undefined,
        });
    }
    return tasks.length > 0 ? tasks : null;
}

/** Converts the legacy dotted-key settings into v2 mount options. */
export function legacySettingsToMountOptions(settings: LegacyBlockPySettings): BlockPyMountOptions {
    const rawRole = asString(settings["user.role"]).toLowerCase();
    const instructorFlag = settings["display.instructor"] === true;
    const role: UserRole = instructorFlag
        ? "instructor"
        : (LEGACY_ROLE_MAP[rawRole] ?? rawRole ?? "learner");

    const groupId =
        asString(settings["user.group_id"]) || asString(settings["assignment_group_id"]);
    const assignmentId =
        asString(settings["assignment.id"]) || asString(settings["current.assignment_id"]);
    const groupTasks = asGroupTasks(settings["group.assignments"]);
    const markCorrect = settings["callback.success"];

    const options: BlockPyMountOptions = {
        user: {
            id: asString(settings["user.id"]),
            name: asString(settings["user.name"]) || undefined,
            role,
            courseId: asString(settings["user.course_id"]),
            groupId,
        },
        assignment: assignmentId ? { id: assignmentId } : undefined,
        submission: {
            id: asString(settings["submission.id"]) || undefined,
        },
        display: {
            readOnly: settings["display.read_only"] === true,
        },
        server: {
            urls: asUrlMap(settings["urls"]),
            accessToken: asString(settings["access_token"]),
        },
        callbacks:
            typeof markCorrect === "function"
                ? {
                      onTaskCorrect: (id: number) =>
                          (markCorrect as (assignmentId: number) => void)(id),
                  }
                : undefined,
    };

    if (groupTasks) {
        options.activity = {
            id: groupId || "0",
            name: asString(settings["group.name"]) || "Assignment group",
            category: asString(settings["group.category"]) || undefined,
            tasks: groupTasks,
        };
    }

    return options;
}

/**
 * Drop-in replacement for the legacy global `blockpy.BlockPy` class.
 * Accepts the same settings object the blockpy-server templates build.
 */
export class BlockPy {
    private readonly handle: BlockPyMountHandle;

    constructor(settings: LegacyBlockPySettings = {}) {
        const selector = asString(settings["attachment.point"]) || "#blockpy-div";
        const node = document.querySelector(selector);
        if (!node) {
            throw new Error(`BlockPy attachment point "${selector}" was not found`);
        }
        this.handle = mountBlockPy(node, legacySettingsToMountOptions(settings));
    }

    destroy(): void {
        this.handle.unmount();
    }
}

declare global {
    interface Window {
        blockpy?: {
            BlockPy: typeof BlockPy;
            mountBlockPy: typeof mountBlockPy;
        };
    }
}

/** Exposes the legacy global so existing templates keep working unchanged. */
export function registerBlockPyGlobal(): void {
    window.blockpy = { BlockPy, mountBlockPy };
}
