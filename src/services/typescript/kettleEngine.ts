// TypeScript (kettle) execution engine behind the same EngineLike surface as
// the Pyodide host, so RunCoordinator/feedback/grading are reused unchanged
// (docs/architecture/05 §1). Compilation happens on the main thread; the
// compiled JavaScript runs in a fresh blob Worker per run, matching the
// legacy kettle component's isolation model.

import { compileTypeScript } from "./compile";
import { DEFAULT_TIMEOUT_MS } from "../../engine/protocol";
import type {
    InstructorContext,
    InstructorFeedbackRaw,
    Phase,
    PythonErrorInfo,
    RunRequest,
} from "../../engine/protocol";
import type {
    EngineListener,
    EngineLike,
    EngineRunResult,
    EngineStreamEvent,
} from "../../engine/EngineHost";
import type { RuntimeFileMap } from "../../vfs/types";

/** Message protocol between KettleEngine and its worker harness. */
export type KettleWorkerJob = {
    js: string;
    instructor: boolean;
    context: InstructorContext | null;
};

export type KettleWorkerMessage =
    | { kind: "stdout"; text: string }
    | { kind: "stderr"; text: string }
    | { kind: "done"; error: { name: string; message: string; line: number | null } | null }
    | { kind: "feedback"; payload: InstructorFeedbackRaw };

export interface KettleWorkerLike {
    postMessage(job: KettleWorkerJob): void;
    terminate(): void;
    onmessage: ((event: MessageEvent<KettleWorkerMessage>) => void) | null;
}

export type KettleWorkerFactory = () => KettleWorkerLike;

/**
 * Runs inside the worker. Console output is proxied back as streams; the
 * instructor phase gets the same grading vocabulary as the Python shim
 * (student object + set_success/give_partial/gently/explain/compliment).
 * Exported so tests can execute it against a stubbed `self`.
 */
export const WORKER_HARNESS = `
self.onmessage = function (event) {
    var job = event.data;
    var post = function (message) { self.postMessage(message); };
    var stringify = function (parts) {
        return parts.map(function (part) {
            if (typeof part === "string") { return part; }
            try { return JSON.stringify(part); } catch (e) { return String(part); }
        }).join(" ");
    };
    var console_ = {
        log: function () { post({ kind: "stdout", text: stringify([].slice.call(arguments)) }); },
        info: function () { post({ kind: "stdout", text: stringify([].slice.call(arguments)) }); },
        warn: function () { post({ kind: "stderr", text: stringify([].slice.call(arguments)) }); },
        error: function () { post({ kind: "stderr", text: stringify([].slice.call(arguments)) }); },
        clear: function () {},
        table: function () { post({ kind: "stdout", text: stringify([].slice.call(arguments)) }); }
    };
    var feedback = { success: false, partial: 0, messages: [] };
    var globals = {
        console: console_,
        exports: {},
        module: { exports: {} },
        require: function () {
            throw new Error("Modules are not available in BlockPy TypeScript tasks.");
        }
    };
    if (job.instructor) {
        var context = job.context || {};
        globals.student = {
            code: context.studentCode || "",
            output: context.studentOutput || "",
            error: context.studentError || null
        };
        globals.set_success = function () { feedback.success = true; };
        globals.setSuccess = globals.set_success;
        globals.give_partial = function (amount) { feedback.partial += Number(amount) || 0; };
        globals.givePartial = globals.give_partial;
        var addMessage = function (kind) {
            return function (message, line) {
                feedback.messages.push({
                    kind: kind, label: "", message: String(message),
                    line: typeof line === "number" ? line : null
                });
            };
        };
        globals.gently = addMessage("gently");
        globals.explain = addMessage("explain");
        globals.compliment = addMessage("compliment");
    }
    var names = Object.keys(globals);
    var values = names.map(function (name) { return globals[name]; });
    try {
        var run = new Function(names.join(","), '"use strict";' + job.js);
        run.apply(null, values);
        if (job.instructor) { post({ kind: "feedback", payload: feedback }); }
        post({ kind: "done", error: null });
    } catch (error) {
        var line = null;
        if (error && typeof error.stack === "string") {
            var match = error.stack.match(/<anonymous>:(\\d+):\\d+/);
            if (match) {
                // new Function adds two lines of wrapper before user code.
                line = Math.max(1, parseInt(match[1], 10) - 2);
            }
        }
        post({
            kind: "done",
            error: {
                name: (error && error.name) || "Error",
                message: (error && error.message) || String(error),
                line: line
            }
        });
    }
};
`;

