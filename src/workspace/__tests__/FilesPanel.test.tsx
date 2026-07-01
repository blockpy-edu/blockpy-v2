import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { resolveBlockPyConfig } from "../../embed/config";
import { FilesPanel } from "../panels/FilesPanel";
import { useWorkspace } from "../useWorkspace";
import type { WorkspaceContextValue } from "../useWorkspace";
import { WorkspaceProvider } from "../WorkspaceProvider";

let workspace: WorkspaceContextValue;

function Probe() {
    const value = useWorkspace();
    useEffect(() => {
        workspace = value;
    }, [value]);
    return null;
}

function renderPanel() {
    const config = resolveBlockPyConfig({
        assignment: {
            id: "478",
            startingCode: "start = 1\n",
            extraFiles: { "data.csv": "a,b" },
        },
        submission: {
            id: "9941",
            code: "print(1)\n",
            extraFiles: { "notes.txt": "remember" },
        },
        user: { id: "7", courseId: "course-1" },
    });
    return render(
        <WorkspaceProvider config={config}>
            <Probe />
            <FilesPanel />
        </WorkspaceProvider>,
    );
}

describe("FilesPanel", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("groups files into namespace sections for students", () => {
        renderPanel();
        const nav = screen.getByRole("navigation", { name: "Files" });
        expect(within(nav).getByRole("heading", { name: "Your files" })).toBeInTheDocument();
        expect(within(nav).getByRole("heading", { name: "Starting files" })).toBeInTheDocument();
        expect(within(nav).getByRole("heading", { name: "Provided files" })).toBeInTheDocument();
        expect(within(nav).queryByRole("heading", { name: "Instructor files" })).toBeNull();

        expect(within(nav).getByRole("button", { name: /answer\.py/ })).toBeInTheDocument();
        expect(within(nav).getByRole("button", { name: /notes\.txt/ })).toBeInTheDocument();
    });

    it("marks provided files as read-only", () => {
        renderPanel();
        const dataRow = screen.getByRole("button", { name: /data\.csv/ });
        expect(within(dataRow).getByRole("img", { name: "Read-only" })).toBeInTheDocument();
    });

    it("opens a file when clicked", async () => {
        const user = userEvent.setup();
        renderPanel();

        await user.click(screen.getByRole("button", { name: /notes\.txt/ }));

        expect(workspace.vfsStore.getState().activeFileName).toBe("notes.txt");
        expect(screen.getByRole("button", { name: /notes\.txt/ })).toHaveAttribute(
            "aria-current",
            "true",
        );
    });

    it("shows a dirty indicator for unsaved files", () => {
        renderPanel();
        act(() => {
            workspace.vfsStore.getState().write("answer.py", "print(2)\n", "student");
        });
        const answerRow = screen.getByRole("button", { name: /answer\.py/ });
        expect(within(answerRow).getByRole("img", { name: "Unsaved changes" })).toBeInTheDocument();
    });

    it("resets student files to the starting code", async () => {
        const user = userEvent.setup();
        renderPanel();
        act(() => {
            workspace.vfsStore.getState().write("answer.py", "print(2)\n", "student");
        });

        await user.click(screen.getByRole("button", { name: "Reset to starting code" }));

        const answer = workspace.vfsStore
            .getState()
            .files.find((file) => file.namespace === "student" && file.name === "answer.py");
        expect(answer?.content).toBe("start = 1\n");
    });
});
