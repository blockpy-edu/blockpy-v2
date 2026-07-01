import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { resolveBlockPyConfig } from "../../embed/config";
import { ConsolePanel } from "../panels/ConsolePanel";
import { FeedbackPanel } from "../panels/FeedbackPanel";
import { useWorkspace } from "../useWorkspace";
import type { WorkspaceContextValue } from "../useWorkspace";
import { WorkspaceProvider } from "../WorkspaceProvider";
import { CATEGORY_PRIORITY } from "../../engine/feedback/categories";

let workspace: WorkspaceContextValue;

function Probe() {
    const value = useWorkspace();
    useEffect(() => {
        workspace = value;
    }, [value]);
    return null;
}

function renderPanels() {
    const config = resolveBlockPyConfig({
        assignment: { id: "478", startingCode: "" },
        submission: { id: "9941", code: "print(1)\n" },
        user: { id: "7", courseId: "course-1" },
    });
    return render(
        <WorkspaceProvider config={config}>
            <Probe />
            <ConsolePanel />
            <FeedbackPanel />
        </WorkspaceProvider>,
    );
}

describe("ConsolePanel", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows an empty hint before any run", () => {
        renderPanels();
        expect(screen.getByText(/Run your program to see its output/)).toBeInTheDocument();
    });

    it("renders streamed entries inside the log", () => {
        renderPanels();
        act(() => {
            const run = workspace.runStore.getState();
            run.append("separator", "Run 1 — 10:00", 1);
            run.append("stdout", "hello world", 1);
            run.append("stderr", "Traceback", 1);
        });
        const log = screen.getByRole("log", { name: "Program output" });
        expect(log).toHaveTextContent("hello world");
        expect(log).toHaveTextContent("Traceback");
        expect(log).toHaveTextContent("Run 1 — 10:00");
    });

    it("shows an input form when the program awaits input", () => {
        renderPanels();
        act(() => {
            const run = workspace.runStore.getState();
            run.setStatus("awaiting-input");
            run.setInputPrompt("What is your name?");
        });
        expect(screen.getByLabelText("What is your name?")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Enter" })).toBeInTheDocument();
    });

    it("disables the REPL while running", () => {
        renderPanels();
        const repl = screen.getByLabelText("Python console input");
        expect(repl).toBeEnabled();
        act(() => {
            workspace.runStore.getState().setStatus("running");
        });
        expect(repl).toBeDisabled();
    });
});

describe("FeedbackPanel", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("prompts to run before feedback exists", () => {
        renderPanels();
        expect(screen.getByText("Run your program to receive feedback.")).toBeInTheDocument();
    });

    it("renders feedback with category, message, and score", async () => {
        renderPanels();
        act(() => {
            workspace.runStore.getState().setFeedback({
                category: "instructor",
                label: "Almost there",
                message: "Use a loop instead.",
                priority: CATEGORY_PRIORITY.instructor,
                score: 0.5,
                correct: false,
                location: { file: "answer.py", line: 4 },
            });
        });
        expect(await screen.findByText("Instructor feedback")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Almost there" })).toBeInTheDocument();
        expect(screen.getByText("Use a loop instead.")).toBeInTheDocument();
        expect(screen.getByText("answer.py, line 4")).toBeInTheDocument();
        expect(screen.getByText("Score: 50%")).toBeInTheDocument();
    });

    it("typing in the REPL does not crash without an engine run", async () => {
        const user = userEvent.setup();
        renderPanels();
        const repl = screen.getByLabelText("Python console input");
        await user.type(repl, "1 + 1");
        expect(repl).toHaveValue("1 + 1");
    });
});
