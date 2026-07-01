import { createStore, type StoreApi } from "zustand/vanilla";
import { DEFAULT_PRESET_ID } from "./presets";
import type { LayoutPresetId, PanelId } from "./types";

export interface LayoutState {
    presetId: LayoutPresetId;
    /** When pinned, the preset does not auto-switch with the focused task kind. */
    presetPinned: boolean;
    /** Manual size overrides, keyed by region path (e.g. "root.1"). */
    sizes: Record<string, number[]>;
    collapsed: Partial<Record<PanelId, boolean>>;
    showHeaders: boolean;
    fullscreenPanelId: PanelId | null;
    setPreset: (id: LayoutPresetId, options?: { pin?: boolean }) => void;
    setRegionSizes: (regionPath: string, sizes: number[]) => void;
    toggleCollapsed: (panelId: PanelId) => void;
    toggleShowHeaders: () => void;
    setFullscreen: (panelId: PanelId | null) => void;
    resetLayout: () => void;
}

export type LayoutStore = StoreApi<LayoutState>;

interface PersistedLayout {
    presetId: LayoutPresetId;
    presetPinned: boolean;
    sizes: Record<string, number[]>;
    collapsed: Partial<Record<PanelId, boolean>>;
}

function loadPersisted(storageKey: string): PersistedLayout | null {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as PersistedLayout;
    } catch {
        return null;
    }
}

function persist(storageKey: string, state: LayoutState): void {
    const snapshot: PersistedLayout = {
        presetId: state.presetId,
        presetPinned: state.presetPinned,
        sizes: state.sizes,
        collapsed: state.collapsed,
    };
    try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
        // Storage unavailable (private mode, quota): layout simply does not persist.
    }
}

export function createLayoutStore(storageKey: string): LayoutStore {
    const persisted = loadPersisted(storageKey);

    const store = createStore<LayoutState>((set) => ({
        presetId: persisted?.presetId ?? DEFAULT_PRESET_ID,
        presetPinned: persisted?.presetPinned ?? false,
        sizes: persisted?.sizes ?? {},
        collapsed: persisted?.collapsed ?? {},
        showHeaders: true,
        fullscreenPanelId: null,
        setPreset: (id, options) =>
            set((state) => ({
                presetId: id,
                presetPinned: options?.pin ?? state.presetPinned,
                // Size overrides are per-preset region paths; drop them on switch.
                sizes: {},
                fullscreenPanelId: null,
            })),
        setRegionSizes: (regionPath, sizes) =>
            set((state) => ({ sizes: { ...state.sizes, [regionPath]: sizes } })),
        toggleCollapsed: (panelId) =>
            set((state) => ({
                collapsed: { ...state.collapsed, [panelId]: !state.collapsed[panelId] },
            })),
        toggleShowHeaders: () => set((state) => ({ showHeaders: !state.showHeaders })),
        setFullscreen: (panelId) => set({ fullscreenPanelId: panelId }),
        resetLayout: () =>
            set({
                presetId: DEFAULT_PRESET_ID,
                presetPinned: false,
                sizes: {},
                collapsed: {},
                fullscreenPanelId: null,
            }),
    }));

    store.subscribe((state) => persist(storageKey, state));

    return store;
}