function createBlobWorker(): KettleWorkerLike {
    const blob = new Blob([WORKER_HARNESS], { type: "text/javascript" });
    return new Worker(URL.createObjectURL(blob)) as unknown as KettleWorkerLike;
}

function toErrorInfo(error: {
    name: string;
    message: string;
    line: number | null;
}): PythonErrorInfo {
    return {
        type: error.name,
        message: error.message,
        traceback: error.line === null ? error.message : `Line ${error.line}: ${error.message}`,
        line: error.line,
    };
}

export class KettleEngine implements EngineLike {
    private readonly createWorker: KettleWorkerFactory;
    private readonly listeners = new Set<EngineListener>();
    private active: KettleWorkerLike | null = null;
    private nextRunId = 1;

    constructor(createWorker: KettleWorkerFactory = createBlobWorker) {
        this.createWorker = createWorker;
    }

    subscribe(listener: EngineListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emitStream(event: EngineStreamEvent): void {
        for (const listener of this.listeners) {
            listener.onStream?.(event);
        }
    }

    async run(
        phase: Phase,
        files: RuntimeFileMap,
        main: string,
        _inputs: string[],
        options?: { timeoutMs?: number; context?: RunRequest["context"] },
    ): Promise<EngineRunResult> {
        const runId = this.nextRunId;
        this.nextRunId += 1;
        const source = files[main] ?? "";
        const compiled = await compileTypeScript(source);
        if (compiled.error) {
            return {
                outcome: {
                    status: "syntax-error",
                    error: {
                        type: "SyntaxError",
                        message: compiled.error.message,
                        traceback: compiled.error.message,
                        line: compiled.error.line,
                    },
                },
                feedback: null,
            };
        }

        const instructor = phase.startsWith("instructor.");
        const worker = this.createWorker();
        this.active = worker;
        const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        return new Promise<EngineRunResult>((resolve) => {
            let feedback: InstructorFeedbackRaw | null = null;
            let settled = false;
            const finish = (result: EngineRunResult) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timer !== null) {
                    clearTimeout(timer);
                }
                worker.terminate();
                if (this.active === worker) {
                    this.active = null;
                }
                resolve(result);
            };
            const timer =
                timeoutMs > 0
                    ? setTimeout(
                          () => finish({ outcome: { status: "timeout" }, feedback }),
                          timeoutMs,
                      )
                    : null;

            worker.onmessage = (event) => {
                const message = event.data;
                switch (message.kind) {
                    case "stdout":
                    case "stderr":
                        this.emitStream({ kind: message.kind, text: message.text, runId });
                        break;
                    case "feedback":
                        feedback = message.payload;
                        break;
                    case "done":
                        finish({
                            outcome: message.error
                                ? { status: "runtime-error", error: toErrorInfo(message.error) }
                                : { status: "success" },
                            feedback,
                        });
                        break;
                }
            };
            worker.postMessage({
                js: compiled.js,
                instructor,
                context: instructor ? (options?.context ?? null) : null,
            });
        });
    }

    async evaluate(): Promise<EngineRunResult> {
        return {
            outcome: {
                status: "runtime-error",
                error: {
                    type: "NotSupported",
                    message: "The console is not available for TypeScript tasks.",
                    traceback: "",
                    line: null,
                },
            },
            feedback: null,
        };
    }

    interrupt(): void {
        if (this.active) {
            this.active.terminate();
            this.active = null;
        }
    }
}
