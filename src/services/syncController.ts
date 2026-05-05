import type { SyncSource, SyncState, TranslationError } from '../types';
import { pythonToBlocks } from './pythonToBlocks';

const DEBOUNCE_MS = 300;

export interface SyncController {
  onTextChange: (text: string) => void;
  onBlocksChange: (blocksXml: string, generatedCode: string) => void;
  getState: () => SyncState;
  reset: () => void;
  dispose: () => void;
}

export interface SyncCallbacks {
  onCodeUpdate: (code: string) => void;
  onBlocksUpdate: (blocksXml: string, errors: TranslationError[]) => void;
  onParseErrors: (errors: TranslationError[]) => void;
  onSyncStateChange: (state: SyncState) => void;
}

// Suppress unused warning - SyncSource is re-exported for use in other modules
export type { SyncSource };

export function createSyncController(callbacks: SyncCallbacks): SyncController {
  let state: SyncState = {
    source: 'external',
    isDirty: false,
    lastValidBlocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
    lastValidPython: '',
    isParsing: false,
    parseErrors: [],
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isUpdating = false;

  function setState(updates: Partial<SyncState>): void {
    state = { ...state, ...updates };
    callbacks.onSyncStateChange(state);
  }

  function onTextChange(text: string): void {
    if (isUpdating) return;
    setState({ source: 'text', isDirty: true });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      parseAndUpdateBlocks(text);
    }, DEBOUNCE_MS);
  }

  function parseAndUpdateBlocks(text: string): void {
    if (isUpdating) return;
    isUpdating = true;
    setState({ isParsing: true });

    try {
      const result = pythonToBlocks(text);
      if (result.success && result.blocksXml) {
        setState({
          lastValidBlocksXml: result.blocksXml,
          lastValidPython: text,
          parseErrors: result.errors,
          isParsing: false,
        });
        callbacks.onBlocksUpdate(result.blocksXml, result.errors);
      } else {
        setState({ parseErrors: result.errors, isParsing: false });
        callbacks.onParseErrors(result.errors);
      }
    } finally {
      isUpdating = false;
    }
  }

  function onBlocksChange(blocksXml: string, generatedCode: string): void {
    if (isUpdating) return;
    isUpdating = true;

    try {
      setState({
        source: 'blocks',
        isDirty: true,
        lastValidBlocksXml: blocksXml,
        lastValidPython: generatedCode,
        parseErrors: [],
      });
      callbacks.onCodeUpdate(generatedCode);
    } finally {
      isUpdating = false;
    }
  }

  function reset(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    isUpdating = false;
    state = {
      source: 'external',
      isDirty: false,
      lastValidBlocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
      lastValidPython: '',
      isParsing: false,
      parseErrors: [],
    };
    callbacks.onSyncStateChange(state);
  }

  function dispose(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  return {
    onTextChange,
    onBlocksChange,
    getState: () => ({ ...state }),
    reset,
    dispose,
  };
}
