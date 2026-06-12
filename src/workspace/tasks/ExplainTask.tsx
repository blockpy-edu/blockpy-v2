// Explain tasks (docs/architecture/06 §4): the target code renders read-only;
// students annotate line ranges with prose explanations. The ExplainSubmission
// JSON persists through the normal answer.py pipeline; grading is manual.

import { useMemo, useState } from 'react';
import { updateSubmissionStatus } from '../../api/endpoints/submissions';
import { useApi } from '../../api/useApi';
import { CodeMirrorEditor } from '../../components/code-editor/CodeMirrorEditor';
import { parseExplainSubmission, serializeExplainSubmission } from '../../domain/explain';
import type { ExplainSubmission } from '../../domain/explain';
import { MAIN_STUDENT_FILE, STARTING_CODE_FILE, readFile } from '../../vfs/vfs';
import { useActivityState, useVfsState, useWorkspace } from '../useWorkspace';
import type { ActivityTask } from '../../domain/activity';
import styles from './ExplainTask.module.css';

interface ExplainTaskProps {
  task: ActivityTask;
}

export function ExplainTask({ task }: ExplainTaskProps) {
  const { vfsStore, vfsRole, saveIds, activityStore } = useWorkspace();
  const { client } = useApi();
  const status = useActivityState((state) => state.statuses[task.assignmentId] ?? 'untouched');
  const targetCode = useVfsState(
    (state) => readFile(state.files, STARTING_CODE_FILE, 'starting')?.content ?? '',
  );
  const answerJson = useVfsState(
    (state) => readFile(state.files, MAIN_STUDENT_FILE, 'student')?.content ?? '',
  );
  const submission = useMemo(() => parseExplainSubmission(answerJson), [answerJson]);
  const lineCount = Math.max(1, targetCode.split('\n').length);
  const [firstLine, setFirstLine] = useState('1');
  const [lastLine, setLastLine] = useState('1');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitted = status === 'complete' || status === 'graded';

  const write = (updated: ExplainSubmission) => {
    vfsStore.getState().write(MAIN_STUDENT_FILE, serializeExplainSubmission(updated), vfsRole);
  };

  const handleAdd = () => {
    const first = Number.parseInt(firstLine, 10);
    const last = Number.parseInt(lastLine, 10);
    if (
      Number.isNaN(first) ||
      Number.isNaN(last) ||
      first < 1 ||
      last > lineCount ||
      first > last
    ) {
      setRangeError(`Enter a line range between 1 and ${lineCount}.`);
      return;
    }
    setRangeError(null);
    write({
      annotations: [
        ...submission.annotations,
        {
          id: `${Date.now()}-${submission.annotations.length}`,
          firstLine: first,
          lastLine: last,
          explanation: '',
        },
      ],
    });
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      if (saveIds.submissionId !== null) {
        // Manual grading: PendingManual on the server side.
        await updateSubmissionStatus(client, {
          submissionId: saveIds.submissionId,
          status: 'Submitted',
        });
      }
      activityStore.getState().setStatus(task.assignmentId, 'complete');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Submitting failed.');
    }
  };

  return (
    <div className={styles.explain}>
      <p className={styles.hint}>
        Read the code below, then explain what the important parts do, line range by line range.
      </p>
      <CodeMirrorEditor value={targetCode} onChange={() => undefined} readOnly />
      <h3 className={styles.heading}>Your explanations</h3>
      {submission.annotations.length === 0 ? (
        <p className={styles.note}>No explanations yet.</p>
      ) : (
        <ul className={styles.annotationList}>
          {submission.annotations.map((annotation) => (
            <li key={annotation.id} className={styles.annotation}>
              <p className={styles.annotationHeader}>
                <span>
                  Lines {annotation.firstLine}–{annotation.lastLine}
                </span>
                {!submitted ? (
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() =>
                      write({
                        annotations: submission.annotations.filter((a) => a.id !== annotation.id),
                      })
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </p>
              <textarea
                className={styles.prose}
                aria-label={`Explanation for lines ${annotation.firstLine}–${annotation.lastLine}`}
                value={annotation.explanation}
                disabled={submitted}
                onChange={(event) =>
                  write({
                    annotations: submission.annotations.map((a) =>
                      a.id === annotation.id ? { ...a, explanation: event.target.value } : a,
                    ),
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
      {!submitted ? (
        <>
          <p className={styles.addRow}>
            <label>
              First line
              <input
                type="number"
                min={1}
                max={lineCount}
                className={styles.lineInput}
                value={firstLine}
                onChange={(event) => setFirstLine(event.target.value)}
              />
            </label>
            <label>
              Last line
              <input
                type="number"
                min={1}
                max={lineCount}
                className={styles.lineInput}
                value={lastLine}
                onChange={(event) => setLastLine(event.target.value)}
              />
            </label>
            <button type="button" className={styles.addButton} onClick={handleAdd}>
              Add explanation
            </button>
          </p>
          {rangeError ? (
            <p className={styles.error} role="alert">
              {rangeError}
            </p>
          ) : null}
          <p>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => void handleSubmit()}
              disabled={submission.annotations.length === 0}
            >
              Submit for review
            </button>
          </p>
        </>
      ) : (
        <p className={styles.done} role="status">
          ✓ Submitted for review. Your instructor will grade this task.
        </p>
      )}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
