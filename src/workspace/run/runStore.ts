// Per-mount run/console state (docs/architecture/05 §5).

import { createStore } from 'zustand/vanilla';
import type { Feedback } from '../../engine/feedback/feedbackEngine';

export type RunStatus = 'idle' | 'loading' | 'running' | 'awaiting-input' | 'ready' | 'failed';

export type ConsoleEntryKind =
  | 'stdout'
  | 'stderr'
  | 'separator'
  | 'echo'
  | 'result'
  | 'image'
  | 'notice';

export interface ConsoleEntry {
  id: number;
  kind: ConsoleEntryKind;
  text: string;
  /** Logical run attempt; replays clear the previous attempt's entries. */
  epoch: number;
}

const MAX_CONSOLE_ENTRIES = 2000;

export interface RunState {
  entries: ConsoleEntry[];
  status: RunStatus;
  feedback: Feedback | null;
  /** Prompt of a pending input() request, when status is awaiting-input. */
  inputPrompt: string | null;
  append(kind: ConsoleEntryKind, text: string, epoch: number): void;
  clearEpoch(epoch: number): void;
  clearConsole(): void;
  setStatus(status: RunStatus): void;
  setFeedback(feedback: Feedback | null): void;
  setInputPrompt(prompt: string | null): void;
}

export type RunStore = ReturnType<typeof createRunStore>;

export function createRunStore() {
  let nextId = 1;
  return createStore<RunState>()((set) => ({
    entries: [],
    status: 'idle',
    feedback: null,
    inputPrompt: null,

    append: (kind, text, epoch) =>
      set((state) => {
        const entries = [...state.entries, { id: nextId++, kind, text, epoch }];
        return {
          entries:
            entries.length > MAX_CONSOLE_ENTRIES
              ? entries.slice(entries.length - MAX_CONSOLE_ENTRIES)
              : entries,
        };
      }),

    clearEpoch: (epoch) =>
      set((state) => ({
        // Keep separators so the "Run N" marker survives input() replays.
        entries: state.entries.filter(
          (entry) => entry.epoch !== epoch || entry.kind === 'separator',
        ),
      })),

    clearConsole: () => set({ entries: [] }),
    setStatus: (status) => set({ status }),
    setFeedback: (feedback) => set({ feedback }),
    setInputPrompt: (inputPrompt) => set({ inputPrompt }),
  }));
}
