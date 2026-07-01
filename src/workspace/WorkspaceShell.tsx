import { useId } from "react";
import { ActivityRail } from "./activity/ActivityRail";
import { focusedTask } from "./activity/activityStore";
import { LayoutRoot } from "./layout/LayoutRoot";
import { PanelHost } from "./layout/PanelHost";
import { listPresets } from "./layout/presets";
import type { LayoutPresetId, PanelId } from "./layout/types";
import { getPanelDescriptor } from "./panels/registry";
import { useAutoSave } from "./useAutoSave";
import {
    useActivityState,
    useLayoutActions,
    useLayoutState,
    useRunState,
    useVfsState,
    useWorkspace,
} from "./useWorkspace";
import styles from "./WorkspaceShell.module.css";

function renderPanel(panelId: PanelId) {
    const descriptor = getPanelDescriptor(panelId);
    const { Component } = descriptor;
    return (
        <PanelHost panelId={descriptor.id} title={descriptor.title} kind={descriptor.kind}>
            <Component />
        </PanelHost>
    );
}

export function WorkspaceShell() {
    const presetSelectId = useId();
    const presetId = useLayoutState((state) => state.presetId);
    const showHeaders = useLayoutState((state) => state.showHeaders);
    const { setPreset, resetLayout, toggleShowHeaders } = useLayoutActions();
    const { saving, error, flushNow } = useAutoSave();
    const hasDirty = useVfsState((state) => Object.keys(state.dirty).length > 0);
    const { runCoordinator } = useWorkspace();
    const runStatus = useRunState((state) => state.status);
    // Only code tasks are runnable (docs/architecture/02 §2.2).
    const runnable = useActivityState(
        (state) => (focusedTask(state)?.kind.type ?? "code") === "code",
    );

    const isRunning = runStatus === "running" || runStatus === "loading";

    const handleRun = async () => {
        await flushNow();
        await runCoordinator.run();
    };

    const saveStatus = error
        ? `Save failed: ${error}`
        : saving
          ? "Saving…"
          : hasDirty
            ? "Unsaved changes"
            : "All changes saved";

    return (
        <div className={styles.shell}>
            <header className={styles.toolbar}>
                <p className={styles.brand}>BlockPy</p>
                <button
                    type="button"
                    className={styles.runButton}
                    onClick={() => void handleRun()}
                    disabled={isRunning || !runnable}
                    title={runnable ? undefined : "There is no code to run in this task."}
                >
                    {runStatus === "loading" ? "Loading Python…" : "▶ Run"}
                </button>
                {isRunning || runStatus === "awaiting-input" ? (
                    <button
                        type="button"
                        className={styles.toolbarButton}
                        onClick={() => runCoordinator.interrupt()}
                    >
                        ■ Stop
                    </button>
                ) : null}
                <p className={styles.saveStatus} role="status">
                    {saveStatus}
                </p>
                <div className={styles.presetField}>
                    <label htmlFor={presetSelectId}>Layout</label>
                    <select
                        id={presetSelectId}
                        className={styles.presetSelect}
                        value={presetId}
                        onChange={(event) =>
                            setPreset(event.target.value as LayoutPresetId, { pin: true })
                        }
                    >
                        {listPresets().map((preset) => (
                            <option key={preset.id} value={preset.id}>
                                {preset.label}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="button" className={styles.toolbarButton} onClick={resetLayout}>
                    Reset layout
                </button>
                <button type="button" className={styles.toolbarButton} onClick={toggleShowHeaders}>
                    {showHeaders ? "Hide Headers" : "Show Headers"}
                </button>
            </header>
            <ActivityRail flushNow={flushNow} />
            <main className={styles.main}>
                <LayoutRoot renderPanel={renderPanel} />
            </main>
        </div>
    );
}
