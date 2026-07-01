import { describe, expect, it } from "vitest";
import { createActivityStore, focusedTask } from "../activityStore";
import { buildActivity } from "../../../domain/activity";
import { fromAssignmentJson } from "../../../domain/assignment";
import { blockpyAssignmentJson } from "../../../api/__fixtures__/wirePayloads";

function makeActivity() {
    const base = fromAssignmentJson(blockpyAssignmentJson);
    return buildActivity({ id: 9, name: "HW", category: "homework" }, [
        { assignment: { ...base, id: 1, name: "Warmup" }, position: 0, policy: "" },
        {
            assignment: { ...base, id: 2, name: "Main task" },
            position: 1,
            policy: '{"require_previous": true}',
        },
    ]);
}

describe("activityStore", () => {
    it("focuses the first task by default", () => {
        const store = createActivityStore(makeActivity());
        expect(store.getState().focusedTaskId).toBe(1);
        expect(focusedTask(store.getState())?.title).toBe("Warmup");
    });

    it("honors a requested initial focus only when navigation is allowed", () => {
        const blocked = createActivityStore(makeActivity(), { focusedTaskId: 2 });
        expect(blocked.getState().focusedTaskId).toBe(1);

        const allowed = createActivityStore(makeActivity(), {
            focusedTaskId: 2,
            statuses: { 1: "graded" },
        });
        expect(allowed.getState().focusedTaskId).toBe(2);
    });

    it("blocks focusTask when the policy gate fails and reports why", () => {
        const store = createActivityStore(makeActivity());
        const verdict = store.getState().focusTask(2);
        expect(verdict).toEqual({ allowed: false, reason: "Complete “Warmup” first." });
        expect(store.getState().focusedTaskId).toBe(1);
    });

    it("switches focus once earlier tasks are finished", () => {
        const store = createActivityStore(makeActivity());
        store.getState().setStatus(1, "complete");
        const verdict = store.getState().focusTask(2);
        expect(verdict.allowed).toBe(true);
        expect(store.getState().focusedTaskId).toBe(2);
    });
});
