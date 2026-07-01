// Main-thread facade over the engine worker (docs/architecture/05 §1).
// Owns the worker lifecycle, correlates messages by runId, enforces per-phase
// timeouts, and supports interrupt via worker termination + re-init
// (the SharedArrayBuffer path needs cross-origin isolation; Story 6.4).

import { DEFAULT_TIMEOUT_MS, PYODIDE_INDEX_URL } from "./protocol";
import type {
    FromWorker,
    InstructorFeedbackRaw,
    Phase,
    RunOutcome,
    RunRequest,
    ToWorker,
} from "./protocol";
import type { RuntimeFileMap } from "../vfs/types";

export type EngineStatus = "idle" | "loading" | "ready" | "running" | "restarting" | "failed";

export interface EngineStreamEvent {
    kind: "stdout" | "stderr" | "image" | "evaluate-result";
    text: string;
    runId: number;
}

export interface EngineListener {
    onStream?(event: EngineStreamEvent): void;
    onStatus?(status: EngineStatus): void;
}

export interface EngineRunResult {
    outcome: RunOutcome;
    feedback: InstructorFeedbackRaw | null;
}

/** Public engine surface; EngineHost is the worker-backed implementation. */
export interface EngineLike {
    subscribe(listener: EngineListener): () => void;
    run(
        phase: Phase,
        files: RuntimeFileMap,
        main: string,
        inputs: string[],
        options?: { timeoutMs?: number; context?: RunRequest["context"] },
    ): Promise<EngineRunResult>;
    evaluate(code: string, timeoutMs?: number): Promise<EngineRunResult>;
    interrupt(): void;
}

