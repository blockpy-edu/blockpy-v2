import { useMemo } from 'react';
import { BlockPyEditor } from '../../components/code-editor/BlockPyEditor';
import { MAIN_STUDENT_FILE, STARTING_CODE_FILE, canWrite, readFile } from '../../vfs/vfs';
import { focusedTask } from '../activity/activityStore';
import { useActivityState, useVfsState, useWorkspace } from '../useWorkspace';
import styles from './EditorPanel.module.css';
import type { BlockPyResolvedConfig } from '../../types';

/**
 * Binds the editor to the VFS (docs/architecture/04 §4): answer.py opens in
 * the block/text BlockPy editor; other files open in a plain text editor.
 * Edits flow into the VFS store, which marks files dirty for auto-save.
 * `externalRevision` re-seeds the editor after loads/resets.
 */
export function EditorPanel() {
  const { config, vfsStore, vfsRole } = useWorkspace();
  const focusedTaskId = useActivityState((state) => state.focusedTaskId);
  const kindType = useActivityState((state) => focusedTask(state)?.kind.type ?? 'code');
  const activeFileName = useVfsState((state) => state.activeFileName);
  const externalRevision = useVfsState((state) => state.externalRevision);

  const editorConfig = useMemo<BlockPyResolvedConfig>(() => {
    const { files } = vfsStore.getState();
    const answer = readFile(files, MAIN_STUDENT_FILE, 'student');
    const starting = readFile(files, STARTING_CODE_FILE, 'starting');
    return {
      ...config,
      initialState: {
        ...config.initialState,
        assignment: {
          ...config.initialState.assignment,
          // The focused task's starting code, not the mount default.
          startingCode: starting?.content ?? '',
        },
        submission: {
          ...config.initialState.submission,
          code: answer?.content ?? '',
        },
      },
      callbacks: {
        ...config.callbacks,
        onStateChange: (state) => {
          vfsStore.getState().write(MAIN_STUDENT_FILE, state.submission.code, vfsRole);
          config.callbacks.onStateChange?.(state);
        },
      },
    };
    // externalRevision intentionally re-seeds the editor from the VFS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, vfsStore, vfsRole, externalRevision]);

  // Reading/quiz/explain/textbook tasks own their content; the code editor
  // shows an empty state instead (docs/architecture/02 §2.2).
  if (kindType !== 'code' && kindType !== 'unsupported') {
    return <p className={styles.missing}>There is no code in this task.</p>;
  }
  if (activeFileName === MAIN_STUDENT_FILE) {
    // Task switches swap the VFS store; remount so the new store's
    // revision counter (which restarts at 0) re-seeds the editor.
    return <BlockPyEditor key={`${focusedTaskId}-${externalRevision}`} config={editorConfig} />;
  }
  return <TextFileEditor name={activeFileName} />;
}

function TextFileEditor({ name }: { name: string }) {
  const { vfsRole } = useWorkspace();
  const file = useVfsState((state) => readFile(state.files, name));
  const write = useVfsState((state) => state.write);

  if (!file) {
    return <p className={styles.missing}>File “{name}” was not found.</p>;
  }
  const readOnly = !canWrite(file, vfsRole);
  return (
    <div className={styles.textEditor}>
      <textarea
        className={styles.textArea}
        aria-label={`Contents of ${file.name}${readOnly ? ' (read-only)' : ''}`}
        value={file.content}
        readOnly={readOnly}
        onChange={(event) => write(file.name, event.target.value, vfsRole)}
        spellCheck={false}
      />
      {readOnly ? <p className={styles.readOnlyNote}>This file is read-only.</p> : null}
    </div>
  );
}
