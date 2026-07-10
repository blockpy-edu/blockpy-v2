import { describe, expect, it } from "vitest";
import { compileTypeScript } from "../compile";
import { KettleEngine, WORKER_HARNESS } from "../kettleEngine";
import type { KettleWorkerJob, KettleWorkerLike, KettleWorkerMessage } from "../kettleEngine";

/**
 * Executes the real worker harness synchronously against a stubbed `self`,
 * so tests cover the actual compile → execute → message pipeline without a
 * Worker (jsdom has none).
 */
function createHarnessWorker(): KettleWorkerLike {
    const worker: KettleWorkerLike & { self?: unknown } = {
        onmessage: null,
        postMessage(job: KettleWorkerJob) {
            const self = {
                onmessage: null as ((event: { data: KettleWorkerJob }) => void) | null,
                postMessage: (message: KettleWorkerMessage) => {
                    // Deliver asynchronously, like a real worker.
                    queueMicrotask(() => {
                        worker.onmessage?.({ data: message } as MessageEvent<KettleWorkerMessage>);
                    });
                },
            };
            new Function("self", WORKER_HARNESS)(self);
            self.onmessage?.({ data: job });
        },
        terminate() {},
    };
    return worker;
}

describe("compileTypeScript", () => {
    it("strips types and keeps runnable JavaScript", async () => {
        const result = await compileTypeScript("const x: number = 5;\nconsole.log(x * 2);");
        expect(result.error).toBeNull();
        expect(result.js).toContain("console.log(x * 2)");
        expect(result.js).not.toContain(": number");
    });

    it("reports the first syntax error with a line number", async () => {
        const result = await compileTypeScript("const x = ;\n");
        expect(result.error).not.toBeNull();
        expect(result.error?.line).toBe(1);
    });
});

describe("KettleEngine", () => {
    it("runs student TypeScript and streams console output", async () => {
        const engine = new KettleEngine(createHarnessWorker);
        const streams: string[] = [];
        engine.subscribe({ onStream: (event) => streams.push(`${event.kind}:${event.text}`) });

        const result = await engine.run(
            "student.run",
            { "answer.py": 'const greeting: string = "hello";\nconsole.log(greeting);' },
            "answer.py",
            [],
        );

        expect(result.outcome).toEqual({ status: "success" });
        expect(streams).toContain("stdout:hello");
    });

    it("returns a syntax-error outcome for invalid TypeScript", async () => {
        const engine = new KettleEngine(createHarnessWorker);
        const result = await engine.run(
            "student.run",
            { "answer.py": "const = ;" },
            "answer.py",
            [],
        );
        expect(result.outcome.status).toBe("syntax-error");
    });

    it("surfaces runtime errors with the error name", async () => {
        const engine = new KettleEngine(createHarnessWorker);
        const result = await engine.run(
            "student.run",
            { "answer.py": 'throw new RangeError("too big");' },
            "answer.py",
            [],
        );
        expect(result.outcome.status).toBe("runtime-error");
        if (result.outcome.status === "runtime-error") {
            expect(result.outcome.error.type).toBe("RangeError");
            expect(result.outcome.error.message).toBe("too big");
        }
    });

    it("collects instructor feedback via the grading vocabulary", async () => {
        const engine = new KettleEngine(createHarnessWorker);
        const onRun = [
            "if (student.output.indexOf('8') !== -1) {",
            "    set_success();",
            "    compliment('Nice work!');",
            "} else {",
            "    gently('Print the sum of 5 and 3.', 1);",
            "    give_partial(0.25);",
            "}",
        ].join("\n");

        const graded = await engine.run(
            "instructor.onRun",
            { "on_run.py": onRun },
            "on_run.py",
            [],
            {
                context: {
                    studentCode: "console.log(5 + 3);",
                    studentOutput: "8",
                    studentError: null,
                },
            },
        );

        expect(graded.outcome).toEqual({ status: "success" });
        expect(graded.feedback).toMatchObject({ success: true });
        expect(graded.feedback?.messages[0]).toMatchObject({
            kind: "compliment",
            message: "Nice work!",
        });
    });

    it("gives partial credit and gentle feedback on failure", async () => {
        const engine = new KettleEngine(createHarnessWorker);
        const graded = await engine.run(
            "instructor.onRun",
            { "on_run.py": "give_partial(0.5);\ngently('Almost there', 2);" },
            "on_run.py",
            [],
            { context: { studentCode: "", studentOutput: "", studentError: null } },
        );
        expect(graded.feedback).toMatchObject({ success: false, partial: 0.5 });
        expect(graded.feedback?.messages[0]).toMatchObject({
            kind: "gently",
            message: "Almost there",
            line: 2,
        });
    });

    it("times out runaway programs", async () => {
        const engine = new KettleEngine(() => ({
            onmessage: null,
            postMessage() {
                // Never responds — simulates an infinite loop.
            },
            terminate() {},
        }));
        const result = await engine.run(
            "student.run",
            { "answer.py": "while(true){}" },
            "answer.py",
            [],
            {
                timeoutMs: 20,
            },
        );
        expect(result.outcome).toEqual({ status: "timeout" });
    });

    it("declines console evaluation", async () => {
        const engine = new KettleEngine(createHarnessWorker);
        const result = await engine.evaluate();
        expect(result.outcome.status).toBe("runtime-error");
    });
});
