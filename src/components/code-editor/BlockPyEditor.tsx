import { useState, useCallback, useEffect, useRef } from 'react';
import { BlocklyWorkspace } from './BlocklyWorkspace';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { createSyncController } from '../../services/mlt/syncController';
import { pythonToBlocks } from '../../services/mlt/pythonToBlocks';
import { loadPyodide, runPython, isPyodideLoaded } from '../../services/pyodideRunner';
import type { SyncState, TranslationError, ExecutionResult } from '../../types';

const INITIAL_CODE = `x = 5\nprint(x)\n`;
const EMPTY_BLOCKS_XML = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
const INITIAL_PARSE_RESULT = pythonToBlocks(INITIAL_CODE);
const INITIAL_BLOCKS_XML = INITIAL_PARSE_RESULT.success
  ? (INITIAL_PARSE_RESULT.blocksXml ?? EMPTY_BLOCKS_XML)
  : EMPTY_BLOCKS_XML;
const MIN_LEFT_PANE_PERCENT = 20;
const MAX_LEFT_PANE_PERCENT = 80;

function clampPanePercent(value: number): number {
  return Math.min(MAX_LEFT_PANE_PERCENT, Math.max(MIN_LEFT_PANE_PERCENT, value));
}

export function BlockPyEditor() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [blocksXml, setBlocksXml] = useState<string | undefined>(INITIAL_BLOCKS_XML);
  const [syncState, setSyncState] = useState<SyncState>({
    source: 'external',
    isDirty: false,
    lastValidBlocksXml: INITIAL_BLOCKS_XML,
    lastValidPython: INITIAL_CODE,
    isParsing: false,
    parseErrors: INITIAL_PARSE_RESULT.errors,
  });
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
  const [parseErrors, setParseErrors] = useState<TranslationError[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [leftPanePercent, setLeftPanePercent] = useState(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const editorPanesRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const syncControllerRef = useRef(
    createSyncController({
      onCodeUpdate: (newCode) => setCode(newCode),
      onBlocksUpdate: (xml, errors) => {
        setBlocksXml(xml);
        setParseErrors(errors);
      },
      onParseErrors: (errors) => setParseErrors(errors),
      onSyncStateChange: (state) => setSyncState(state),
    }),
  );

  useEffect(() => {
    const controller = syncControllerRef.current;
    return () => controller.dispose();
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) {
      return;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

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
      if (event.pointerType === 'mouse' && event.button !== 0) {
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

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setLeftPanePercent((prev) => clampPanePercent(prev - step));
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setLeftPanePercent((prev) => clampPanePercent(prev + step));
    }
  }, []);

  const handleTextChange = useCallback((newCode: string) => {
    setCode(newCode);
    syncControllerRef.current.onTextChange(newCode);
  }, []);

  const handleBlocksChange = useCallback((newCode: string, newBlocksXml: string) => {
    syncControllerRef.current.onBlocksChange(newBlocksXml, newCode);
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setExecutionError(null);
    setHasRun(true);

    try {
      if (!isPyodideLoaded()) {
        setIsLoadingPyodide(true);
        await loadPyodide();
        setIsLoadingPyodide(false);
      }

      const result: ExecutionResult = await runPython(code);
      setOutput(result.stdout || '');
      if (result.error) {
        setExecutionError(`${result.error.type}: ${result.error.message}`);
      }
      if (result.stderr) {
        setExecutionError((prev) => (prev ? prev + '\n' : '') + result.stderr);
      }
    } catch (e) {
      setExecutionError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
      setIsLoadingPyodide(false);
    }
  }, [code]);

  const handleReset = useCallback(() => {
    setCode(INITIAL_CODE);
    setOutput('');
    setExecutionError(null);
    setHasRun(false);
    setParseErrors(INITIAL_PARSE_RESULT.errors);
    setBlocksXml(INITIAL_BLOCKS_XML);
    syncControllerRef.current.reset();
    syncControllerRef.current.onTextChange(INITIAL_CODE);
  }, []);

  const syncSource = syncState.source;

  // Determine feedback badge
  const feedbackBadgeClass = executionError
    ? 'feedback-badge feedback-badge-error'
    : output
      ? 'feedback-badge feedback-badge-success'
      : 'feedback-badge feedback-badge-none';
  const feedbackCategory = executionError ? 'Error' : output ? 'No Errors' : 'Ready';

  return (
    <div className="blockpy-editor" role="main" aria-label="BlockPy dual Python editor">
      {/* Row 1: Problem description */}
      <div className="blockpy-header-row">
        <div className="blockpy-description" role="heading" aria-label="Assignment Description">
          <span className="blockpy-name">
            <strong>BlockPy:</strong> Python Editor
          </span>
          <div className="blockpy-instructions">
            Write Python code using blocks or text. Click <strong>Run</strong> to execute.
          </div>
        </div>
        <div className="blockpy-quick-menu" role="menubar" aria-label="Quick Menu">
          No submission required.
        </div>
      </div>

      {/* Row 2: Console + Feedback */}
      <div className="blockpy-second-row">
        {/* Console */}
        <div className="blockpy-console" role="region" aria-label="Console">
          <strong>Console:</strong>
          <div className="blockpy-printer" aria-live="polite">
            {output ? (
              output
            ) : executionError ? null : hasRun ? (
              <span className="output-placeholder">(no output)</span>
            ) : (
              <span className="output-placeholder">Run your code to see output here</span>
            )}
            {executionError && <span className="error-line">{executionError}</span>}
          </div>
        </div>

        {/* Feedback */}
        <div
          className="blockpy-feedback-panel"
          role="region"
          aria-label="Feedback"
          aria-live="polite"
        >
          <strong>
            Feedback: <span className={feedbackBadgeClass}>{feedbackCategory}</span>
          </strong>
          <div className="blockpy-feedback-content">
            {parseErrors.length > 0 ? (
              <div className="parse-errors">
                {parseErrors.map((err, i) => (
                  <div key={i} className="parse-error-item">
                    <strong>{err.type === 'unsupported_syntax' ? 'Unsupported' : 'Error'}:</strong>{' '}
                    {err.message}
                    {err.location && (
                      <span className="parse-error-location">
                        {' '}
                        (line {err.location.line}, col {err.location.col})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : executionError ? (
              <div className="feedback-message">{executionError}</div>
            ) : output ? (
              <div className="feedback-ready">Program ran successfully.</div>
            ) : (
              <div className="feedback-ready">Ready</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Toolbar + Editor panes */}
      <div className="blockpy-editor-row">
        {/* Toolbar */}
        <div className="toolbar" role="toolbar" aria-label="Editor controls">
          <button
            onClick={() => void handleRun()}
            disabled={isRunning}
            className={`btn btn-run${isRunning ? ' running' : ''}`}
            aria-label={isRunning ? 'Running Python code' : 'Run Python code'}
          >
            {isRunning
              ? isLoadingPyodide
                ? '\u23f3 Loading...'
                : '\u23f3 Running...'
              : '\u25b6 Run'}
          </button>
          <button
            onClick={handleReset}
            className="btn btn-secondary"
            aria-label="Reset editor to initial state"
          >
            Reset
          </button>
          <span className="sync-status" aria-live="polite">
            {syncState.isParsing && <span className="status-parsing">\u23f3 Parsing...</span>}
            {syncSource === 'blocks' && !syncState.isParsing && (
              <span className="status-blocks">\ud83e\udde9 Blocks \u2192 Text</span>
            )}
            {syncSource === 'text' && !syncState.isParsing && (
              <span className="status-text">\ud83d\udcdd Text \u2192 Blocks</span>
            )}
          </span>
        </div>

        {/* Editor panes */}
        <div className={`editor-panes${isDraggingDivider ? ' dragging' : ''}`} ref={editorPanesRef}>
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
                className="codemirror-container"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
