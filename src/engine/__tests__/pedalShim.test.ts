import { describe, expect, it } from "vitest";
import { parseShimResult } from "../pedalShim";

describe("parseShimResult", () => {
    it("parses a full shim payload", () => {
        const raw = JSON.stringify({
            success: true,
            partial: 0.5,
            messages: [{ kind: "gently", label: "Hint", message: "Try a loop.", line: 3 }],
        });
        expect(parseShimResult(raw)).toEqual({
            success: true,
            partial: 0.5,
            messages: [{ kind: "gently", label: "Hint", message: "Try a loop.", line: 3 }],
        });
    });

    it("clamps partial credit into [0, 1]", () => {
        expect(parseShimResult('{"success": false, "partial": 3, "messages": []}').partial).toBe(1);
        expect(parseShimResult('{"success": false, "partial": -1, "messages": []}').partial).toBe(
            0,
        );
    });

    it("coerces unknown message kinds to system", () => {
        const raw = JSON.stringify({
            success: false,
            partial: 0,
            messages: [{ kind: "mystery", label: "X", message: "Y", line: null }],
        });
        expect(parseShimResult(raw).messages[0].kind).toBe("system");
    });

    it("returns empty feedback for malformed input", () => {
        const empty = { success: false, partial: 0, messages: [] };
        expect(parseShimResult("")).toEqual(empty);
        expect(parseShimResult("not json")).toEqual(empty);
        expect(parseShimResult("[1, 2]")).toEqual({ ...empty, messages: [] });
        expect(parseShimResult('{"messages": "nope"}')).toEqual(empty);
    });
});
