// Converts raw phase outcomes into a single Feedback object
// (docs/architecture/05 §4). Pure functions; no I/O.

import { CATEGORY_PRIORITY, FRIENDLY_ERROR_HINTS } from "./categories";
import type { FeedbackCategory } from "./categories";
import type { InstructorFeedbackRaw, PythonErrorInfo, RunOutcome } from "../protocol";

export interface Feedback {
    category: FeedbackCategory;
    /** Short title ("NameError", "Complete!"). */
    label: string;
    /** Plain text; renderers must not interpret as HTML. */
    message: string;
    priority: number;
    /** 0..1 when grading occurred, else null. */
    score: number | null;
    correct: boolean;
    location: { file: string; line: number } | null;
}

export interface FeedbackInputs {
    studentOutcome: RunOutcome;
    instructorOutcome?: RunOutcome | null;
    instructorFeedback?: InstructorFeedbackRaw | null;
    mainFile?: string;
}

const NO_FEEDBACK: Feedback = {
    category: "none",
    label: "Ready",
    message: "",
    priority: CATEGORY_PRIORITY.none,
    score: null,
    correct: false,
    location: null,
};

export function buildFeedback(inputs: FeedbackInputs): Feedback {
    const mainFile = inputs.mainFile ?? "answer.py";
    const candidates: Feedback[] = [];

    const { studentOutcome } = inputs;
    if (studentOutcome.status === "syntax-error") {
        candidates.push(errorFeedback("syntax", studentOutcome.error, mainFile));
    } else if (studentOutcome.status === "runtime-error") {
        candidates.push(errorFeedback("runtime", studentOutcome.error, mainFile));
    } else if (studentOutcome.status === "timeout") {
        candidates.push({
            category: "runtime",
            label: "Timeout",
            message:
                "Your program took too long to finish. Check for infinite loops, or use the Stop button.",
            priority: CATEGORY_PRIORITY.runtime,
            score: null,
            correct: false,
            location: null,
        });
    }

    if (inputs.instructorOutcome && inputs.instructorOutcome.status !== "success") {
        candidates.push({
            category: "system",
            label: "Grading error",
            message:
                "The instructor feedback script failed to run. Your work is saved; let your instructor know.",
            priority: CATEGORY_PRIORITY.system,
            score: null,
            correct: false,
            location: null,
        });
    }

    const raw = inputs.instructorFeedback;
    if (raw) {
        const firstMessage = raw.messages[0] ?? null;
        if (firstMessage) {
            candidates.push({
                category: "instructor",
                label: firstMessage.label,
                message: firstMessage.message,
                priority: CATEGORY_PRIORITY.instructor,
                score: raw.success ? Math.max(raw.partial, 1) : raw.partial,
                correct: raw.success,
                location:
                    firstMessage.line !== null ? { file: mainFile, line: firstMessage.line } : null,
            });
        } else if (raw.success) {
            candidates.push({
                category: "success",
                label: "Complete!",
                message: "Great work! You completed this task.",
                priority: CATEGORY_PRIORITY.success,
                score: 1,
                correct: true,
                location: null,
            });
        } else if (raw.partial > 0) {
            candidates.push({
                category: "partial",
                label: "Partial credit",
                message: `You earned ${Math.round(raw.partial * 100)}% credit so far. Keep going!`,
                priority: CATEGORY_PRIORITY.partial,
                score: raw.partial,
                correct: false,
                location: null,
            });
        }
    }

    if (candidates.length === 0) {
        if (studentOutcome.status === "success" && inputs.instructorFeedback === undefined) {
            // No grader configured: report a clean run without claiming credit.
            return {
                category: "none",
                label: "Run complete",
                message: "Your program ran without errors.",
                priority: CATEGORY_PRIORITY.none,
                score: null,
                correct: false,
                location: null,
            };
        }
        return NO_FEEDBACK;
    }

    candidates.sort((a, b) => b.priority - a.priority);
    const winner = candidates[0];
    // Score/correct from the instructor survive even when an error message wins.
    const graded = candidates.find((candidate) => candidate.score !== null);
    if (graded && winner.score === null) {
        return { ...winner, score: graded.score, correct: graded.correct };
    }
    return winner;
}

function errorFeedback(
    category: "syntax" | "runtime",
    error: PythonErrorInfo,
    mainFile: string,
): Feedback {
    const hint = FRIENDLY_ERROR_HINTS[error.type];
    return {
        category,
        label: error.type,
        message: hint ? `${error.message}\n\n${hint}` : error.message,
        priority: CATEGORY_PRIORITY[category],
        score: null,
        correct: false,
        location: error.line !== null ? { file: mainFile, line: error.line } : null,
    };
}

/**
 * Rewrites a raw Python traceback to student-relevant frames only
 * (Epic 20): frames inside instructor/secret files or Pyodide internals
 * are stripped.
 */
export function rewriteTraceback(traceback: string, studentFiles: readonly string[]): string {
    const lines = traceback.split("\n");
    const result: string[] = [];
    let skippingFrame = false;
    for (const line of lines) {
        const frameMatch = /^\s*File "([^"]+)", line \d+/.exec(line);
        if (frameMatch) {
            const file = frameMatch[1];
            const isStudent =
                file === "<exec>" ||
                file === "<console>" ||
                studentFiles.some((name) => file === name || file.endsWith(`/${name}`));
            skippingFrame = !isStudent;
            if (isStudent) {
                result.push(line);
            }
            continue;
        }
        // Indented lines belong to the preceding frame; keep headers and the
        // final error message line.
        if (/^\s/.test(line)) {
            if (!skippingFrame) {
                result.push(line);
            }
        } else {
            skippingFrame = false;
            result.push(line);
        }
    }
    return result.join("\n");
}
