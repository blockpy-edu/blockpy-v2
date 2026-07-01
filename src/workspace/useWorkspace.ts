import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { ActivityState, ActivityStore } from "./activity/activityStore";
import type { LayoutState, LayoutStore } from "./layout/layoutStore";
import type { RunCoordinator } from "./run/RunCoordinator";
import type { RunState, RunStore } from "./run/runStore";
import type { SaveIds } from "../vfs/savePlan";
import type { VfsRole } from "../vfs/types";
import type { VfsState, VfsStore } from "../vfs/vfsStore";
import type { BlockPyResolvedConfig } from "../types";

export interface WorkspaceContextValue {
    config: BlockPyResolvedConfig;
    layoutStore: LayoutStore;
    activityStore: ActivityStore;
    /** The focused task's VFS; changes identity when the focus moves. */
    vfsStore: VfsStore;
    vfsRole: VfsRole;
    /** The focused task's save ids. */
    saveIds: SaveIds;
    runStore: RunStore;
    runCoordinator: RunCoordinator;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
    const value = useContext(WorkspaceContext);
    if (!value) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider");
    }
    return value;
}

export function useLayoutState<T>(selector: (state: LayoutState) => T): T {
    const { layoutStore } = useWorkspace();
    return useStore(layoutStore, selector);
}

export function useLayoutActions(): Pick<
    LayoutState,
    "setPreset" | "setRegionSizes" | "toggleCollapsed" | "setFullscreen" | "resetLayout"
> {
    const { layoutStore } = useWorkspace();
    const { setPreset, setRegionSizes, toggleCollapsed, setFullscreen, resetLayout } =
        layoutStore.getState();
    return { setPreset, setRegionSizes, toggleCollapsed, setFullscreen, resetLayout };
}

export function useVfsState<T>(selector: (state: VfsState) => T): T {
    const { vfsStore } = useWorkspace();
    return useStore(vfsStore, selector);
}

export function useVfsActions(): Pick<
    VfsState,
    "write" | "resetToStarting" | "setActiveFile" | "markSaved" | "initialize"
> {
    const { vfsStore } = useWorkspace();
    const { write, resetToStarting, setActiveFile, markSaved, initialize } = vfsStore.getState();
    return { write, resetToStarting, setActiveFile, markSaved, initialize };
}

export function useRunState<T>(selector: (state: RunState) => T): T {
    const { runStore } = useWorkspace();
    return useStore(runStore, selector);
}

export function useActivityState<T>(selector: (state: ActivityState) => T): T {
    const { activityStore } = useWorkspace();
    return useStore(activityStore, selector);
}
