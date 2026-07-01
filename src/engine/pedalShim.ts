// The instructor feedback shim (docs/architecture/05 §3): a small Python
// module preloaded into instructor phases, exposing the legacy pedal-style
// entry points existing on_run curriculum expects. Results serialize to JSON
// read back by the worker as InstructorFeedbackRaw.

import type { InstructorFeedbackRaw, InstructorFeedbackMessage } from "./protocol";

/**
 * Python source executed before instructor code. Instructor phases receive
 * `student` (data/code/output), and the feedback collectors. The worker
 * reads `__blockpy_feedback_json()` after the script finishes.
 */
export const PEDAL_SHIM_SOURCE = `
import json as __bp_json

__bp_messages = []
__bp_success = False
__bp_partial = 0.0


def set_success(score=1.0):
    global __bp_success, __bp_partial
    __bp_success = True
    __bp_partial = max(__bp_partial, float(score))


def give_partial(fraction, message=""):
    global __bp_partial
    __bp_partial = min(1.0, __bp_partial + float(fraction))
    if message:
        __bp_messages.append(
            {"kind": "compliment", "label": "Partial credit", "message": str(message), "line": None}
        )


def gently(message, line=None, label="Feedback"):
    __bp_messages.append(
        {"kind": "gently", "label": str(label), "message": str(message),
         "line": int(line) if line is not None else None}
    )


def explain(message, line=None, label="Explanation"):
    __bp_messages.append(
        {"kind": "explain", "label": str(label), "message": str(message),
         "line": int(line) if line is not None else None}
    )


def compliment(message, label="Compliment"):
    __bp_messages.append(
        {"kind": "compliment", "label": str(label), "message": str(message), "line": None}
    )


class __BlockPyStudent:
    def __init__(self, code, output, error):
        self.code = code
        self.output = output
        self.error = error
        self.data = {}


def __blockpy_feedback_json():
    return __bp_json.dumps(
        {"success": __bp_success, "partial": __bp_partial, "messages": __bp_messages}
    )
`;

const MESSAGE_KINDS = new Set(["gently", "explain", "compliment", "system"]);

/** Total parser for the shim's JSON output; malformed input yields no-op feedback. */
export function parseShimResult(raw: string): InstructorFeedbackRaw {
    const empty: InstructorFeedbackRaw = { success: false, partial: 0, messages: [] };
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return empty;
    }
    if (typeof parsed !== "object" || parsed === null) {
        return empty;
    }
    const record = parsed as Record<string, unknown>;
    const messages: InstructorFeedbackMessage[] = [];
    if (Array.isArray(record.messages)) {
        for (const item of record.messages) {
            if (typeof item !== "object" || item === null) {
                continue;
            }
            const msg = item as Record<string, unknown>;
            messages.push({
                kind: MESSAGE_KINDS.has(msg.kind as string)
                    ? (msg.kind as InstructorFeedbackMessage["kind"])
                    : "system",
                label: typeof msg.label === "string" ? msg.label : "",
                message: typeof msg.message === "string" ? msg.message : "",
                line: typeof msg.line === "number" ? msg.line : null,
            });
        }
    }
    return {
        success: record.success === true,
        partial: typeof record.partial === "number" ? Math.min(1, Math.max(0, record.partial)) : 0,
        messages,
    };
}
