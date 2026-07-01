import { describe, expect, it } from "vitest";
import { gradeQuiz, parseQuizAnswerKey } from "../grading";
import { emptyQuizSubmission, parseQuizInstructions } from "../types";
import type { QuizAnswerValue, QuizInstructions } from "../types";

function quiz(questions: Record<string, unknown>): QuizInstructions {
    const parsed = parseQuizInstructions(JSON.stringify({ questions }));
    if (!parsed) {
        throw new Error("fixture failed to parse");
    }
    return parsed;
}

function submissionWith(answers: Record<string, QuizAnswerValue>) {
    const submission = emptyQuizSubmission();
    submission.studentAnswers = answers;
    submission.attempt = { attempting: false, count: 1, mulligans: 0 };
    return submission;
}

describe("parseQuizAnswerKey", () => {
    it("parses an object key and tolerates malformed JSON", () => {
        expect(parseQuizAnswerKey('{"q1": "a"}')).toEqual({ q1: "a" });
        expect(parseQuizAnswerKey("")).toEqual({});
        expect(parseQuizAnswerKey("[1, 2]")).toEqual({});
    });
});

describe("gradeQuiz", () => {
    it("grades every auto-gradeable question type", () => {
        const instructions = quiz({
            mcq: { type: "multiple_choice_question", body: "", points: 1, answers: ["a", "b"] },
            multi: {
                type: "multiple_answers_question",
                body: "",
                points: 1,
                answers: ["x", "y", "z"],
            },
            tf: { type: "true_false_question", body: "", points: 1 },
            short: { type: "short_answer_question", body: "", points: 1 },
            blanks: {
                type: "fill_in_multiple_blanks_question",
                body: "[first] then [second]",
                points: 1,
            },
            drops: {
                type: "multiple_dropdowns_question",
                body: "pick [color]",
                points: 1,
                answers: { color: ["red", "blue"] },
            },
            match: {
                type: "matching_question",
                body: "",
                points: 1,
                statements: ["s1", "s2"],
                answers: ["a1", "a2"],
            },
            num: { type: "numerical_question", body: "", points: 1, tolerance: 0.1 },
            calc: { type: "calculated_question", body: "", points: 1, tolerance: 0 },
        });
        const key = {
            mcq: "b",
            multi: ["x", "z"],
            tf: "true",
            short: ["Five", "5"],
            blanks: { first: "one", second: "two" },
            drops: { color: "red" },
            match: { s1: "a2", s2: "a1" },
            num: "3.14",
            calc: 10,
        };
        const result = gradeQuiz(
            instructions,
            key,
            submissionWith({
                mcq: "b",
                multi: ["z", "x"],
                tf: "true",
                short: "  FIVE ",
                blanks: { first: "One", second: "TWO" },
                drops: { color: "red" },
                match: { s1: "a2", s2: "a1" },
                num: "3.2",
                calc: "10",
            }),
            1,
        );
        expect(result.correct).toBe(true);
        expect(result.score).toBe(1);
        expect(Object.values(result.feedback).every((f) => f.correct)).toBe(true);
    });

    it("scores partial credit by points and marks wrong answers", () => {
        const instructions = quiz({
            easy: { type: "true_false_question", body: "", points: 1 },
            hard: { type: "short_answer_question", body: "", points: 3 },
        });
        const result = gradeQuiz(
            instructions,
            { easy: "true", hard: "photosynthesis" },
            submissionWith({ easy: "true", hard: "magic" }),
            1,
        );
        expect(result.score).toBe(0.25);
        expect(result.correct).toBe(false);
        expect(result.feedback.hard).toMatchObject({ correct: false, status: "graded" });
    });

    it("keeps essays and uploads pending and never fully correct", () => {
        const instructions = quiz({
            tf: { type: "true_false_question", body: "", points: 1 },
            essay: { type: "essay_question", body: "", points: 1 },
        });
        const result = gradeQuiz(
            instructions,
            { tf: "false" },
            submissionWith({ tf: "false", essay: "long prose" }),
            1,
        );
        expect(result.feedback.essay).toMatchObject({ status: "pending" });
        expect(result.score).toBe(0.5);
        expect(result.correct).toBe(false);
    });

    it("ignores text-only and unknown questions entirely", () => {
        const instructions = quiz({
            info: { type: "text_only_question", body: "welcome", points: 0 },
            weird: { type: "hologram_question", body: "?", points: 5 },
            tf: { type: "true_false_question", body: "", points: 1 },
        });
        const result = gradeQuiz(instructions, { tf: "true" }, submissionWith({ tf: "true" }), 1);
        expect(result.correct).toBe(true);
        expect(result.score).toBe(1);
        expect(result.feedback.info).toBeUndefined();
        expect(result.feedback.weird).toBeUndefined();
    });

    it("marks unanswered questions incorrect rather than crashing", () => {
        const instructions = quiz({
            mcq: { type: "multiple_choice_question", body: "", points: 1, answers: ["a"] },
            num: { type: "numerical_question", body: "", points: 1, tolerance: 0 },
        });
        const result = gradeQuiz(instructions, { mcq: "a", num: "1" }, submissionWith({}), 1);
        expect(result.score).toBe(0);
        expect(result.correct).toBe(false);
    });
});
