import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resolveBlockPyConfig } from '../../embed/config';

const { runPythonMock } = vi.hoisted(() => ({
  runPythonMock: vi.fn().mockResolvedValue({ stdout: 'ok', stderr: '', executionTime: 5 }),
}));

// Mock Blockly - it relies on DOM/canvas APIs not available in jsdom
vi.mock('blockly/core', () => ({
  Blocks: {},
  inject: vi.fn(() => ({
    addChangeListener: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
    getTopBlocks: vi.fn(() => []),
  })),
  Events: {
    disable: vi.fn(),
    enable: vi.fn(),
    BLOCK_MOVE: 'move',
    BLOCK_CHANGE: 'change',
    BLOCK_DELETE: 'delete',
    BLOCK_CREATE: 'create',
  },
  Xml: {
    workspaceToDom: vi.fn(() => ({})),
    domToText: vi.fn(() => '<xml></xml>'),
    textToDom: vi.fn(() => ({})),
    domToWorkspace: vi.fn(),
  },
  utils: {
    xml: {
      textToDom: vi.fn(() => ({})),
    },
  },
  svgResize: vi.fn(),
  setLocale: vi.fn(),
}));

vi.mock('blockly/msg/en', () => ({
  default: {},
}));

vi.mock('../../services/mlt/pythonBlocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/mlt/pythonBlocks')>();
  return {
    ...actual,
    registerPythonBlocks: vi.fn(),
    PYTHON_TOOLBOX: '<xml></xml>',
  };
});

vi.mock('../../services/mlt/blockToPython', () => ({
  workspaceToPython: vi.fn(() => ({ code: 'print(1)' })),
}));

// Mock CodeMirror - uses DOM APIs
vi.mock('@codemirror/view', () => ({
  EditorView: class EditorView {
    static updateListener = { of: vi.fn(() => ({})) };
    static theme = vi.fn(() => ({}));
    constructor() {}
    destroy = vi.fn();
    dispatch = vi.fn();
    state = { doc: { toString: () => '', length: 0 } };
  },
  keymap: { of: vi.fn(() => ({})) },
  lineNumbers: vi.fn(() => ({})),
  drawSelection: vi.fn(() => ({})),
  highlightActiveLine: vi.fn(() => ({})),
}));

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({})),
    readOnly: { of: vi.fn(() => ({})) },
  },
}));

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  history: vi.fn(() => ({})),
  historyKeymap: [],
}));

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {},
}));

vi.mock('@codemirror/language', () => ({
  syntaxHighlighting: vi.fn(() => ({})),
  defaultHighlightStyle: {},
}));

// Mock pyodide runner - CDN-based, no npm package
vi.mock('../../services/python/pyodideRunner', () => ({
  loadPyodide: vi.fn().mockResolvedValue(undefined),
  runPython: runPythonMock,
  isPyodideLoaded: vi.fn().mockReturnValue(false),
  resetPyodide: vi.fn(),
}));

import { BlockPyEditor } from '../code-editor/BlockPyEditor';

function makeConfig(overrides?: Parameters<typeof resolveBlockPyConfig>[0]) {
  return resolveBlockPyConfig(overrides);
}

describe('BlockPyEditor', () => {
  it('renders without crashing', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the toolbar with run and reset buttons', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    expect(screen.getByLabelText('Run Python code')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset editor to initial state')).toBeInTheDocument();
  });

  it('renders editor panes', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    expect(screen.getByLabelText('Block editor pane')).toBeInTheDocument();
    expect(screen.getByLabelText('Code editor pane')).toBeInTheDocument();
  });

  it('renders output panel', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    expect(screen.getByLabelText('Console')).toBeInTheDocument();
  });

  it('shows placeholder text in output panel initially', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    expect(screen.getByText('Run your code to see output here')).toBeInTheDocument();
  });

  it('run button is enabled initially', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    const runBtn = screen.getByLabelText('Run Python code');
    expect(runBtn).not.toBeDisabled();
  });

  it('has correct aria labels for accessibility', () => {
    render(<BlockPyEditor config={makeConfig()} />);
    expect(screen.getByRole('main', { name: 'BlockPy dual Python editor' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Editor controls' })).toBeInTheDocument();
  });

  it('calls success callback on correct run', async () => {
    const onRunSuccess = vi.fn();
    const onRunComplete = vi.fn();

    render(
      <BlockPyEditor
        config={makeConfig({
          callbacks: { onRunSuccess, onRunComplete },
          runtime: { expectedOutput: 'ok' },
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText('Run Python code'));

    await waitFor(() => {
      expect(onRunComplete).toHaveBeenCalledTimes(1);
      expect(onRunSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
