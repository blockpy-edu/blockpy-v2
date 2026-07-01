import { useState, useCallback, useEffect, useRef } from "react";
import { BlocklyWorkspace } from "./BlocklyWorkspace";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { createSyncController } from "../../services/mlt/syncController";
import { pythonToBlocks } from "../../services/mlt/pythonToBlocks";
import type { SyncState, BlockPyResolvedConfig } from "../../types";

const EMPTY_BLOCKS_XML = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
const MIN_LEFT_PANE_PERCENT = 20;
const MAX_LEFT_PANE_PERCENT = 80;

function clampPanePercent(value: number): number {
    return Math.min(MAX_LEFT_PANE_PERCENT, Math.max(MIN_LEFT_PANE_PERCENT, value));
}

interface BlockPyEditorProps {
    config: BlockPyResolvedConfig;
}

export function BlockPyEditor({ config }: BlockPyEditorProps) {
    const initialCode =
        config.initialState.submission.code || config.initialState.assignment.startingCode;
    const initialParseResult = pythonToBlocks(initialCode);
    const initialBlocksXml = initialParseResult.success
        ? (initialParseResult.blocksXml ?? EMPTY_BLOCKS_XML)
        : EMPTY_BLOCKS_XML;

    const [code, setCode] = useState(initialCode);
    const [blocksXml, setBlocksXml] = useState<string | undefined>(initialBlocksXml);
    const [syncState, setSyncState] = useState<SyncState>({
        source: "external",
        isDirty: false,
        lastValidBlocksXml: initialBlocksXml,
        lastValidPython: initialCode,
        isParsing: false,
        parseErrors: initialParseResult.errors,
    });
    const [leftPanePercent, setLeftPanePercent] = useState(50);
    const [isDraggingDivider, setIsDraggingDivider] = useState(false);
    const editorPanesRef = useRef<HTMLDivElement | null>(null);
    const draggingRef = useRef(false);
    const callbacks = config.callbacks;

    const syncControllerRef = useRef(
        createSyncController({
            onCodeUpdate: (newCode) => setCode(newCode),
            onBlocksUpdate: (xml) => setBlocksXml(xml),
            onParseErrors: () => {},
            onSyncStateChange: (state) => setSyncState(state),
        }),
    );

    useEffect(() => {
        const controller = syncControllerRef.current;
        return () => controller.dispose();
    }, []);

    const currentState = {
        ...config.initialState,
        submission: {
            ...config.initialState.submission,
            code,
        },
    };

    useEffect(() => {
        callbacks.onReady?.(currentState);
        // Intentionally mount-only callback.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        callbacks.onStateChange?.(currentState);
    }, [callbacks, currentState]);

    useEffect(() => {
        if (!isDraggingDivider) {
            return;
        }

        const previousUserSelect = document.body.style.userSelect;
        const previousCursor = document.body.style.cursor;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";

        return () => {
            document.body.style.userSelect = previousUserSelect;
            document.body.style.cursor = previousCursor;
        };
    }, [isDraggingDivider]);

    const updatePaneSplitFromClientX = useCallback((clientX: number) => {
        const panesElement = editorPanesRef.current;
        if (!panesElement) {
            return;
        }

        const rect = panesElement.getBoundingClientRect();
        if (rect.width <= 0) {
            return;
        }

        const rawPercent = ((clientX - rect.left) / rect.width) * 100;
        setLeftPanePercent(clampPanePercent(rawPercent));
    }, []);

    const handleDividerPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.pointerType === "mouse" && event.button !== 0) {
                return;
            }

            event.preventDefault();
            draggingRef.current = true;
            setIsDraggingDivider(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            updatePaneSplitFromClientX(event.clientX);
        },
        [updatePaneSplitFromClientX],
    );

    const handleDividerPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!draggingRef.current) {
                return;
            }
            updatePaneSplitFromClientX(event.clientX);
        },
        [updatePaneSplitFromClientX],
    );

    const stopDividerDrag = useCallback(() => {
        draggingRef.current = false;
        setIsDraggingDivider(false);
    }, []);

    const handleDividerKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const step = 2;

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            setLeftPanePercent((prev) => clampPanePercent(prev - step));
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            setLeftPanePercent((prev) => clampPanePercent(prev + step));
        }
    }, []);

    const handleTextChange = useCallback(
        (newCode: string) => {
            if (config.initialState.display.readOnly) {
                return;
            }
            setCode(newCode);
            syncControllerRef.current.onTextChange(newCode);
        },
        [config.initialState.display.readOnly],
    );

    const handleBlocksChange = useCallback(
        (newCode: string, newBlocksXml: string) => {
            if (config.initialState.display.readOnly) {
                return;
            }
            syncControllerRef.current.onBlocksChange(newBlocksXml, newCode);
        },
        [config.initialState.display.readOnly],
    );

    const syncSource = syncState.source;

    return (
        <div className="blockpy-editor" role="main" aria-label="BlockPy dual Python editor">
            {/* Toolbar + Editor panes */}
            <div className="blockpy-editor-row">
                {/* Toolbar */}
                <div className="toolbar" role="toolbar" aria-label="Editor controls">
                    <span className="sync-status" aria-live="polite">
                        {syncState.isParsing && (
                            <span className="status-parsing">\u23f3 Parsing...</span>
                        )}
                        {syncSource === "blocks" && !syncState.isParsing && (
                            <span className="status-blocks">\ud83e\udde9 Blocks \u2192 Text</span>
                        )}
                        {syncSource === "text" && !syncState.isParsing && (
                            <span className="status-text">\ud83d\udcdd Text \u2192 Blocks</span>
                        )}
                    </span>
                </div>

                {/* Editor panes */}
                <div
                    className={`editor-panes${isDraggingDivider ? " dragging" : ""}`}
                    ref={editorPanesRef}
                >
                    <div
                        className="editor-pane"
                        aria-label="Block editor pane"
                        style={{ flex: `0 0 ${leftPanePercent}%` }}
                    >
                        <div className="pane-header">
                            <h2>Blocks</h2>
                        </div>
                        <div className="pane-content">
                            <BlocklyWorkspace
                                blocksXml={blocksXml}
                                onCodeChange={handleBlocksChange}
                                readOnly={config.initialState.display.readOnly}
                                className="blockly-container"
                            />
                        </div>
                    </div>

                    <div
                        className="editor-divider"
                        role="separator"
                        aria-orientation="vertical"
                        aria-valuemin={MIN_LEFT_PANE_PERCENT}
                        aria-valuemax={MAX_LEFT_PANE_PERCENT}
                        aria-valuenow={Math.round(leftPanePercent)}
                        tabIndex={0}
                        onPointerDown={handleDividerPointerDown}
                        onPointerMove={handleDividerPointerMove}
                        onPointerUp={stopDividerDrag}
                        onPointerCancel={stopDividerDrag}
                        onLostPointerCapture={stopDividerDrag}
                        onKeyDown={handleDividerKeyDown}
                    />

                    <div className="editor-pane" aria-label="Code editor pane">
                        <div className="pane-header">
                            <h2>Python</h2>
                        </div>
                        <div className="pane-content">
                            <CodeMirrorEditor
                                value={code}
                                onChange={handleTextChange}
                                readOnly={config.initialState.display.readOnly}
                                className="codemirror-container"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
