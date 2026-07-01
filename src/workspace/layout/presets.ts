import type { LayoutPreset, LayoutPresetId, PanelId, RegionNode } from "./types";

function panel(panelId: PanelId): RegionNode {
    return { kind: "panel", panelId };
}

function row(sizes: number[], children: RegionNode[]): RegionNode {
    return { kind: "split", direction: "row", sizes, children };
}

function column(sizes: number[], children: RegionNode[]): RegionNode {
    return { kind: "split", direction: "column", sizes, children };
}

export const LAYOUT_PRESETS: Record<LayoutPresetId, LayoutPreset> = {
    new: {
        id: "new",
        label: "New",
        regions: row(
            [30, 45, 25],
            [
                panel("task"),
                column([70, 30], [panel("editor"), panel("console")]),
                column([60, 40], [panel("feedback"), panel("files")]),
            ],
        ),
    },
    classic: {
        id: "classic",
        label: "Classic",
        regions: column(
            [20, 30, 10, 30, 10],
            [
                row([75, 25], [panel("task"), panel("trace")]),
                row([50, 50], [panel("console"), panel("feedback")]),
                panel("files"),
                panel("editor"),
                panel("history"),
            ],
        ),
    },
    reading: {
        id: "reading",
        label: "Reading",
        regions: row(
            [65, 35],
            [panel("task"), column([50, 50], [panel("instructions"), panel("feedback")])],
        ),
    },
    quiz: {
        id: "quiz",
        label: "Quiz",
        regions: row([70, 30], [panel("task"), panel("feedback")]),
    },
    sideBySide: {
        id: "sideBySide",
        label: "Side by side",
        regions: row(
            [50, 50],
            [
                panel("task"),
                column([60, 20, 20], [panel("editor"), panel("console"), panel("feedback")]),
            ],
        ),
    },
    instructor: {
        id: "instructor",
        label: "Instructor",
        regions: row(
            [20, 50, 30],
            [
                panel("files"),
                column([65, 35], [panel("editor"), panel("console")]),
                column([50, 50], [panel("task"), panel("feedback")]),
            ],
        ),
    },
    stacked: {
        id: "stacked",
        label: "Stacked",
        regions: column(
            [25, 35, 20, 20],
            [panel("task"), panel("editor"), panel("console"), panel("feedback")],
        ),
    },
};

export const DEFAULT_PRESET_ID: LayoutPresetId = "classic";

export function getPreset(id: LayoutPresetId): LayoutPreset {
    return LAYOUT_PRESETS[id];
}

export function listPresets(): LayoutPreset[] {
    return Object.values(LAYOUT_PRESETS);
}

/** All panel ids referenced by a region tree, in document order. */
export function collectPanelIds(node: RegionNode): PanelId[] {
    if (node.kind === "panel") {
        return [node.panelId];
    }
    return node.children.flatMap(collectPanelIds);
}
