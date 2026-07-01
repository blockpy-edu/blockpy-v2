import { describe, expect, it, vi } from "vitest";
import { PANEL_REGISTRY } from "../../panels/registry";
import { collectPanelIds, listPresets } from "../presets";
import type { RegionNode } from "../types";

// The editor panel transitively imports Blockly, which needs DOM/canvas APIs
// unavailable in jsdom; the registry's shape is all this test needs.
vi.mock("../../panels/EditorPanel", () => ({
    EditorPanel: () => null,
}));

function collectSplitNodes(node: RegionNode): Extract<RegionNode, { kind: "split" }>[] {
    if (node.kind === "panel") {
        return [];
    }
    return [node, ...node.children.flatMap(collectSplitNodes)];
}

describe("layout presets", () => {
    it.each(listPresets().map((preset) => [preset.id, preset] as const))(
        "%s preset has valid split sizes",
        (_id, preset) => {
            for (const split of collectSplitNodes(preset.regions)) {
                expect(split.sizes).toHaveLength(split.children.length);
                const total = split.sizes.reduce((sum, size) => sum + size, 0);
                expect(total).toBeCloseTo(100);
                for (const size of split.sizes) {
                    expect(size).toBeGreaterThan(0);
                }
            }
        },
    );

    it.each(listPresets().map((preset) => [preset.id, preset] as const))(
        "%s preset references only registered panels, without duplicates",
        (_id, preset) => {
            const panelIds = collectPanelIds(preset.regions);
            expect(panelIds.length).toBeGreaterThan(0);
            expect(new Set(panelIds).size).toBe(panelIds.length);
            for (const panelId of panelIds) {
                expect(PANEL_REGISTRY[panelId]).toBeDefined();
            }
        },
    );
});
