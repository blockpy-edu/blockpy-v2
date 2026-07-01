import { describe, expect, it } from "vitest";
import { blockpyAssignmentJson, submissionJson } from "../../api/__fixtures__/wirePayloads";
import { fromAssignmentJson } from "../../domain/assignment";
import { fromSubmissionJson } from "../../domain/submission";
import { buildVfsFiles, canWrite, listVisible, readFile, resolveForRuntime } from "../vfs";
import type { VfsFile } from "../types";

const baseAssignment = fromAssignmentJson(blockpyAssignmentJson);
const baseSubmission = fromSubmissionJson(submissionJson);

const assignment = {
    ...baseAssignment,
    startingCode: "start = True\n",
    extraInstructorFiles: JSON.stringify([
        { filename: "?grader_data.json", contents: "{}" },
        { filename: "$answer_key.txt", contents: "secret" },
        { filename: "shared.csv", contents: "a,b" },
    ]),
    extraStartingFiles: JSON.stringify([{ filename: "helper.py", contents: "h = 1" }]),
};

const submission = {
    ...baseSubmission,
    code: 'print("mine")\n',
    extraFiles: JSON.stringify([{ filename: "notes.txt", contents: "remember" }]),
};

describe("buildVfsFiles", () => {
    const files = buildVfsFiles(assignment, submission);

    it("projects submission code onto answer.py", () => {
        expect(readFile(files, "answer.py", "student")?.content).toBe('print("mine")\n');
    });

    it("falls back to starting code without a submission", () => {
        const fresh = buildVfsFiles(assignment, null);
        expect(readFile(fresh, "answer.py", "student")?.content).toBe("start = True\n");
    });

    it("projects assignment columns into the instructor namespace", () => {
        expect(readFile(files, "on_run.py", "instructor")?.content).toBe(assignment.onRun);
        expect(readFile(files, "instructions.md", "instructor")?.content).toBe(
            assignment.instructions,
        );
        expect(readFile(files, "starting_code.py", "starting")?.content).toBe("start = True\n");
    });

    it("maps bundle sigils onto namespaces with readOnly fallback", () => {
        expect(readFile(files, "grader_data.json")?.namespace).toBe("hidden");
        expect(readFile(files, "answer_key.txt")?.namespace).toBe("secret");
        expect(readFile(files, "shared.csv")?.namespace).toBe("readOnly");
        expect(readFile(files, "helper.py")?.namespace).toBe("starting");
        expect(readFile(files, "notes.txt")?.namespace).toBe("student");
    });
});

describe("listVisible", () => {
    const files = buildVfsFiles(assignment, submission);

    it("hides instructor, hidden, and secret files from students", () => {
        const names = listVisible(files, "student").map((file) => file.name);
        expect(names).toContain("answer.py");
        expect(names).toContain("shared.csv");
        expect(names).toContain("helper.py");
        expect(names).not.toContain("on_run.py");
        expect(names).not.toContain("grader_data.json");
        expect(names).not.toContain("answer_key.txt");
    });

    it("shows everything to instructors", () => {
        const names = listVisible(files, "instructor").map((file) => file.name);
        expect(names).toContain("on_run.py");
        expect(names).toContain("grader_data.json");
        expect(names).toContain("answer_key.txt");
    });
});

describe("canWrite", () => {
    const student: VfsFile = { name: "a.py", namespace: "student", content: "", origin: "column" };
    const starting: VfsFile = {
        name: "b.py",
        namespace: "starting",
        content: "",
        origin: "column",
    };

    it("students may only write student files", () => {
        expect(canWrite(student, "student")).toBe(true);
        expect(canWrite(starting, "student")).toBe(false);
    });

    it("instructors may write starting files but not generated ones", () => {
        expect(canWrite(starting, "instructor")).toBe(true);
        expect(
            canWrite(
                { name: "g", namespace: "generated", content: "", origin: "generated" },
                "instructor",
            ),
        ).toBe(false);
    });
});

describe("resolveForRuntime", () => {
    const files = buildVfsFiles(assignment, submission);

    it("excludes hidden/secret files from student-phase runs", () => {
        const map = resolveForRuntime(files, "student");
        expect(map["answer.py"]).toBe('print("mine")\n');
        expect(map["shared.csv"]).toBe("a,b");
        expect(map["helper.py"]).toBe("h = 1");
        expect(map).not.toHaveProperty("grader_data.json");
        expect(map).not.toHaveProperty("answer_key.txt");
        expect(map).not.toHaveProperty("starting_code.py");
    });

    it("includes hidden/secret files for instructor-phase runs", () => {
        const map = resolveForRuntime(files, "instructor");
        expect(map["grader_data.json"]).toBe("{}");
        expect(map["answer_key.txt"]).toBe("secret");
    });

    it("lets student files shadow lower-priority namespaces", () => {
        const shadowed: VfsFile[] = [
            { name: "data.txt", namespace: "readOnly", content: "provided", origin: "bundle" },
            { name: "data.txt", namespace: "student", content: "edited", origin: "bundle" },
        ];
        expect(resolveForRuntime(shadowed, "student")["data.txt"]).toBe("edited");
    });
});

describe("readFile", () => {
    it("resolves collisions in runtime priority order", () => {
        const files: VfsFile[] = [
            { name: "data.txt", namespace: "readOnly", content: "provided", origin: "bundle" },
            { name: "data.txt", namespace: "student", content: "edited", origin: "bundle" },
        ];
        expect(readFile(files, "data.txt")?.namespace).toBe("student");
        expect(readFile(files, "data.txt", "readOnly")?.content).toBe("provided");
        expect(readFile(files, "missing.txt")).toBeNull();
    });
});
