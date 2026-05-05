// Shared types for the blockpy editor

export type SyncSource = 'blocks' | 'text' | 'external';

export interface ParseResult {
  success: boolean;
  blocksXml?: string;
  errors: TranslationError[];
}

export interface TranslationError {
  type: 'parse_error' | 'unsupported_syntax' | 'runtime_error' | 'sync_conflict';
  message: string;
  nodeType?: string;
  location?: SourceLocation;
  sourceExcerpt?: string;
}

export interface SourceLocation {
  line: number;
  col: number;
  endLine?: number;
  endCol?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  returnValue?: unknown;
  error?: RuntimeError;
  executionTime: number;
}

export interface RuntimeError {
  type: string;
  message: string;
  traceback: string;
}

export interface SyncState {
  source: SyncSource;
  isDirty: boolean;
  lastValidBlocksXml: string;
  lastValidPython: string;
  isParsing: boolean;
  parseErrors: TranslationError[];
}

export interface UnsupportedSyntaxError extends TranslationError {
  type: 'unsupported_syntax';
  nodeType: string;
  location: SourceLocation;
  sourceExcerpt: string;
}
