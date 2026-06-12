// Debounced save pipeline (docs/architecture/04 §4): VFS writes mark files
// dirty; this hook batches dirty files after a quiet period, maps each to a
// save_file payload, and clears dirty flags on success. Failures keep files
// dirty so the next edit or flush retries.

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveFile } from '../api/endpoints/submissions';
import type { SaveFileParams } from '../api/endpoints/submissions';
import { useApi } from '../api/useApi';
import { planSave } from '../vfs/savePlan';
import { useWorkspace } from './useWorkspace';

const DEFAULT_DEBOUNCE_MS = 1500;

export interface AutoSaveStatus {
  /** True while a save batch is in flight. */
  saving: boolean;
  /** Message of the last failed batch, cleared on the next success. */
  error: string | null;
  /** Saves all dirty files immediately (e.g. before run/submit). */
  flushNow: () => Promise<void>;
}

export function useAutoSave(debounceMs = DEFAULT_DEBOUNCE_MS): AutoSaveStatus {
  const { client, events } = useApi();
  const { vfsStore, saveIds } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef<Promise<void> | null>(null);

  const flushNow = useCallback(async (): Promise<void> => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Serialize batches; a concurrent flush joins the in-flight one.
    if (flushingRef.current) {
      return flushingRef.current;
    }
    const run = (async () => {
      const { files, dirty, markSaved } = vfsStore.getState();
      const dirtyKeys = Object.keys(dirty);
      if (dirtyKeys.length === 0) {
        return;
      }
      // Group by wire filename: several dirty bundle members collapse into
      // one re-serialized bundle save.
      const batches = new Map<string, { plan: SaveFileParams; keys: string[] }>();
      for (const key of dirtyKeys) {
        const [namespace, ...nameParts] = key.split(':');
        const name = nameParts.join(':');
        const file = files.find((f) => f.namespace === namespace && f.name === name);
        if (!file) {
          markSaved(key);
          continue;
        }
        const plan = planSave(file, files, saveIds);
        if (!plan) {
          markSaved(key);
          continue;
        }
        const batch = batches.get(plan.filename);
        if (batch) {
          batch.keys.push(key);
        } else {
          batches.set(plan.filename, { plan, keys: [key] });
        }
      }
      if (batches.size === 0) {
        return;
      }
      setSaving(true);
      try {
        for (const { plan, keys } of batches.values()) {
          await saveFile(client, plan);
          for (const key of keys) {
            markSaved(key);
          }
          events.log({
            event_type: 'File.Edit',
            file_path: plan.filename,
            category: 'save',
            label: '',
            message: '',
          });
        }
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    })();
    flushingRef.current = run.finally(() => {
      flushingRef.current = null;
    });
    return flushingRef.current;
  }, [client, events, saveIds, vfsStore]);

  useEffect(() => {
    const unsubscribe = vfsStore.subscribe((state, previous) => {
      if (state.dirty === previous.dirty || Object.keys(state.dirty).length === 0) {
        return;
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flushNow();
      }, debounceMs);
    });
    return () => {
      unsubscribe();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [vfsStore, flushNow, debounceMs]);

  return { saving, error, flushNow };
}
