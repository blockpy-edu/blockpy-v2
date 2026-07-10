import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resolveBlockPyConfig } from "../../embed/config";
import { WorkspaceProvider } from "../WorkspaceProvider";
import { WorkspaceShell } from "../WorkspaceShell";

// The real editor panel pulls in Blockly, which needs DOM/canvas APIs that
// jsdom does not provide.
vi.mock("../panels/EditorPanel", () => ({
    EditorPanel: () => <div>Mock editor surface</div>,
}));

function renderShell(courseId = "course-1") {
    const config = resolveBlockPyConfig({ user: { courseId } });
    return render(
        <WorkspaceProvider config={config}>
            <WorkspaceShell />
        </WorkspaceProvider>,
    );
}

describe("WorkspaceShell", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("renders the classic preset panels", () => {
        renderShell();
        for (const title of ["Task", "Editor", "Console", "Feedback", "Files"]) {
            expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
        }
        expect(screen.getByText("Mock editor surface")).toBeInTheDocument();
    });

    it("switches layout when a preset is selected", async () => {
        const user = userEvent.setup();
        renderShell();

        await user.selectOptions(screen.getByLabelText("Layout"), "quiz");

        expect(screen.getByRole("heading", { name: "Task" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Feedback" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Editor" })).not.toBeInTheDocument();
    });

    it("collapses and expands a panel", async () => {
        const user = userEvent.setup();
        renderShell();

        const collapseButton = screen.getByRole("button", { name: "Collapse Console" });
        expect(collapseButton).toHaveAttribute("aria-expanded", "true");

        await user.click(collapseButton);
        const expandButton = screen.getByRole("button", { name: "Expand Console" });
        expect(expandButton).toHaveAttribute("aria-expanded", "false");

        await user.click(expandButton);
        expect(screen.getByRole("button", { name: "Collapse Console" })).toBeInTheDocument();
    });

    it("shows a single panel in fullscreen and exits again", async () => {
        const user = userEvent.setup();
        renderShell();

        await user.click(screen.getByRole("button", { name: "Fullscreen Feedback" }));

        expect(screen.getByRole("heading", { name: "Feedback" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Task" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Exit fullscreen Feedback" }));
        expect(screen.getByRole("heading", { name: "Task" })).toBeInTheDocument();
    });

    it("resizes panes with the keyboard via separators", async () => {
        const user = userEvent.setup();
        renderShell();

        const separator = screen.getAllByRole("separator")[0];
        const initialValue = Number(separator.getAttribute("aria-valuenow"));

        separator.focus();
        await user.keyboard("{ArrowRight}");

        expect(Number(separator.getAttribute("aria-valuenow"))).toBe(initialValue + 5);

        await user.keyboard("{ArrowLeft}{ArrowLeft}");
        expect(Number(separator.getAttribute("aria-valuenow"))).toBe(initialValue - 5);
    });

    it("clamps keyboard resizing at the minimum pane size", async () => {
        const user = userEvent.setup();
        renderShell();

        const separator = screen.getAllByRole("separator")[0];
        separator.focus();
        // Far more presses than needed to hit the 20% floor.
        for (let i = 0; i < 12; i += 1) {
            await user.keyboard("{ArrowLeft}");
        }
        expect(Number(separator.getAttribute("aria-valuenow"))).toBe(20);
    });

    it("restores the persisted preset on remount", async () => {
        const user = userEvent.setup();
        const { unmount } = renderShell("course-persist");
        await user.selectOptions(screen.getByLabelText("Layout"), "sideBySide");
        unmount();

        renderShell("course-persist");
        expect(screen.getByLabelText("Layout")).toHaveValue("sideBySide");
    });

    it("resets the layout to defaults", async () => {
        const user = userEvent.setup();
        renderShell();

        await user.selectOptions(screen.getByLabelText("Layout"), "quiz");
        await user.click(screen.getByRole("button", { name: "Reset layout" }));

        expect(screen.getByLabelText("Layout")).toHaveValue("classic");
        expect(screen.getByRole("heading", { name: "Editor" })).toBeInTheDocument();
    });

    it("labels panels as accessible regions", () => {
        renderShell();
        const taskPanel = screen.getByRole("region", { name: "Task" });
        // The default mount is a single code task named after the assignment.
        expect(
            within(taskPanel).getByRole("heading", { name: "Python Editor" }),
        ).toBeInTheDocument();
    });
});
