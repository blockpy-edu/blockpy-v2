import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Blockly - it relies on DOM/canvas APIs not available in jsdom
vi.mock('blockly', () => ({
  default: {
    Blocks: {},
    inject: vi.fn(() => ({
      addChangeListener: vi.fn(),
      dispose: vi.fn(),
      clear: vi.fn(),
      getTopBlocks: vi.fn(() => []),
    })),
    Events: {
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
  },
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

vi.mock('@codemirror/lang-python', async () => {
  // We still need the real parser for pythonToBlocks - only mock the python() extension
  const real =
    await vi.importActual<typeof import('@codemirror/lang-python')>('@codemirror/lang-python');
  return {
    ...real,
    python: vi.fn(() => ({})),
  };
});

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {},
}));

vi.mock('@codemirror/language', () => ({
  syntaxHighlighting: vi.fn(() => ({})),
  defaultHighlightStyle: {},
}));

// Mock pyodide runner - CDN-based, no npm package
vi.mock('../services/pyodideRunner', () => ({
  loadPyodide: vi.fn().mockResolvedValue(undefined),
  runPython: vi.fn().mockResolvedValue({ stdout: 'test output', stderr: '', executionTime: 5 }),
  isPyodideLoaded: vi.fn().mockReturnValue(false),
  resetPyodide: vi.fn(),
}));

import { BlockPyEditor } from '../code-editor/BlockPyEditor';

describe('BlockPyEditor', () => {
  it('renders without crashing', () => {
    render(<BlockPyEditor />);
    // Should render the main container
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the toolbar with run and reset buttons', () => {
    render(<BlockPyEditor />);
    expect(screen.getByLabelText('Run Python code')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset editor to initial state')).toBeInTheDocument();
  });

  it('renders editor panes', () => {
    render(<BlockPyEditor />);
    expect(screen.getByLabelText('Block editor pane')).toBeInTheDocument();
    expect(screen.getByLabelText('Code editor pane')).toBeInTheDocument();
  });

  it('renders output panel', () => {
    render(<BlockPyEditor />);
    expect(screen.getByLabelText('Console')).toBeInTheDocument();
  });

  it('shows placeholder text in output panel initially', () => {
    render(<BlockPyEditor />);
    expect(screen.getByText('Run your code to see output here')).toBeInTheDocument();
  });

  it('run button is enabled initially', () => {
    render(<BlockPyEditor />);
    const runBtn = screen.getByLabelText('Run Python code');
    expect(runBtn).not.toBeDisabled();
  });

  it('has correct aria labels for accessibility', () => {
    render(<BlockPyEditor />);
    expect(screen.getByRole('main', { name: 'BlockPy dual Python editor' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Editor controls' })).toBeInTheDocument();
  });
});
