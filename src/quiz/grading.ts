// Quiz grading against the on_run answer key (docs/architecture/06 §1.2).
// Grading is the SERVER's job; this module exists so the OfflineTransport can
// simulate `regrade_if_quiz`, and so fixtures lock the semantics. The answer
// key is never imported by student-facing UI code.

import { visibleQuestionIds } from "./pools";
import { blankKeys } from "./tokenizer";
import type { QuizFeedback, QuizInstructions, QuizQuestion, QuizSubmission } from "./types";

/** on_run JSON: answer key keyed by question id. */
export type QuizAnswerKey = Record<string, unknown>;

export function parseQuizAnswerKey(raw: string): QuizAnswerKey {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            return parsed as QuizAnswerKey;
        }
    } catch {
        // Fall through to the empty key.
    }
    return {};
}

export interface QuizGradeResult {
    feedback: Record<string, QuizFeedback>;
    /** Earned fraction of total points, in [0, 1]. */
    score: number;
    correct: boolean;
}

function normalizeText(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function textMatches(answer: unknown, key: unknown): boolean {
    const accepted = Array.isArray(key) ? key : [key];
    return accepted.some((candidate) => normalizeText(candidate) === normalizeText(answer));
}

function numberMatches(answer: unknown, key: unknown, tolerance: number): boolean {
    const given = Number.parseFloat(String(answer ?? ""));
    const expected = Number.parseFloat(String(key ?? ""));
    if (Number.isNaN(given) || Number.isNaN(expected)) {
        return false;
    }
    return Math.abs(given - expected) <= tolerance;
}

function setMatches(answer: unknown, key: unknown): boolean {
    const given = Array.isArray(answer) ? answer.map(String) : [];
    const expected = Array.isArray(key) ? key.map(String) : [];
    return given.length === expected.length && expected.every((item) => given.includes(item));
}

/** Per-subkey comparison for matching/dropdown/blank questions. */
function mapMatches(answer: unknown, key: unknown, keys: string[], fuzzyText: boolean): boolean {
    const given =
        typeof answer === "object" && answer !== null && !Array.isArray(answer)
            ? (answer as Record<string, unknown>)
            : {};
    const expected =
        typeof key === "object" && key !== null && !Array.isArray(key)
            ? (key as Record<string, unknown>)
            : {};
    return keys.every((subKey) =>
        fuzzyText
            ? textMatches(given[subKey], expected[subKey])
            : String(given[subKey] ?? "") === String(expected[subKey] ?? ""),
    );
}

/** Grades one question; null means the question is not auto-gradeable. */
function gradeQuestion(question: QuizQuestion, answer: unknown, key: unknown): boolean | null {
    switch (question.type) {
        case "multiple_choice_question":
            return String(answer ?? "") !== "" && String(answer) === String(key ?? "");
        case "multiple_answers_question":
            return setMatches(answer, key);
        case "true_false_question":
            return normalizeText(answer) !== "" && normalizeText(answer) === normalizeText(key);
        case "short_answer_question":
            return normalizeText(answer) !== "" && textMatches(answer, key);
        case "matching_question":
            return mapMatches(answer, key, question.statements, false);
        case "multiple_dropdowns_question":
            return mapMatches(answer, key, Object.keys(question.answers), false);
        case "fill_in_multiple_blanks_question":
            return mapMatches(answer, key, blankKeys(question.body), true);
        case "numerical_question":
        case "calculated_question":
            return numberMatches(answer, key, question.tolerance);
        case "essay_question":
        case "file_upload_question":
            // Manually graded.
            return null;
        case "text_only_question":
        case "unknown_question":
            // Not graded at all.
            return null;
    }
}

const UNGRADED: readonly QuizQuestion["type"][] = ["text_only_question", "unknown_question"];

/**
 * Grades the questions visible for this submission/attempt. Manually-graded
 * questions (essay, file upload) earn 0 and stay `pending`, so `correct` is
 * only true when every auto-graded answer is right and nothing is pending.
 */
export function gradeQuiz(
    instructions: QuizInstructions,
    key: QuizAnswerKey,
    submission: QuizSubmission,
    submissionId: number,
): QuizGradeResult {
    const visible = visibleQuestionIds(instructions, submissionId, submission.attempt.count);
    const feedback: Record<string, QuizFeedback> = {};
    let totalPoints = 0;
    let earnedPoints = 0;
    let pending = false;

    for (const id of visible) {
        const question = instructions.questions[id];
        if (UNGRADED.includes(question.type)) {
            continue;
        }
        const verdict = gradeQuestion(question, submission.studentAnswers[id], key[id]);
        totalPoints += question.points;
        if (verdict === null) {
            pending = true;
            feedback[id] = {
                correct: false,
                score: 0,
                message: "This answer will be graded by your instructor.",
                status: "pending",
            };
            continue;
        }
        if (verdict) {
            earnedPoints += question.points;
        }
        feedback[id] = {
            correct: verdict,
            score: verdict ? 1 : 0,
            message: verdict ? "Correct!" : "Incorrect.",
            status: "graded",
        };
    }

    const score = totalPoints > 0 ? earnedPoints / totalPoints : 0;
    return {
        feedback,
        score,
        correct: totalPoints > 0 && earnedPoints === totalPoints && !pending,
    };
}
