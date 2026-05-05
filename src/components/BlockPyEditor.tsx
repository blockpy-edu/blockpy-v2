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
    return () => syncControllerRef.current.dispose();
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

    try {
      if (!isPyodideLoaded()) {
        setIsLoadingPyodide(true);
        await loadPyodide();
        setIsLoadingPyodide(false);
      }

      const result: ExecutionResult = await runPython(code);
      setOutput(result.stdout || '(no output)');
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
    setParseErrors([]);
    setBlocksXml(undefined);
    syncControllerRef.current.reset();
  }, []);

  // Expose syncState to avoid unused variable warning
  const syncSource = syncState.source;

  return (
    <div className="blockpy-editor" role="main" aria-label="BlockPy dual Python editor">
      {/* Toolbar */}
      <div className="toolbar" role="toolbar" aria-label="Editor controls">
        <button
          onClick={() => void handleRun()}
          disabled={isRunning}
          className="btn btn-primary"
          aria-label={isRunning ? 'Running Python code' : 'Run Python code'}
        >
          {isRunning
            ? isLoadingPyodide
              ? '\u23f3 Loading Pyodide...'
              : '\u23f3 Running...'
            : '\u25b6 Run'}
        </button>
        <button
          onClick={handleReset}
          className="btn btn-secondary"
          aria-label="Reset editor to initial state"
        >
          \ud83d\udd04 Reset
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

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="error-panel" role="alert" aria-label="Parse errors">
          <h3>\u26a0 Parse Issues</h3>
          <ul>
            {parseErrors.map((err, i) => (
              <li key={i} className={`error-item error-${err.type}`}>
                <strong>{err.type === 'unsupported_syntax' ? 'Unsupported' : 'Error'}:</strong>{' '}
                {err.message}
                {err.location && (
                  <span className="error-location">
                    {' '}
                    (line {err.location.line}, col {err.location.col})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Output panel */}
      <div className="output-panel" aria-label="Program output">
        <div className="panel-header">
          <h3>Output</h3>
          {output && (
            <button
              onClick={() => setOutput('')}
              className="btn btn-small"
              aria-label="Clear output"
            >
              \u2715 Clear
            </button>
          )}
        </div>
        <pre className="output-content" aria-live="polite">
          {output || (
            <span className="output-placeholder">Run your code to see output here</span>
          )}
        </pre>
        {executionError && (
          <pre className="error-content" role="alert">
            {executionError}
          </pre>
        )}
      </div>
    </div>
  );
}
