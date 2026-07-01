import { describe, expect, it } from "vitest";
import { BlockPyApiClient } from "../client";
import type { Transport } from "../client";
import { EventLog } from "../endpoints/events";

const ENVELOPE = {
    assignment_id: 1,
    assignment_group_id: null,
    course_id: 1,
    submission_id: 1,
    user_id: 1,
    version: 1,
};

interface FakeServer {
    transport: Transport;
    received: Record<string, string>[];
    failNext: (count: number) => void;
}

function makeFakeServer(): FakeServer {
    const received: Record<string, string>[] = [];
    let failures = 0;
    return {
        received,
        failNext: (count) => {
            failures = count;
        },
        transport: {
            post: (_route, params) => {
                if (failures > 0) {
                    failures -= 1;
                    return Promise.reject(new Error("offline"));
                }
                received.push(params);
                return Promise.resolve({ success: true, log_id: received.length });
            },
        },
    };
}

function makeEventLog() {
    const server = makeFakeServer();
    const client = new BlockPyApiClient(server.transport, () => ENVELOPE);
    return { events: new EventLog(client), server };
}

describe("EventLog", () => {
    it("sends queued events in order", async () => {
        const { events, server } = makeEventLog();
        events.log({ event_type: "Session.Start" });
        events.log({ event_type: "File.Edit", file_path: "answer.py" });
        await events.flush();

        expect(server.received.map((params) => params.event_type)).toEqual([
            "Session.Start",
            "File.Edit",
        ]);
        expect(events.pendingCount).toBe(0);
    });

    it("keeps failed events queued and retries on the next flush", async () => {
        const { events, server } = makeEventLog();
        server.failNext(1);
        events.log({ event_type: "Run.Program" });
        await events.flush();
        expect(events.pendingCount).toBe(1);

        await events.flush();
        expect(events.pendingCount).toBe(0);
        expect(server.received).toHaveLength(1);
    });

    it("never rejects from log()", async () => {
        const { events, server } = makeEventLog();
        server.failNext(5);
        expect(() => events.log({ event_type: "error" })).not.toThrow();
        await events.flush();
    });

    it("drops the oldest events beyond the queue bound", async () => {
        const { events, server } = makeEventLog();
        server.failNext(Number.MAX_SAFE_INTEGER);
        for (let i = 0; i < 150; i += 1) {
            events.log({ event_type: `event-${i}` });
        }
        // Allow in-flight flush attempts to settle before inspecting.
        await events.flush();
        expect(events.pendingCount).toBeLessThanOrEqual(100);
    });
});