export interface WorkerLike {
    postMessage(message: ToWorker): void;
    terminate(): void;
    onmessage: ((event: MessageEvent<FromWorker>) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

function createEngineWorker(): WorkerLike {
    return new Worker(new URL("./worker/engine.worker.ts", import.meta.url), {
        type: "module",
    }) as unknown as WorkerLike;
}

interface PendingRun {
    runId: number;
    resolve(result: EngineRunResult): void;
    feedback: InstructorFeedbackRaw | null;
    timer: ReturnType<typeof setTimeout> | null;
}

export class EngineHost implements EngineLike {
    private readonly createWorker: WorkerFactory;
    private readonly indexUrl: string;
    private worker: WorkerLike | null = null;
    private readyPromise: Promise<void> | null = null;
    private readyResolve: (() => void) | null = null;
    private readyReject: ((error: Error) => void) | null = null;
    private pending: PendingRun | null = null;
    private nextRunId = 1;
    private statusValue: EngineStatus = "idle";
    private readonly listeners = new Set<EngineListener>();

    constructor(createWorker: WorkerFactory = createEngineWorker, indexUrl = PYODIDE_INDEX_URL) {
        this.createWorker = createWorker;
        this.indexUrl = indexUrl;
    }

    get status(): EngineStatus {
        return this.statusValue;
    }

    subscribe(listener: EngineListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** Lazily spawns the worker and loads Pyodide. Idempotent. */
    ensureReady(): Promise<void> {
        if (this.readyPromise) {
            return this.readyPromise;
        }
        this.setStatus("loading");
        this.worker = this.createWorker();
        this.worker.onmessage = (event) => this.handleMessage(event.data);
        this.readyPromise = new Promise<void>((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
        });
        this.worker.postMessage({ kind: "init", indexUrl: this.indexUrl });
        return this.readyPromise;
    }

    async run(
        phase: Phase,
        files: RuntimeFileMap,
        main: string,
        inputs: string[],
        options?: { timeoutMs?: number; context?: RunRequest["context"] },
    ): Promise<EngineRunResult> {
        await this.ensureReady();
        return this.dispatch((runId) => ({
            kind: "run",
            runId,
            phase,
            files,
            main,
            inputs,
            settings: { timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS },
            context: options?.context,
        }));
    }

    async evaluate(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<EngineRunResult> {
        await this.ensureReady();
        return this.dispatch((runId) => ({
            kind: "evaluate",
            runId,
            code,
            settings: { timeoutMs },
        }));
    }

    /** Kills the worker; any in-flight run resolves as terminated. */
    interrupt(): void {
        const pending = this.pending;
        this.teardown();
        this.setStatus("restarting");
        if (pending) {
            pending.resolve({ outcome: { status: "terminated" }, feedback: pending.feedback });
        }
    }

    dispose(): void {
        this.teardown();
        this.setStatus("idle");
    }

    private dispatch(
        build: (runId: number) => Extract<ToWorker, { kind: "run" | "evaluate" }>,
    ): Promise<EngineRunResult> {
        if (this.pending) {
            return Promise.resolve({
                outcome: {
                    status: "runtime-error",
                    error: {
                        type: "EngineBusy",
                        message: "A run is already in progress.",
                        traceback: "",
                        line: null,
                    },
                },
                feedback: null,
            });
        }
        const runId = this.nextRunId++;
        const message = build(runId);
        this.setStatus("running");
        return new Promise<EngineRunResult>((resolve) => {
            const timeoutMs = message.settings.timeoutMs;
            const timer =
                timeoutMs > 0
                    ? setTimeout(() => {
                          if (this.pending?.runId === runId) {
                              this.pending = null;
                              this.teardown();
                              this.setStatus("restarting");
                              resolve({ outcome: { status: "timeout" }, feedback: null });
                          }
                      }, timeoutMs)
                    : null;
            this.pending = {
                runId,
                feedback: null,
                timer,
                resolve: (result) => {
                    if (timer !== null) {
                        clearTimeout(timer);
                    }
                    resolve(result);
                },
            };
            this.worker?.postMessage(message);
        });
    }

    private handleMessage(message: FromWorker): void {
        switch (message.kind) {
            case "ready":
                this.setStatus("ready");
                this.readyResolve?.();
                break;
            case "stdout":
            case "stderr":
                this.emitStream({ kind: message.kind, text: message.text, runId: message.runId });
                break;
            case "image":
                this.emitStream({ kind: "image", text: message.png, runId: message.runId });
                break;
            case "evaluate-result":
                if (message.repr !== null) {
                    this.emitStream({
                        kind: "evaluate-result",
                        text: message.repr,
                        runId: message.runId,
                    });
                }
                break;
            case "feedback-raw":
                if (this.pending?.runId === message.runId) {
                    this.pending.feedback = message.payload;
                }
                break;
            case "result": {
                const pending = this.pending;
                if (pending?.runId === message.runId) {
                    this.pending = null;
                    this.setStatus("ready");
                    pending.resolve({ outcome: message.outcome, feedback: pending.feedback });
                }
                break;
            }
            case "fatal": {
                const pending = this.pending;
                this.pending = null;
                this.setStatus("failed");
                this.readyReject?.(new Error(message.message));
                this.readyPromise = null;
                pending?.resolve({
                    outcome: {
                        status: "runtime-error",
                        error: {
                            type: "EngineError",
                            message: message.message,
                            traceback: "",
                            line: null,
                        },
                    },
                    feedback: null,
                });
                break;
            }
        }
    }

    private emitStream(event: EngineStreamEvent): void {
        // Drop stale messages from older runs (docs/architecture/05 §1.1).
        if (this.pending && event.runId !== this.pending.runId) {
            return;
        }
        for (const listener of this.listeners) {
            listener.onStream?.(event);
        }
    }

    private setStatus(status: EngineStatus): void {
        this.statusValue = status;
        for (const listener of this.listeners) {
            listener.onStatus?.(status);
        }
    }

    private teardown(): void {
        if (this.pending?.timer != null) {
            clearTimeout(this.pending.timer);
        }
        this.pending = null;
        this.worker?.terminate();
        this.worker = null;
        this.readyPromise = null;
        this.readyResolve = null;
        this.readyReject = null;
    }
}
