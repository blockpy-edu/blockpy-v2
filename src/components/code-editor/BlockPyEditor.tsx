import { useState, useCallback, useEffect, useRef } from 'react';
import { BlocklyWorkspace } from './BlocklyWorkspace';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { createSyncController } from '../../services/mlt/syncController';
import { pythonToBlocks } from '../../services/mlt/pythonToBlocks';
import { loadPyodide, runPython, isPyodideLoaded } from '../../services/python/pyodideRunner';
import { isCorrectRun } from '../../embed/config';
import type {
  SyncState,
  TranslationError,
  ExecutionResult,
  BlockPyResolvedConfig,
  BlockPyRunContext,
} from '../../types';

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
  const [submissionCorrectness, setSubmissionCorrectness] = useState<boolean | null>(
    config.initialState.submission.correctness,
  );
  const [submissionStatus, setSubmissionStatus] = useState(config.initialState.submission.status);
  const [syncState, setSyncState] = useState<SyncState>({
    source: 'external',
    isDirty: false,
    lastValidBlocksXml: initialBlocksXml,
    lastValidPython: initialCode,
    isParsing: false,
    parseErrors: initialParseResult.errors,
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
  const callbacks = config.callbacks;

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

  const currentState = {
    ...config.initialState,
    submission: {
      ...config.initialState.submission,
      code,
      correctness: submissionCorrectness,
      status: submissionStatus,
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

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setSubmissionStatus('running');
    setOutput('');
    setExecutionError(null);
    setHasRun(true);
    callbacks.onRunStart?.({
      ...currentState,
      submission: {
        ...currentState.submission,
        status: 'running',
      },
    });

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

      const runContext: BlockPyRunContext = {
        result,
        state: {
          ...currentState,
          submission: {
            ...currentState.submission,
            status: result.error || result.stderr ? 'error' : 'completed',
          },
        },
        code,
        parseErrors,
      };

      const succeeded = isCorrectRun(runContext, config);
      setSubmissionCorrectness(succeeded);
      setSubmissionStatus(result.error || result.stderr ? 'error' : 'completed');
      callbacks.onRunComplete?.(runContext);
      if (succeeded) {
        callbacks.onRunSuccess?.(runContext);
      }
    } catch (e) {
      setExecutionError(e instanceof Error ? e.message : String(e));
      setSubmissionCorrectness(false);
      setSubmissionStatus('error');
    } finally {
      setIsRunning(false);
      setIsLoadingPyodide(false);
    }
  }, [callbacks, code, config, currentState, parseErrors]);

  const handleReset = useCallback(() => {
    setCode(initialCode);
    setOutput('');
    setExecutionError(null);
    setHasRun(false);
    setParseErrors(initialParseResult.errors);
    setBlocksXml(initialBlocksXml);
    setSubmissionCorrectness(config.initialState.submission.correctness);
    setSubmissionStatus(config.initialState.submission.status);
    syncControllerRef.current.reset();
    syncControllerRef.current.onTextChange(initialCode);
  }, [
    config.initialState.submission.correctness,
    config.initialState.submission.status,
    initialBlocksXml,
    initialCode,
    initialParseResult.errors,
  ]);

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
            <strong>BlockPy:</strong> {config.initialState.assignment.name}
          </span>
          <div className="blockpy-instructions">{config.initialState.assignment.instructions}</div>
        </div>
        <div className="blockpy-quick-menu" role="menubar" aria-label="Quick Menu">
          {config.initialState.runtime.partId
            ? `Part ${config.initialState.runtime.partId}`
            : 'No submission required.'}
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
