// Per-mount VFS store (docs/architecture/04 §4). Created in
// WorkspaceProvider alongside the layout store; same vanilla-zustand pattern.

import { createStore } from 'zustand/vanilla';
import { canWrite, MAIN_STUDENT_FILE, STARTING_CODE_FILE } from './vfs';
import type { VfsFile, VfsRole, WriteResult } from './types';

export interface VfsState {
  files: VfsFile[];
  /** File currently open in the editor panel. */
  activeFileName: string;
  /** Names with unsaved changes (display name, namespace-qualified key). */
  dirty: Record<string, true>;
  /**
   * Bumped whenever file contents change from outside the editor (load,
   * reset-to-start) so editor views can re-seed themselves.
   */
  externalRevision: number;
  initialize: (files: VfsFile[]) => void;
  write: (name: string, content: string, role: VfsRole) => WriteResult;
  markSaved: (dirtyKey: string) => void;
  /** Story 4.4: replace student files from the starting namespace. */
  resetToStarting: () => void;
  setActiveFile: (name: string) => void;
}

export function dirtyKey(file: Pick<VfsFile, 'name' | 'namespace'>): string {
  return `${file.namespace}:${file.name}`;
}

export type VfsStore = ReturnType<typeof createVfsStore>;

export function createVfsStore(initialFiles: VfsFile[]) {
  return createStore<VfsState>()((set, get) => ({
    files: initialFiles,
    activeFileName: MAIN_STUDENT_FILE,
    dirty: {},
    externalRevision: 0,

    initialize: (files) =>
      set((state) => ({
        files,
        dirty: {},
        externalRevision: state.externalRevision + 1,
        activeFileName: MAIN_STUDENT_FILE,
      })),

    write: (name, content, role) => {
      const { files } = get();
      const index = files.findIndex((file) => file.name === name && canWrite(file, role));
      if (index === -1) {
        const blocked = files.some((file) => file.name === name);
        return { ok: false, reason: blocked ? 'not-writable' : 'not-found' };
      }
      const existing = files[index];
      if (existing.content === content) {
        return { ok: true, file: existing };
      }
      const updated: VfsFile = { ...existing, content };
      set((state) => ({
        files: state.files.map((file, i) => (i === index ? updated : file)),
        dirty: { ...state.dirty, [dirtyKey(updated)]: true },
      }));
      return { ok: true, file: updated };
    },

    markSaved: (key) =>
      set((state) => {
        if (!(key in state.dirty)) {
          return state;
        }
        const next = { ...state.dirty };
        delete next[key];
        return { dirty: next };
      }),

    resetToStarting: () =>
      set((state) => {
        const dirty = { ...state.dirty };
        const files = state.files.map((file) => {
          if (file.namespace !== 'student') {
            return file;
          }
          const sourceName = file.name === MAIN_STUDENT_FILE ? STARTING_CODE_FILE : file.name;
          const source = state.files.find(
            (candidate) => candidate.namespace === 'starting' && candidate.name === sourceName,
          );
          const content = source?.content ?? '';
          if (content === file.content) {
            return file;
          }
          dirty[dirtyKey(file)] = true;
          return { ...file, content };
        });
        return { files, dirty, externalRevision: state.externalRevision + 1 };
      }),

    setActiveFile: (name) => set({ activeFileName: name }),
  }));
}
