import { useEffect, useId, useRef, useState } from "react";
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

export function WorkspaceShell() {
    const shellRef = useRef<HTMLDivElement>(null);
    const presetSelectId = useId();
    const presetId = useLayoutState((state) => state.presetId);
    const showHeaders = useLayoutState((state) => state.showHeaders);
    const { setPreset, resetLayout, toggleShowHeaders } = useLayoutActions();
    const { saving, error, flushNow } = useAutoSave();
    const hasDirty = useVfsState((state) => Object.keys(state.dirty).length > 0);
    const { runCoordinator, config } = useWorkspace();
    const runStatus = useRunState((state) => state.status);
    // Code (python) and kettle (typescript) tasks are runnable
    // (docs/architecture/02 §2.2).
    const runnable = useActivityState((state) => {
        const kind = focusedTask(state)?.kind.type ?? "code";
        return kind === "code" || kind === "kettle";
    });
    const [sizingMode, setSizingMode] = useState(config.initialState.display.sizingMode);
    const contentSized = sizingMode === "content";

    // Re-derive the sizing mode when a new config is mounted (adjusting
    // state during render instead of in an effect — react.dev pattern).
    const [prevConfig, setPrevConfig] = useState(config);
    if (prevConfig !== config) {
        setPrevConfig(config);
        setSizingMode(config.initialState.display.sizingMode);
    }

    const renderPanel = (panelId: PanelId) => {
        const descriptor = getPanelDescriptor(panelId);
        const { Component } = descriptor;
        return (
            <PanelHost
                panelId={descriptor.id}
                title={descriptor.title}
                kind={descriptor.kind}
                contentSized={contentSized}
            >
                <Component />
            </PanelHost>
        );
    };

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

    useEffect(() => {
        if (!contentSized || typeof ResizeObserver === "undefined") {
            return;
        }

        const root = shellRef.current;
        if (!root || window.parent === window) {
            return;
        }

        let lastHeight = -1;
        const notify = () => {
            const nextHeight = Math.ceil(root.scrollHeight);
            if (nextHeight <= 0 || nextHeight === lastHeight) {
                return;
            }
            lastHeight = nextHeight;
            window.parent.postMessage({ subject: "lti.frameResize", height: nextHeight }, "*");
            window.parent.postMessage({ type: "lti.frameResize", height: nextHeight }, "*");
        };

        const observer = new ResizeObserver(() => {
            notify();
        });

        observer.observe(root);
        notify();

        return () => observer.disconnect();
    }, [contentSized]);

    return (
        <div
            ref={shellRef}
            className={contentSized ? `${styles.shell} ${styles.shellContent}` : styles.shell}
        >
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
                <button
                    type="button"
                    className={styles.toolbarButton}
                    aria-pressed={contentSized}
                    onClick={() =>
                        setSizingMode((current) => (current === "content" ? "stretch" : "content"))
                    }
                >
                    {contentSized ? "Use stretch sizing" : "Use content sizing"}
                </button>
            </header>
            <ActivityRail flushNow={flushNow} />
            <main className={contentSized ? `${styles.main} ${styles.mainContent}` : styles.main}>
                <LayoutRoot renderPanel={renderPanel} contentSized={contentSized} />
            </main>
        </div>
    );
}
