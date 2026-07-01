import { describe, expect, it, vi } from "vitest";
import { ApiError, BlockPyApiClient, HttpTransport } from "../client";
import type { Transport } from "../client";

const ENVELOPE = {
    assignment_id: 478,
    assignment_group_id: 88,
    course_id: 12,
    submission_id: 9941,
    user_id: 301,
    version: 7,
};

function makeClient(respond: (route: string, params: Record<string, string>) => unknown) {
    const calls: { route: string; params: Record<string, string> }[] = [];
    const transport: Transport = {
        post: (route, params) => {
            calls.push({ route, params });
            return Promise.resolve(respond(route, params));
        },
    };
    return { client: new BlockPyApiClient(transport, () => ENVELOPE), calls };
}

describe("BlockPyApiClient", () => {
    it("injects the envelope plus timestamp and timezone into every request", async () => {
        const { client, calls } = makeClient(() => ({ success: true }));
        await client.post("blockpy/log_event", { event_type: "Session.Start" });

        const params = calls[0].params;
        expect(params.assignment_id).toBe("478");
        expect(params.course_id).toBe("12");
        expect(params.user_id).toBe("301");
        expect(params.event_type).toBe("Session.Start");
        expect(Number(params.timestamp)).toBeGreaterThan(0);
        expect(params.timezone).toBe(String(new Date().getTimezoneOffset()));
    });

    it("lets explicit params override envelope fields", async () => {
        const { client, calls } = makeClient(() => ({ success: true }));
        await client.post("blockpy/load_submission", { submission_id: 555 });
        expect(calls[0].params.submission_id).toBe("555");
    });

    it("omits null and undefined params from the form body", async () => {
        const { client, calls } = makeClient(() => ({ success: true }));
        await client.post("blockpy/save_file", { part_id: undefined, filename: "answer.py" });
        expect("part_id" in calls[0].params).toBe(false);
        expect(calls[0].params.filename).toBe("answer.py");
    });

    it("throws a typed server error when success is not true", async () => {
        const { client } = makeClient(() => ({ success: false, message: "No submission found" }));
        const failure = client.post("blockpy/load_assignment");
        await expect(failure).rejects.toBeInstanceOf(ApiError);
        await expect(failure).rejects.toMatchObject({
            kind: "server",
            message: "No submission found",
        });
    });

    it("throws a server error for malformed response bodies", async () => {
        const { client } = makeClient(() => "not json object");
        await expect(client.post("blockpy/load_assignment")).rejects.toMatchObject({
            kind: "server",
        });
    });
});

describe("HttpTransport", () => {
    it("maps 401/403 to auth errors", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 403 })));
        try {
            const transport = new HttpTransport("https://example.com/");
            await expect(transport.post("blockpy/load_assignment", {})).rejects.toMatchObject({
                kind: "auth",
                status: 403,
            });
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("maps network failures to network errors", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        try {
            const transport = new HttpTransport("https://example.com");
            await expect(transport.post("blockpy/load_assignment", {})).rejects.toMatchObject({
                kind: "network",
            });
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("form-encodes parameters and includes credentials", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        try {
            const transport = new HttpTransport("https://example.com");
            await transport.post("blockpy/save_file", { filename: "answer.py", code: "x = 1" });

            const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
            expect(url.toString()).toBe("https://example.com/blockpy/save_file");
            expect(init.credentials).toBe("include");
            expect(String(init.body)).toBe("filename=answer.py&code=x+%3D+1");
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
