/**
 * This module is responsible for resolving and sanitizing the BlockPy configuration options.
 */

import type {
    BlockPyInitialState,
    BlockPyMountOptions,
    BlockPyResolvedConfig,
    BlockPyRunContext,
} from "../types";

const DEFAULT_STATE: BlockPyInitialState = {
    user: {
        id: "",
        name: "Learner",
        role: "learner",
        courseId: "",
        groupId: "",
    },
    assignment: {
        id: "",
        name: "Python Editor",
        instructions: "Write Python code using blocks or text. Click Run to execute.".repeat(10),
        url: "",
        type: "practice",
        points: 0,
        visibilityFlags: {
            showInstructions: true,
            showPoints: false,
            showSamples: false,
            showFeedback: true,
        },
        settings: {},
        startingCode: "x = 5\nprint(x)\n",
        instructorHooks: {},
        tags: [],
        sampleSubmissions: [],
        extraFiles: {},
    },
    submission: {
        id: "",
        code: "",
        extraFiles: {},
        score: null,
        correctness: null,
        status: "draft",
        ownerId: "",
        endpoint: "",
        version: 1,
    },
    display: {
        readOnly: false,
        sizingMode: "stretch",
    },
    runtime: {
        partId: "",
        executionTimeoutMs: 10000,
        expectedOutput: null,
        settings: {},
    },
    server: {
        urls: {},
        accessToken: "",
    },
    activity: null,
};

function sanitizeStringRecord(
    record: Record<string, string | undefined> | undefined,
): Record<string, string> {
    if (!record) {
        return {};
    }

    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === "string") {
            output[key] = value;
        }
    }
    return output;
}

function cloneDefaultState(): BlockPyInitialState {
    return {
        user: { ...DEFAULT_STATE.user },
        assignment: {
            ...DEFAULT_STATE.assignment,
            visibilityFlags: { ...DEFAULT_STATE.assignment.visibilityFlags },
            settings: { ...DEFAULT_STATE.assignment.settings },
            instructorHooks: { ...DEFAULT_STATE.assignment.instructorHooks },
            tags: [...DEFAULT_STATE.assignment.tags],
            sampleSubmissions: [...DEFAULT_STATE.assignment.sampleSubmissions],
            extraFiles: { ...DEFAULT_STATE.assignment.extraFiles },
        },
        submission: {
            ...DEFAULT_STATE.submission,
            extraFiles: { ...DEFAULT_STATE.submission.extraFiles },
        },
        display: { ...DEFAULT_STATE.display },
        runtime: {
            ...DEFAULT_STATE.runtime,
            settings: { ...DEFAULT_STATE.runtime.settings },
        },
        server: {
            ...DEFAULT_STATE.server,
            urls: { ...DEFAULT_STATE.server.urls },
        },
        activity: null,
    };
}

export function resolveBlockPyConfig(options: BlockPyMountOptions = {}): BlockPyResolvedConfig {
    const initialState = cloneDefaultState();

    initialState.user = {
        ...initialState.user,
        ...(options.user ?? {}),
    };

    initialState.assignment = {
        ...initialState.assignment,
        ...(options.assignment ?? {}),
        visibilityFlags: {
            ...initialState.assignment.visibilityFlags,
            ...(options.assignment?.visibilityFlags ?? {}),
        },
        settings: {
            ...initialState.assignment.settings,
            ...(options.assignment?.settings ?? {}),
        },
        instructorHooks: {
            ...initialState.assignment.instructorHooks,
            ...(options.assignment?.instructorHooks ?? {}),
        },
        tags: options.assignment?.tags
            ? options.assignment.tags.filter((tag): tag is string => typeof tag === "string")
            : [...initialState.assignment.tags],
        sampleSubmissions: options.assignment?.sampleSubmissions
            ? options.assignment.sampleSubmissions.map((sample) => ({
                  id: sample.id ?? "",
                  code: sample.code ?? "",
                  score: sample.score ?? null,
                  correctness: sample.correctness ?? null,
              }))
            : [...initialState.assignment.sampleSubmissions],
        extraFiles: {
            ...initialState.assignment.extraFiles,
            ...sanitizeStringRecord(options.assignment?.extraFiles),
        },
    };

    initialState.submission = {
        ...initialState.submission,
        ...(options.submission ?? {}),
        extraFiles: {
            ...initialState.submission.extraFiles,
            ...sanitizeStringRecord(options.submission?.extraFiles),
        },
    };

    initialState.display = {
        ...initialState.display,
        ...(options.display ?? {}),
    };

    initialState.runtime = {
        ...initialState.runtime,
        ...(options.runtime ?? {}),
        settings: {
            ...initialState.runtime.settings,
            ...(options.runtime?.settings ?? {}),
        },
    };

    initialState.server = {
        ...initialState.server,
        ...(options.server ?? {}),
        urls: {
            ...initialState.server.urls,
            ...sanitizeStringRecord(options.server?.urls),
        },
    };

    if (options.activity && options.activity.tasks.length > 0) {
        initialState.activity = {
            id: options.activity.id,
            name: options.activity.name,
            category: options.activity.category,
            tasks: options.activity.tasks.map((task, index) => ({
                ...task,
                id: task.id || String(index + 1),
            })),
        };
    }

    if (!initialState.submission.code) {
        initialState.submission.code = initialState.assignment.startingCode;
    }

    return {
        initialState,
        callbacks: options.callbacks ?? {},
    };
}

/**
 * TODO: Suspicious of whatever this is.
 * @param context
 * @param config
 * @returns
 */
export function isCorrectRun(context: BlockPyRunContext, config: BlockPyResolvedConfig): boolean {
    const callbackOutcome = config.callbacks.isCorrectRun?.(context);
    if (typeof callbackOutcome === "boolean") {
        return callbackOutcome;
    }

    const hasRuntimeErrors = Boolean(context.result.error) || Boolean(context.result.stderr);
    if (hasRuntimeErrors || context.parseErrors.length > 0) {
        return false;
    }

    const expectedOutput = context.state.runtime.expectedOutput;
    if (typeof expectedOutput === "string" && expectedOutput.length > 0) {
        return context.result.stdout.trim() === expectedOutput.trim();
    }

    const knownCorrectness = context.state.submission.correctness;
    if (knownCorrectness !== null) {
        return knownCorrectness;
    }

    return true;
}
