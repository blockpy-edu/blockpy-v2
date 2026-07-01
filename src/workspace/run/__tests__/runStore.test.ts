import { describe, expect, it } from "vitest";
import { createRunStore } from "../runStore";

describe("runStore", () => {
    it("appends entries with increasing ids", () => {
        const store = createRunStore();
        store.getState().append("stdout", "a", 1);
        store.getState().append("stderr", "b", 1);
        const { entries } = store.getState();
        expect(entries.map((entry) => entry.text)).toEqual(["a", "b"]);
        expect(entries[1].id).toBeGreaterThan(entries[0].id);
    });

    it("caps the console at 2000 entries, dropping the oldest", () => {
        const store = createRunStore();
        for (let i = 0; i < 2005; i += 1) {
            store.getState().append("stdout", `line ${i}`, 1);
        }
        const { entries } = store.getState();
        expect(entries).toHaveLength(2000);
        expect(entries[0].text).toBe("line 5");
    });

    it("clearEpoch removes that epoch but keeps separators", () => {
        const store = createRunStore();
        store.getState().append("separator", "Run 1", 1);
        store.getState().append("stdout", "old", 1);
        store.getState().append("stdout", "other run", 2);
        store.getState().clearEpoch(1);
        expect(store.getState().entries.map((entry) => entry.text)).toEqual(["Run 1", "other run"]);
    });

    it("tracks status, feedback, and input prompt", () => {
        const store = createRunStore();
        store.getState().setStatus("running");
        store.getState().setInputPrompt("Name?");
        expect(store.getState().status).toBe("running");
        expect(store.getState().inputPrompt).toBe("Name?");
        store.getState().setInputPrompt(null);
        expect(store.getState().inputPrompt).toBeNull();
    });
});
