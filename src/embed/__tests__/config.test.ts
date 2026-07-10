import { describe, it, expect, vi } from "vitest";
import { resolveBlockPyConfig, isCorrectRun } from "../config";
import type { BlockPyRunContext } from "../../types";

describe("embed config", () => {
    it("fills missing values with defaults", () => {
        const resolved = resolveBlockPyConfig({
            user: { id: "u-1" },
            assignment: { id: "a-1" },
            submission: { id: "s-1" },
        });

        expect(resolved.initialState.user.id).toBe("u-1");
        expect(resolved.initialState.user.role).toBe("learner");
        expect(resolved.initialState.assignment.id).toBe("a-1");
        expect(resolved.initialState.assignment.instructions.length).toBeGreaterThan(0);
        expect(resolved.initialState.submission.id).toBe("s-1");
        expect(resolved.initialState.display.sizingMode).toBe("stretch");
        expect(resolved.initialState.submission.code).toBe(
            resolved.initialState.assignment.startingCode,
        );
    });

    it("merges nested assignment and server config", () => {
        const resolved = resolveBlockPyConfig({
            assignment: {
                visibilityFlags: { showPoints: true },
                settings: { attempts: 3 },
            },
            server: {
                urls: {
                    api: "https://api.example.edu",
                },
                accessToken: "token-123",
            },
        });

        expect(resolved.initialState.assignment.visibilityFlags.showInstructions).toBe(true);
        expect(resolved.initialState.assignment.visibilityFlags.showPoints).toBe(true);
        expect(resolved.initialState.assignment.settings.attempts).toBe(3);
        expect(resolved.initialState.server.urls.api).toBe("https://api.example.edu");
        expect(resolved.initialState.server.accessToken).toBe("token-123");
    });

    it("uses callback correctness evaluator when provided", () => {
        const isCorrectEvaluator = vi.fn().mockReturnValue(true);
        const resolved = resolveBlockPyConfig({
            callbacks: {
                isCorrectRun: isCorrectEvaluator,
            },
        });

        const context: BlockPyRunContext = {
            result: { stdout: "", stderr: "", executionTime: 1 },
            code: "print(1)",
            parseErrors: [],
            state: resolved.initialState,
        };

        const correct = isCorrectRun(context, resolved);

        expect(correct).toBe(true);
        expect(isCorrectEvaluator).toHaveBeenCalledTimes(1);
    });

    it("supports content sizing mode in display config", () => {
        const resolved = resolveBlockPyConfig({
            display: {
                sizingMode: "content",
            },
        });

        expect(resolved.initialState.display.sizingMode).toBe("content");
        expect(resolved.initialState.display.readOnly).toBe(false);
    });
});
