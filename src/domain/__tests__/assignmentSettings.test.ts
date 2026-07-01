import { describe, expect, it } from "vitest";
import {
    DEFAULT_ASSIGNMENT_SETTINGS,
    parseAssignmentSettings,
    serializeAssignmentSettings,
} from "../assignmentSettings";

describe("parseAssignmentSettings", () => {
    it("returns defaults for an empty string", () => {
        expect(parseAssignmentSettings("")).toEqual(DEFAULT_ASSIGNMENT_SETTINGS);
    });

    it("returns defaults for malformed JSON without throwing", () => {
        expect(parseAssignmentSettings("{oops")).toEqual(DEFAULT_ASSIGNMENT_SETTINGS);
    });

    it("returns defaults for non-object JSON", () => {
        expect(parseAssignmentSettings("[1, 2]")).toEqual(DEFAULT_ASSIGNMENT_SETTINGS);
        expect(parseAssignmentSettings('"text"')).toEqual(DEFAULT_ASSIGNMENT_SETTINGS);
    });

    it("parses known boolean keys", () => {
        const settings = parseAssignmentSettings('{"hideFiles": true, "disableFeedback": true}');
        expect(settings.hideFiles).toBe(true);
        expect(settings.disableFeedback).toBe(true);
        expect(settings.hideEvaluate).toBe(false);
    });

    it("ignores wrongly-typed known keys", () => {
        const settings = parseAssignmentSettings('{"hideFiles": "yes", "startView": "diagonal"}');
        expect(settings.hideFiles).toBe(false);
        expect(settings.startView).toBe("split");
    });

    it("parses startView and datasets", () => {
        const settings = parseAssignmentSettings(
            '{"startView": "block", "datasets": ["earthquakes", 7, "weather"]}',
        );
        expect(settings.startView).toBe("block");
        expect(settings.datasets).toEqual(["earthquakes", "weather"]);
    });

    it("preserves unknown keys in extra", () => {
        const settings = parseAssignmentSettings('{"legacy_flag": 1, "mystery": {"a": true}}');
        expect(settings.extra).toEqual({ legacy_flag: 1, mystery: { a: true } });
    });

    it("round-trips unknown keys through serialization", () => {
        const original = '{"hideFiles": true, "legacy_flag": 1}';
        const reparsed = parseAssignmentSettings(
            serializeAssignmentSettings(parseAssignmentSettings(original)),
        );
        expect(reparsed.hideFiles).toBe(true);
        expect(reparsed.extra.legacy_flag).toBe(1);
    });

    it("known keys win over colliding extras when serializing", () => {
        const settings = parseAssignmentSettings('{"hideFiles": true}');
        settings.extra.hideFiles = "sneaky";
        const reparsed = parseAssignmentSettings(serializeAssignmentSettings(settings));
        expect(reparsed.hideFiles).toBe(true);
    });
});
