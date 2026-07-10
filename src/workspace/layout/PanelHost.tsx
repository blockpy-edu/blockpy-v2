import type { ReactNode } from "react";
import { useLayoutActions, useLayoutState } from "../useWorkspace";
import type { PanelId, PanelKind } from "./types";
import styles from "./PanelHost.module.css";

interface PanelHostProps {
    panelId: PanelId;
    title: string;
    kind: PanelKind;
    contentSized?: boolean;
    children: ReactNode;
}

export function PanelHost({
    panelId,
    title,
    kind,
    contentSized = false,
    children,
}: PanelHostProps) {
    const isCollapsed = useLayoutState((state) => state.collapsed[panelId] === true);
    const isFullscreen = useLayoutState((state) => state.fullscreenPanelId === panelId);
    const showHeaders = useLayoutState((state) => state.showHeaders);
    const { toggleCollapsed, setFullscreen } = useLayoutActions();

    const headingId = `blockpy-panel-${panelId}-title`;

    const contentSizedClass = contentSized ? styles.contentSized : "";
    const editorSizedClass = contentSized && panelId === "editor" ? styles.editorSized : "";

    return (
        <section
            aria-labelledby={headingId}
            className={
                isCollapsed
                    ? `${styles.panel} ${styles.collapsed} ${contentSizedClass} ${editorSizedClass}`.trim()
                    : `${styles.panel} ${contentSizedClass} ${editorSizedClass}`.trim()
            }
        >
            {showHeaders && (
                <div className={styles.header}>
                    <h2 id={headingId} className={styles.title}>
                        {title}
                    </h2>
                    <span className={styles.kindBadge}>{kind}</span>
                    <button
                        type="button"
                        className={styles.headerButton}
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${title}`}
                        onClick={() => toggleCollapsed(panelId)}
                    >
                        {isCollapsed ? `Expand` : `Collapse`}
                    </button>
                    <button
                        type="button"
                        className={styles.headerButton}
                        aria-label={`${isFullscreen ? "Exit fullscreen" : "Fullscreen"} ${title}`}
                        onClick={() => setFullscreen(isFullscreen ? null : panelId)}
                    >
                        {isFullscreen ? `Regular` : `Fullscreen`}
                    </button>
                </div>
            )}
            <div className={styles.body}>{children}</div>
        </section>
    );
}
