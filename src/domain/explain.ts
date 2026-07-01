// Explain (code explanation) tasks (docs/architecture/06 §4):
// submission.code holds an ExplainSubmission JSON — student-selected line
// ranges of the target code plus prose explanations. Grading is manual.

export interface ExplainAnnotation {
    id: string;
    /** 1-based inclusive line range of the target code. */
    firstLine: number;
    lastLine: number;
    explanation: string;
}

export interface ExplainSubmission {
    annotations: ExplainAnnotation[];
}

export function emptyExplainSubmission(): ExplainSubmission {
    return { annotations: [] };
}

/** Tolerant parser: malformed JSON yields an empty submission. */
export function parseExplainSubmission(raw: string): ExplainSubmission {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return emptyExplainSubmission();
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return emptyExplainSubmission();
    }
    const rawAnnotations = (parsed as Record<string, unknown>).annotations;
    if (!Array.isArray(rawAnnotations)) {
        return emptyExplainSubmission();
    }
    const annotations: ExplainAnnotation[] = [];
    for (const item of rawAnnotations) {
        if (typeof item !== "object" || item === null) {
            continue;
        }
        const record = item as Record<string, unknown>;
        if (
            typeof record.id === "string" &&
            typeof record.firstLine === "number" &&
            typeof record.lastLine === "number" &&
            typeof record.explanation === "string"
        ) {
            annotations.push({
                id: record.id,
                firstLine: record.firstLine,
                lastLine: record.lastLine,
                explanation: record.explanation,
            });
        }
    }
    return { annotations };
}

export function serializeExplainSubmission(submission: ExplainSubmission): string {
    return JSON.stringify(submission);
}
