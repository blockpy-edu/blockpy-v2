// Reading tasks (docs/architecture/06 §2): sanitized markdown content, the
// legacy-compatible Resource.View/reading/read progress beacon, and a
// mark-as-read action that posts full score through update_submission.

import { useEffect, useRef, useState } from 'react';
import { updateSubmission } from '../../api/endpoints/submissions';
import { useApi } from '../../api/useApi';
import { Markdown } from '../../content/markdown';
import { useActivityState, useWorkspace } from '../useWorkspace';
import type { ActivityTask } from '../../domain/activity';
import styles from './ReadingTask.module.css';

const TRACK_INTERVAL_MS = 5000;

interface ReadingTaskProps {
  task: ActivityTask;
}

function findScrollParent(element: HTMLElement): HTMLElement {
  let parent = element.parentElement;
  while (parent) {
    if (parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return document.documentElement;
}

/** Posts {position, progress, delay, moved} while the reading is visible. */
function useReadingTracker(contentRef: React.RefObject<HTMLDivElement | null>) {
  const { events } = useApi();
  const lastRef = useRef({ position: 0, time: 0 });

  useEffect(() => {
    lastRef.current = { position: 0, time: Date.now() };
    const report = () => {
      if (document.visibilityState === 'hidden' || !contentRef.current) {
        return;
      }
      const scroller = findScrollParent(contentRef.current);
      const position = Math.round(scroller.scrollTop);
      const viewed = scroller.scrollTop + scroller.clientHeight;
      const progress =
        scroller.scrollHeight > 0
          ? Math.min(100, Math.round((100 * viewed) / scroller.scrollHeight))
          : 100;
      const now = Date.now();
      events.log({
        event_type: 'Resource.View',
        category: 'reading',
        label: 'read',
        message: JSON.stringify({
          position,
          progress,
          delay: now - lastRef.current.time,
          moved: position !== lastRef.current.position,
        }),
        file_path: '',
      });
      lastRef.current = { position, time: now };
    };
    report();
    const timer = window.setInterval(report, TRACK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [contentRef, events]);
}

export function ReadingTask({ task }: ReadingTaskProps) {
  const { saveIds, activityStore } = useWorkspace();
  const { client } = useApi();
  const contentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const status = useActivityState((state) => state.statuses[task.assignmentId] ?? 'untouched');
  useReadingTracker(contentRef);

  const content = task.kind.type === 'reading' ? task.kind.content : '';
  const isRead = status === 'graded' || status === 'complete';

  const handleMarkRead = async () => {
    if (saveIds.submissionId === null) {
      activityStore.getState().setStatus(task.assignmentId, 'graded');
      return;
    }
    setError(null);
    try {
      // Mirrors the legacy Reader's markRead: full score, correct.
      await updateSubmission(client, {
        submissionId: saveIds.submissionId,
        score: 1,
        correct: true,
      });
      activityStore.getState().setStatus(task.assignmentId, 'graded');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Marking as read failed.');
    }
  };

  return (
    <div className={styles.reading} ref={contentRef}>
      <Markdown source={content} />
      <p className={styles.actions}>
        {isRead ? (
          <span className={styles.done} role="status">
            ✓ You marked this as read.
          </span>
        ) : (
          <button type="button" className={styles.markButton} onClick={() => void handleMarkRead()}>
            Mark as read
          </button>
        )}
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
