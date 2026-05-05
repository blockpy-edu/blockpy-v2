import { useState, useCallback, useEffect, useRef } from 'react';
import { BlocklyWorkspace } from './BlocklyWorkspace';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { createSyncController } from '../services/syncController';
import { loadPyodide, runPython, isPyodideLoaded } from '../services/pyodideRunner';
import type { SyncState, TranslationError, ExecutionResult } from '../types';

const INITIAL_CODE = `x = 5\nprint(x)\n`;

export function BlockPyEditor() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [blocksXml, setBlocksXml] = useState<string | undefined>(undefined);
  const [syncState, setSyncState] = useState<SyncState>({
    source: 'external',
    isDirty: false,
    lastValidBlocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
    lastValidPython: INITIAL_CODE,
    isParsing: false,
    parseErrors: [],
  });
  const [output, setOutput] = useState('');
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
  const [parseErrors, setParseErrors] = useState<TranslationError[]>([]);
  const [hasRun, setHasRun] = useState(false);

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
    setParseErrors([]);
    setBlocksXml(undefined);
    syncControllerRef.current.reset();
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
            {executionError && (
              <span className="error-line">{executionError}</span>
            )}
          </div>
        </div>

        {/* Feedback */}
        <div className="blockpy-feedback-panel" role="region" aria-label="Feedback" aria-live="polite">
          <strong>
            Feedback:{' '}
            <span className={feedbackBadgeClass}>{feedbackCategory}</span>
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
                        {' '}(line {err.location.line}, col {err.location.col})
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
        <div className="editor-panes">
          <div className="editor-pane" aria-label="Block editor pane">
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

          <div className="editor-divider" role="separator" aria-orientation="vertical" />

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
