import { describe, expect, it } from "vitest";
import {
    activityFromSingleAssignment,
    buildActivity,
    canNavigate,
    parseMembershipPolicy,
    taskKindFromAssignment,
    taskStatusFromSubmission,
} from "../activity";
import type { TaskStatus } from "../activity";
import { fromAssignmentJson } from "../assignment";
import { fromSubmissionJson } from "../submission";
import { blockpyAssignmentJson, submissionJson } from "../../api/__fixtures__/wirePayloads";
import type { Assignment } from "../assignment";
import type { AssignmentType } from "../../api/types";

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
    return { ...fromAssignmentJson(blockpyAssignmentJson), ...overrides };
}

describe("parseMembershipPolicy", () => {
    it("parses require_previous and keeps unknown keys", () => {
        const policy = parseMembershipPolicy('{"require_previous": true, "weight": 2}');
        expect(policy.requirePrevious).toBe(true);
        expect(policy.extra).toEqual({ weight: 2 });
    });

    it("returns the default for empty or malformed JSON", () => {
        expect(parseMembershipPolicy("").requirePrevious).toBe(false);
        expect(parseMembershipPolicy("not json").requirePrevious).toBe(false);
        expect(parseMembershipPolicy("[1]").requirePrevious).toBe(false);
    });
});

describe("taskKindFromAssignment", () => {
    it.each([
        ["blockpy", "code"],
        ["reading", "reading"],
        ["quiz", "quiz"],
        ["explain", "explain"],
        ["textbook", "textbookPage"],
        ["maze", "unsupported"],
    ] as Array<[AssignmentType, string]>)("maps %s to %s", (wireType, kindType) => {
        const kind = taskKindFromAssignment(makeAssignment({ type: wireType }));
        expect(kind.type).toBe(kindType);
    });

    it("parses settings for code tasks", () => {
        const kind = taskKindFromAssignment(
            makeAssignment({ type: "blockpy", settings: '{"startView": "text"}' }),
        );
        expect(kind).toMatchObject({ type: "code", settings: { startView: "text" } });
    });
});

describe("buildActivity", () => {
    it("orders tasks by membership position", () => {
        const first = makeAssignment({ id: 10, name: "First" });
        const second = makeAssignment({ id: 20, name: "Second" });
        const activity = buildActivity({ id: 5, name: "Homework 1", category: "homework" }, [
            { assignment: second, position: 1, policy: "" },
            { assignment: first, position: 0, policy: "" },
        ]);
        expect(activity.groupId).toBe(5);
        expect(activity.tasks.map((task) => task.title)).toEqual(["First", "Second"]);
    });

    it("treats a standalone assignment as a group of one", () => {
        const activity = activityFromSingleAssignment(makeAssignment({ name: "Solo" }));
        expect(activity.groupId).toBeNull();
        expect(activity.name).toBe("Solo");
        expect(activity.tasks).toHaveLength(1);
    });
});

describe("taskStatusFromSubmission", () => {
    // Neutral baseline: the fixture submission is completed and graded.
    const submission = {
        ...fromSubmissionJson(submissionJson),
        code: "",
        score: 0,
        correct: false,
        submissionStatus: "Started" as const,
        gradingStatus: "NotReady" as const,
    };

    it("is untouched without a submission or progress", () => {
        expect(taskStatusFromSubmission(null)).toBe("untouched");
        expect(taskStatusFromSubmission(submission)).toBe("untouched");
    });

    it("is inProgress once there is code or a partial score", () => {
        expect(taskStatusFromSubmission({ ...submission, code: "x = 1" })).toBe("inProgress");
        expect(taskStatusFromSubmission({ ...submission, code: "", score: 0.5 })).toBe(
            "inProgress",
        );
    });

    it("stays untouched while the code matches the starting code", () => {
        expect(taskStatusFromSubmission({ ...submission, code: "x = 1" }, "x = 1")).toBe(
            "untouched",
        );
    });

    it("is complete when submitted and graded when correct", () => {
        expect(taskStatusFromSubmission({ ...submission, submissionStatus: "Submitted" })).toBe(
            "complete",
        );
        expect(taskStatusFromSubmission({ ...submission, correct: true })).toBe("graded");
    });
});

describe("canNavigate", () => {
    const gated = buildActivity({ id: 1, name: "HW", category: "homework" }, [
        { assignment: makeAssignment({ id: 1, name: "Intro" }), position: 0, policy: "" },
        {
            assignment: makeAssignment({ id: 2, name: "Challenge" }),
            position: 1,
            policy: '{"require_previous": true}',
        },
    ]);

    it("blocks a require_previous task until earlier tasks are finished", () => {
        const verdict = canNavigate(gated, {}, 2);
        expect(verdict).toEqual({ allowed: false, reason: "Complete “Intro” first." });
    });

    it("allows the task once previous tasks are complete or graded", () => {
        const statuses: Record<number, TaskStatus> = { 1: "graded" };
        expect(canNavigate(gated, statuses, 2)).toEqual({ allowed: true });
    });

    it("rejects ids outside the activity", () => {
        expect(canNavigate(gated, {}, 99).allowed).toBe(false);
    });
});
