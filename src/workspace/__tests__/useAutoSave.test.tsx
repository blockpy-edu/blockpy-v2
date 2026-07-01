import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { resolveBlockPyConfig } from "../../embed/config";
import { useAutoSave } from "../useAutoSave";
import { useWorkspace } from "../useWorkspace";
import { WorkspaceProvider } from "../WorkspaceProvider";

const OFFLINE_KEY = "blockpy.offline.478.7";

function setup() {
    const config = resolveBlockPyConfig({
        assignment: { id: "478", startingCode: "start = 1\n" },
        submission: { id: "9941", code: "print(1)\n" },
        user: { id: "7", courseId: "course-1" },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <WorkspaceProvider config={config}>{children}</WorkspaceProvider>
    );
    return renderHook(() => ({ autoSave: useAutoSave(20), workspace: useWorkspace() }), {
        wrapper,
    });
}

describe("useAutoSave", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("saves dirty files after the debounce period", async () => {
        const { result } = setup();
        const store = result.current.workspace.vfsStore;

        act(() => {
            store.getState().write("answer.py", "print(2)\n", "student");
        });
        expect(store.getState().dirty).toHaveProperty("student:answer.py");

        await waitFor(() => {
            expect(store.getState().dirty).toEqual({});
        });
        // The offline transport persisted the new code.
        const persisted = JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? "{}") as {
            tasks?: Array<{ submission?: { code?: string } }>;
        };
        expect(persisted.tasks?.[0]?.submission?.code).toBe("print(2)\n");
    });

    it("flushNow saves immediately without waiting for the debounce", async () => {
        const { result } = setup();
        const store = result.current.workspace.vfsStore;

        act(() => {
            store.getState().write("answer.py", "x = 3\n", "student");
        });
        await act(async () => {
            await result.current.autoSave.flushNow();
        });

        expect(store.getState().dirty).toEqual({});
    });

    it("reports no error after a successful save", async () => {
        const { result } = setup();
        const store = result.current.workspace.vfsStore;

        act(() => {
            store.getState().write("answer.py", "y = 4\n", "student");
        });
        await act(async () => {
            await result.current.autoSave.flushNow();
        });

        expect(result.current.autoSave.error).toBeNull();
        expect(result.current.autoSave.saving).toBe(false);
    });
});
