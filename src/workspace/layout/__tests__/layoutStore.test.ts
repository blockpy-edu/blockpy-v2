import { beforeEach, describe, expect, it } from "vitest";
import { createLayoutStore } from "../layoutStore";

const STORAGE_KEY = "blockpy.layout.test";

describe("layoutStore", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("starts with the default preset and empty overrides", () => {
        const store = createLayoutStore(STORAGE_KEY);
        const state = store.getState();
        expect(state.presetId).toBe("classic");
        expect(state.presetPinned).toBe(false);
        expect(state.sizes).toEqual({});
        expect(state.collapsed).toEqual({});
        expect(state.fullscreenPanelId).toBeNull();
    });

    it("switches presets and drops size overrides and fullscreen", () => {
        const store = createLayoutStore(STORAGE_KEY);
        store.getState().setRegionSizes("root", [40, 35, 25]);
        store.getState().setFullscreen("editor");
        store.getState().setPreset("quiz", { pin: true });

        const state = store.getState();
        expect(state.presetId).toBe("quiz");
        expect(state.presetPinned).toBe(true);
        expect(state.sizes).toEqual({});
        expect(state.fullscreenPanelId).toBeNull();
    });

    it("stores region size overrides by path", () => {
        const store = createLayoutStore(STORAGE_KEY);
        store.getState().setRegionSizes("root.1", [55, 45]);
        expect(store.getState().sizes["root.1"]).toEqual([55, 45]);
    });

    it("toggles panel collapse state", () => {
        const store = createLayoutStore(STORAGE_KEY);
        store.getState().toggleCollapsed("console");
        expect(store.getState().collapsed.console).toBe(true);
        store.getState().toggleCollapsed("console");
        expect(store.getState().collapsed.console).toBe(false);
    });

    it("resets to defaults", () => {
        const store = createLayoutStore(STORAGE_KEY);
        store.getState().setPreset("instructor", { pin: true });
        store.getState().toggleCollapsed("files");
        store.getState().resetLayout();

        const state = store.getState();
        expect(state.presetId).toBe("classic");
        expect(state.presetPinned).toBe(false);
        expect(state.collapsed).toEqual({});
    });

    it("persists layout and restores it in a new store with the same key", () => {
        const store = createLayoutStore(STORAGE_KEY);
        store.getState().setPreset("sideBySide", { pin: true });
        store.getState().setRegionSizes("root", [60, 40]);
        store.getState().toggleCollapsed("feedback");

        const restored = createLayoutStore(STORAGE_KEY).getState();
        expect(restored.presetId).toBe("sideBySide");
        expect(restored.presetPinned).toBe(true);
        expect(restored.sizes.root).toEqual([60, 40]);
        expect(restored.collapsed.feedback).toBe(true);
        // Fullscreen is transient and never persisted.
        expect(restored.fullscreenPanelId).toBeNull();
    });

    it("ignores corrupted persisted data", () => {
        localStorage.setItem(STORAGE_KEY, "not json {");
        const store = createLayoutStore(STORAGE_KEY);
        expect(store.getState().presetId).toBe("classic");
    });

    it("does not share state between different storage keys", () => {
        const storeA = createLayoutStore("blockpy.layout.course-a");
        storeA.getState().setPreset("quiz");
        const storeB = createLayoutStore("blockpy.layout.course-b");
        expect(storeB.getState().presetId).toBe("classic");
    });
});
