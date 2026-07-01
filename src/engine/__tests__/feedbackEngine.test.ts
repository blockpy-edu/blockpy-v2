import { describe, expect, it } from "vitest";
import { buildFeedback, rewriteTraceback } from "../feedback/feedbackEngine";
import type { InstructorFeedbackRaw, PythonErrorInfo } from "../protocol";

const nameError: PythonErrorInfo = {
    type: "NameError",
    message: "NameError: name 'x' is not defined",
    traceback: "Traceback...",
    line: 4,
};

const syntaxError: PythonErrorInfo = {
    type: "SyntaxError",
    message: "SyntaxError: invalid syntax",
    traceback: "Traceback...",
    line: 2,
};

function instructorRaw(overrides?: Partial<InstructorFeedbackRaw>): InstructorFeedbackRaw {
    return { success: false, partial: 0, messages: [], ...overrides };
}

describe("buildFeedback", () => {
    it("reports a clean ungraded run", () => {
        const feedback = buildFeedback({ studentOutcome: { status: "success" } });
        expect(feedback.label).toBe("Run complete");
        expect(feedback.score).toBeNull();
        expect(feedback.correct).toBe(false);
    });

    it("maps syntax errors with friendly hints and location", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "syntax-error", error: syntaxError },
        });
        expect(feedback.category).toBe("syntax");
        expect(feedback.label).toBe("SyntaxError");
        expect(feedback.message).toContain("invalid syntax");
        expect(feedback.message).toContain("missing colons");
        expect(feedback.location).toEqual({ file: "answer.py", line: 2 });
    });

    it("maps runtime errors with friendly hints", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "runtime-error", error: nameError },
        });
        expect(feedback.category).toBe("runtime");
        expect(feedback.message).toContain("has not been defined");
    });

    it("reports success when the grader sets success", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "success" },
            instructorFeedback: instructorRaw({ success: true }),
        });
        expect(feedback.category).toBe("success");
        expect(feedback.score).toBe(1);
        expect(feedback.correct).toBe(true);
    });

    it("reports partial credit", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "success" },
            instructorFeedback: instructorRaw({ partial: 0.4 }),
        });
        expect(feedback.category).toBe("partial");
        expect(feedback.score).toBe(0.4);
        expect(feedback.message).toContain("40%");
    });

    it("prefers instructor messages over runtime errors", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "runtime-error", error: nameError },
            instructorFeedback: instructorRaw({
                messages: [{ kind: "gently", label: "Hint", message: "Define x first.", line: 1 }],
            }),
        });
        expect(feedback.category).toBe("instructor");
        expect(feedback.message).toBe("Define x first.");
    });

    it("grading script failures produce system feedback", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "success" },
            instructorOutcome: {
                status: "runtime-error",
                error: { type: "TypeError", message: "bad grader", traceback: "", line: null },
            },
            instructorFeedback: null,
        });
        expect(feedback.category).toBe("system");
    });

    it("keeps the instructor score when an error message outranks it", () => {
        const feedback = buildFeedback({
            studentOutcome: { status: "syntax-error", error: syntaxError },
            instructorFeedback: instructorRaw({ partial: 0.3 }),
        });
        expect(feedback.category).toBe("syntax");
        expect(feedback.score).toBe(0.3);
    });

    it("maps timeouts to a runtime explanation", () => {
        const feedback = buildFeedback({ studentOutcome: { status: "timeout" } });
        expect(feedback.label).toBe("Timeout");
        expect(feedback.message).toContain("infinite loops");
    });
});

describe("rewriteTraceback", () => {
    it("strips frames from instructor files", () => {
        const traceback = [
            "Traceback (most recent call last):",
            '  File "answer.py", line 3, in <module>',
            "    helper()",
            '  File "on_run.py", line 10, in check',
            "    secret_assert()",
            "NameError: name 'secret_assert' is not defined",
        ].join("\n");
        const rewritten = rewriteTraceback(traceback, ["answer.py"]);
        expect(rewritten).toContain("answer.py");
        expect(rewritten).not.toContain("on_run.py");
        expect(rewritten).not.toContain("secret_assert()");
        expect(rewritten).toContain("NameError: name 'secret_assert' is not defined");
    });

    it("keeps pyodide exec frames for the main module", () => {
        const traceback = [
            "Traceback (most recent call last):",
            '  File "/lib/python311.zip/_pyodide/_base.py", line 9, in run',
            "    coroutine",
            '  File "<exec>", line 2, in <module>',
            "    1 / 0",
            "ZeroDivisionError: division by zero",
        ].join("\n");
        const rewritten = rewriteTraceback(traceback, ["answer.py"]);
        expect(rewritten).toContain("<exec>");
        expect(rewritten).not.toContain("_pyodide");
    });
});
