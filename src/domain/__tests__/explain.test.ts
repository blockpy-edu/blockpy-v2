import { describe, expect, it } from "vitest";
import {
    emptyExplainSubmission,
    parseExplainSubmission,
    serializeExplainSubmission,
} from "../explain";

describe("explain submissions", () => {
    it("round-trips annotations", () => {
        const submission = {
            annotations: [
                { id: "a1", firstLine: 1, lastLine: 3, explanation: "sets up the loop" },
                { id: "a2", firstLine: 4, lastLine: 4, explanation: "prints the total" },
            ],
        };
        expect(parseExplainSubmission(serializeExplainSubmission(submission))).toEqual(submission);
    });

    it("yields an empty submission for malformed JSON or Python code", () => {
        expect(parseExplainSubmission("")).toEqual(emptyExplainSubmission());
        expect(parseExplainSubmission("total = 0\nprint(total)")).toEqual(emptyExplainSubmission());
        expect(parseExplainSubmission("[]")).toEqual(emptyExplainSubmission());
    });

    it("drops malformed annotation entries but keeps valid ones", () => {
        const parsed = parseExplainSubmission(
            JSON.stringify({
                annotations: [
                    { id: "ok", firstLine: 1, lastLine: 2, explanation: "fine" },
                    { id: "bad", firstLine: "one" },
                    null,
                ],
            }),
        );
        expect(parsed.annotations).toEqual([
            { id: "ok", firstLine: 1, lastLine: 2, explanation: "fine" },
        ]);
    });
});
