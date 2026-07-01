import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineHost } from "../EngineHost";
import type { EngineStreamEvent, EngineStatus, WorkerLike } from "../EngineHost";
import type { FromWorker, ToWorker } from "../protocol";

class FakeWorker implements WorkerLike {
    onmessage: ((event: MessageEvent<FromWorker>) => void) | null = null;
    posted: ToWorker[] = [];
    terminated = false;

    postMessage(message: ToWorker): void {
        this.posted.push(message);
    }

    terminate(): void {
        this.terminated = true;
    }

    emit(message: FromWorker): void {
        this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
    }
}

function lastRunId(worker: FakeWorker): number {
    const message = worker.posted.at(-1);
    if (!message || message.kind === "init") {
        throw new Error("no run dispatched");
    }
    return message.runId;
}

describe("EngineHost", () => {
    let worker: FakeWorker;
    let host: EngineHost;

    beforeEach(() => {
        worker = new FakeWorker();
        host = new EngineHost(() => worker, "https://example.test/pyodide/");
    });

    afterEach(() => {
        host.dispose();
    });

    async function startRun() {
        const promise = host.run("student.run", { "answer.py": "print(1)" }, "answer.py", []);
        // Allow ensureReady to post init, then signal readiness.
        await Promise.resolve();
        worker.emit({ kind: "ready" });
        await Promise.resolve();
        await Promise.resolve();
        return promise;
    }

    it("initializes the worker lazily and resolves runs by runId", async () => {
        const promise = startRun();
        await Promise.resolve();
        expect(worker.posted[0]).toEqual({
            kind: "init",
            indexUrl: "https://example.test/pyodide/",
        });
        await Promise.resolve();
        const runId = lastRunId(worker);
        worker.emit({ kind: "result", runId, outcome: { status: "success" } });
        const result = await promise;
        expect(result.outcome).toEqual({ status: "success" });
        expect(result.feedback).toBeNull();
        expect(host.status).toBe("ready");
    });

    it("forwards streams for the active run and drops stale ones", async () => {
        const streams: EngineStreamEvent[] = [];
        host.subscribe({ onStream: (event) => streams.push(event) });
        const promise = startRun();
        await Promise.resolve();
        await Promise.resolve();
        const runId = lastRunId(worker);
        worker.emit({ kind: "stdout", runId, text: "hello" });
        worker.emit({ kind: "stdout", runId: runId + 99, text: "stale" });
        worker.emit({ kind: "result", runId, outcome: { status: "success" } });
        await promise;
        expect(streams.map((event) => event.text)).toEqual(["hello"]);
    });

    it("attaches instructor feedback delivered before the result", async () => {
        const promise = startRun();
        await Promise.resolve();
        await Promise.resolve();
        const runId = lastRunId(worker);
        const payload = { success: true, partial: 1, messages: [] };
        worker.emit({ kind: "feedback-raw", runId, payload });
        worker.emit({ kind: "result", runId, outcome: { status: "success" } });
        const result = await promise;
        expect(result.feedback).toEqual(payload);
    });

    it("rejects concurrent runs as busy", async () => {
        const first = startRun();
        await Promise.resolve();
        await Promise.resolve();
        const second = await host.run("student.run", {}, "answer.py", []);
        expect(second.outcome.status).toBe("runtime-error");
        if (second.outcome.status === "runtime-error") {
            expect(second.outcome.error.type).toBe("EngineBusy");
        }
        worker.emit({ kind: "result", runId: lastRunId(worker), outcome: { status: "success" } });
        await first;
    });

    it("terminates the worker when a run times out", async () => {
        vi.useFakeTimers();
        try {
            const promise = host.run("student.run", {}, "answer.py", [], { timeoutMs: 50 });
            await Promise.resolve();
            worker.emit({ kind: "ready" });
            await Promise.resolve();
            await Promise.resolve();
            vi.advanceTimersByTime(60);
            const result = await promise;
            expect(result.outcome).toEqual({ status: "timeout" });
            expect(worker.terminated).toBe(true);
            expect(host.status).toBe("restarting");
        } finally {
            vi.useRealTimers();
        }
    });

    it("interrupt resolves the pending run as terminated", async () => {
        const promise = startRun();
        await Promise.resolve();
        await Promise.resolve();
        host.interrupt();
        const result = await promise;
        expect(result.outcome).toEqual({ status: "terminated" });
        expect(worker.terminated).toBe(true);
        expect(host.status).toBe("restarting");
    });

    it("fatal worker errors fail the pending run and the engine", async () => {
        const statuses: EngineStatus[] = [];
        host.subscribe({ onStatus: (status) => statuses.push(status) });
        const promise = startRun();
        await Promise.resolve();
        await Promise.resolve();
        worker.emit({ kind: "fatal", message: "pyodide exploded" });
        const result = await promise;
        expect(result.outcome.status).toBe("runtime-error");
        if (result.outcome.status === "runtime-error") {
            expect(result.outcome.error.type).toBe("EngineError");
            expect(result.outcome.error.message).toBe("pyodide exploded");
        }
        expect(statuses.at(-1)).toBe("failed");
    });
});
