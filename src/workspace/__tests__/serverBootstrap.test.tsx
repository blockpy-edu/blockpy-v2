import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveBlockPyConfig } from "../../embed/config";
import { legacySettingsToMountOptions } from "../../embed/legacy";
import { makeAssignmentJson, makeSubmissionJson } from "../../api/__fixtures__/wirePayloads";
import { WorkspaceProvider } from "../WorkspaceProvider";
import { focusedTask } from "../activity/activityStore";
import { useActivityState } from "../useWorkspace";

// The real editor panel pulls in Blockly, which jsdom cannot host.
vi.mock("../panels/EditorPanel", () => ({
    EditorPanel: () => <div>Mock editor surface</div>,
}));

const LEGACY_SETTINGS = {
    "attachment.point": "#blockpy-div",
    urls: {
        loadAssignment: "https://server.test/blockpy/load_assignment",
        saveFile: "https://server.test/blockpy/save_file",
        logEvent: "https://server.test/blockpy/log_event",
        updateSubmission: "https://server.test/blockpy/update_submission",
    },
    "user.id": 301,
    "user.role": "student",
    "user.course_id": 12,
    "user.group_id": 88,
    "group.name": "Week 3: Loops",
    "group.category": "homework",
    "group.assignments": [
        { id: 11, name: "Reading: loops", type: "reading" },
        { id: 13, name: "Code it", type: "blockpy" },
    ],
};

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

function Probe() {
    const activity = useActivityState((state) => state.activity);
    const focused = useActivityState(focusedTask);
    return (
        <div>
            <p>activity:{activity.name}</p>
            <p>tasks:{activity.tasks.map((task) => task.title).join("|")}</p>
            <p>focused:{focused?.title}</p>
        </div>
    );
}

describe("WorkspaceProvider server bootstrap", () => {
    beforeEach(() => {
        localStorage.clear();
        window.location.hash = "";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("loads a legacy-configured assignment group live from the server", async () => {
        const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
            const params = new URLSearchParams(String(init.body));
            const id = Number(params.get("assignment_id"));
            return Promise.resolve(
                jsonResponse({
                    success: true,
                    assignment: makeAssignmentJson({
                        id,
                        name: id === 11 ? "Reading: loops" : "Code it",
                        type: id === 11 ? "reading" : "blockpy",
                        instructions: id === 11 ? "# Loops\nRead this." : "Print 8.",
                    }),
                    submission: makeSubmissionJson({ id: 100 + id, assignment_id: id }),
                }),
            );
        });
        vi.stubGlobal("fetch", fetchMock);

        const config = resolveBlockPyConfig(legacySettingsToMountOptions(LEGACY_SETTINGS));
        render(
            <WorkspaceProvider config={config}>
                <Probe />
            </WorkspaceProvider>,
        );

        expect(screen.getByRole("status")).toHaveTextContent("Loading assignment…");

        expect(await screen.findByText("activity:Week 3: Loops")).toBeInTheDocument();
        expect(screen.getByText("tasks:Reading: loops|Code it")).toBeInTheDocument();
        expect(screen.getByText("focused:Reading: loops")).toBeInTheDocument();

        // Both group members were fetched through the legacy loadAssignment URL.
        const urls = fetchMock.mock.calls.map((call) => String(call[0]));
        expect(urls.every((url) => url === LEGACY_SETTINGS.urls.loadAssignment)).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("shows a retryable error when the server is unreachable", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        const config = resolveBlockPyConfig(legacySettingsToMountOptions(LEGACY_SETTINGS));
        render(
            <WorkspaceProvider config={config}>
                <Probe />
            </WorkspaceProvider>,
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
        expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("still resolves synchronously for offline mounts", () => {
        const config = resolveBlockPyConfig({ user: { courseId: "offline-course" } });
        render(
            <WorkspaceProvider config={config}>
                <Probe />
            </WorkspaceProvider>,
        );
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.getByText(/focused:/)).toBeInTheDocument();
    });
});
