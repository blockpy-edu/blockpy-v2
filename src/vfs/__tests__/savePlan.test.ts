import { describe, expect, it } from "vitest";
import { planSave } from "../savePlan";
import type { SaveIds } from "../savePlan";
import type { VfsFile } from "../types";

const ids: SaveIds = { submissionId: 9941, assignmentId: 478 };

const answer: VfsFile = {
    name: "answer.py",
    namespace: "student",
    content: "print(1)\n",
    origin: "column",
};

const studentNote: VfsFile = {
    name: "notes.txt",
    namespace: "student",
    content: "mine",
    origin: "bundle",
    rawName: "notes.txt",
    bundleExtra: {},
};

const hiddenFile: VfsFile = {
    name: "grader_data.json",
    namespace: "hidden",
    content: "{}",
    origin: "bundle",
    rawName: "?grader_data.json",
    bundleExtra: {},
};

const onRun: VfsFile = {
    name: "on_run.py",
    namespace: "instructor",
    content: "give_feedback()",
    origin: "column",
};

const startingCode: VfsFile = {
    name: "starting_code.py",
    namespace: "starting",
    content: "start",
    origin: "column",
};

const startingExtra: VfsFile = {
    name: "helper.py",
    namespace: "starting",
    content: "h = 1",
    origin: "bundle",
    rawName: "helper.py",
    bundleExtra: {},
};

describe("planSave", () => {
    it("saves answer.py directly against the submission", () => {
        expect(planSave(answer, [answer], ids)).toEqual({
            kind: "student",
            filename: "answer.py",
            submissionId: 9941,
            code: "print(1)\n",
        });
    });

    it("re-serializes other student files into the student bundle", () => {
        const plan = planSave(studentNote, [answer, studentNote], ids);
        expect(plan).toMatchObject({
            kind: "student",
            filename: "#extra_student_files.blockpy",
            submissionId: 9941,
        });
        expect(JSON.parse((plan as { code: string }).code)).toEqual([
            { filename: "notes.txt", contents: "mine" },
        ]);
    });

    it("saves instructor column files against the assignment", () => {
        expect(planSave(onRun, [onRun], ids)).toEqual({
            kind: "instructor",
            filename: "!on_run.py",
            assignmentId: 478,
            code: "give_feedback()",
        });
    });

    it("saves starting_code.py as the ^starting_code.py column", () => {
        expect(planSave(startingCode, [startingCode], ids)).toEqual({
            kind: "instructor",
            filename: "^starting_code.py",
            assignmentId: 478,
            code: "start",
        });
    });

    it("re-serializes starting bundle members", () => {
        const plan = planSave(startingExtra, [startingCode, startingExtra], ids);
        expect(plan).toMatchObject({
            kind: "instructor",
            filename: "#extra_starting_files.blockpy",
        });
        expect(JSON.parse((plan as { code: string }).code)).toEqual([
            { filename: "helper.py", contents: "h = 1" },
        ]);
    });

    it("re-serializes hidden/secret/readOnly files into the instructor bundle", () => {
        const plan = planSave(hiddenFile, [answer, hiddenFile], ids);
        expect(plan).toMatchObject({
            kind: "instructor",
            filename: "#extra_instructor_files.blockpy",
            assignmentId: 478,
        });
        expect(JSON.parse((plan as { code: string }).code)).toEqual([
            { filename: "?grader_data.json", contents: "{}" },
        ]);
    });

    it("never saves generated files", () => {
        const generated: VfsFile = {
            name: "plot.png",
            namespace: "generated",
            content: "",
            origin: "generated",
        };
        expect(planSave(generated, [generated], ids)).toBeNull();
    });

    it("returns null when the needed id is missing", () => {
        expect(planSave(answer, [answer], { submissionId: null, assignmentId: 478 })).toBeNull();
        expect(planSave(onRun, [onRun], { submissionId: 9941, assignmentId: null })).toBeNull();
    });
});
