import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockPyApiClient, UrlMapTransport, deriveBaseUrl } from "../client";
import { loadActivityFromServer } from "../bootstrap";
import { makeAssignmentJson, makeSubmissionJson } from "../__fixtures__/wirePayloads";

const LEGACY_URLS = {
    loadAssignment: "https://think.cs.vt.edu/blockpy/load_assignment",
    saveFile: "https://think.cs.vt.edu/blockpy/save_file",
    logEvent: "https://think.cs.vt.edu/blockpy/log_event",
    updateSubmission: "https://think.cs.vt.edu/blockpy/update_submission",
};

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("deriveBaseUrl", () => {
    it("derives the server root from the loadAssignment URL", () => {
        expect(deriveBaseUrl(LEGACY_URLS)).toBe("https://think.cs.vt.edu/");
    });

    it("returns null when no known URL is present", () => {
        expect(deriveBaseUrl({ importDatasets: "https://corgis.example/" })).toBeNull();
    });
});

describe("UrlMapTransport", () => {
    it("posts mapped routes to the legacy URL", async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
        vi.stubGlobal("fetch", fetchMock);

        const transport = new UrlMapTransport(LEGACY_URLS, "token-123");
        await transport.post("blockpy/save_file", { filename: "answer.py" });

        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(LEGACY_URLS.saveFile);
        expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-123");
        expect(String(init.body)).toContain("filename=answer.py");
    });

    it("falls back to the derived base URL for unmapped routes", async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
        vi.stubGlobal("fetch", fetchMock);

        const transport = new UrlMapTransport(LEGACY_URLS);
        await transport.post("assignments/get_ids", { assignment_ids: "1,2" });

        const [url] = fetchMock.mock.calls[0] as [string];
        expect(String(url)).toBe("https://think.cs.vt.edu/assignments/get_ids");
    });

    it("fails clearly when a route has no URL and no base can be derived", async () => {
        const transport = new UrlMapTransport({ importDatasets: "https://corgis.example/" });
        await expect(transport.post("blockpy/load_history", {})).rejects.toMatchObject({
            kind: "network",
        });
    });
});

describe("loadActivityFromServer", () => {
    function makeClient(fetchMock: ReturnType<typeof vi.fn>): BlockPyApiClient {
        vi.stubGlobal("fetch", fetchMock);
        return new BlockPyApiClient(new UrlMapTransport(LEGACY_URLS), () => ({
            assignment_id: null,
            assignment_group_id: 9,
            course_id: 3,
            submission_id: null,
            user_id: 7,
            version: 0,
        }));
    }

    it("loads each task via load_assignment and maps to the domain", async () => {
        const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
            const params = new URLSearchParams(String(init.body));
            const id = Number(params.get("assignment_id"));
            return Promise.resolve(
                jsonResponse({
                    success: true,
                    assignment: makeAssignmentJson({ id, name: `Task ${id}` }),
                    submission: makeSubmissionJson({ id: 100 + id, assignment_id: id }),
                }),
            );
        });
        const client = makeClient(fetchMock);

        const loaded = await loadActivityFromServer(
            client,
            [
                { assignmentId: 11, policy: "" },
                { assignmentId: 12, policy: '{"require_previous": true}' },
            ],
            3,
        );

        expect(loaded).toHaveLength(2);
        expect(loaded[0].assignment.id).toBe(11);
        expect(loaded[0].submission?.id).toBe(111);
        expect(loaded[1].policy).toBe('{"require_previous": true}');
    });

    it("keeps a null submission when the server sends none", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                success: true,
                assignment: makeAssignmentJson({ id: 5 }),
                submission: null,
            }),
        );
        const client = makeClient(fetchMock);

        const loaded = await loadActivityFromServer(client, [{ assignmentId: 5, policy: "" }], 3);
        expect(loaded[0].submission).toBeNull();
    });

    it("rejects the whole bootstrap when any task fails", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({ success: true, assignment: makeAssignmentJson({ id: 1 }) }),
            )
            .mockResolvedValueOnce(jsonResponse({ success: false, message: "Not allowed" }));
        const client = makeClient(fetchMock);

        await expect(
            loadActivityFromServer(
                client,
                [
                    { assignmentId: 1, policy: "" },
                    { assignmentId: 2, policy: "" },
                ],
                3,
            ),
        ).rejects.toMatchObject({ message: "Not allowed" });
    });
});
