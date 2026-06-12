import { Markdown } from '../../content/markdown';
import { focusedTask } from '../activity/activityStore';
import { ExplainTask } from '../tasks/ExplainTask';
import { QuizTask } from '../tasks/QuizTask';
import { ReadingTask } from '../tasks/ReadingTask';
import { TextbookTask } from '../tasks/TextbookTask';
import type { ActivityTask, TaskStatus } from '../../domain/activity';
import { useActivityState } from '../useWorkspace';
import styles from './TaskPanel.module.css';

const STATUS_LABELS: Record<TaskStatus, string> = {
  untouched: 'Not started',
  inProgress: 'In progress',
  complete: 'Complete',
  graded: 'Graded',
};

function TaskBody({ task }: { task: ActivityTask }) {
  switch (task.kind.type) {
    case 'code':
      return task.instructions ? (
        <Markdown className={styles.instructions} source={task.instructions} />
      ) : null;
    case 'reading':
      return <ReadingTask task={task} />;
    case 'quiz':
      return <QuizTask task={task} />;
    case 'explain':
      return <ExplainTask task={task} />;
    case 'textbookPage':
      return <TextbookTask task={task} />;
    case 'unsupported':
      return (
        <p className={styles.unsupported}>Tasks of type “{task.kind.rawType}” are not supported.</p>
      );
  }
}

/**
 * Shows the focused activity task: title, position, points, status, and the
 * kind-specific body (markdown instructions, quiz runner, reading, textbook,
 * or explain editor — docs/architecture/06).
 */
export function TaskPanel() {
  const activity = useActivityState((state) => state.activity);
  const task = useActivityState(focusedTask);
  const status = useActivityState((state) =>
    task ? (state.statuses[task.assignmentId] ?? 'untouched') : 'untouched',
  );

  if (!task) {
    return <p className={styles.instructions}>No task is loaded.</p>;
  }

  const index = activity.tasks.findIndex((t) => t.assignmentId === task.assignmentId);
  const statusClass =
    status === 'graded'
      ? styles.statusGraded
      : status === 'complete'
        ? styles.statusComplete
        : undefined;

  return (
    <article className={styles.panel} aria-label="Current task">
      <header className={styles.header}>
        <h2 className={styles.title}>{task.title}</h2>
        {activity.tasks.length > 1 ? (
          <p className={styles.position}>
            Task {index + 1} of {activity.tasks.length}
          </p>
        ) : null}
      </header>
      <p className={styles.meta}>
        <span>
          {task.points} {task.points === 1 ? 'point' : 'points'}
        </span>
        <span className={`${styles.status} ${statusClass ?? ''}`.trim()}>
          {STATUS_LABELS[status]}
        </span>
      </p>
      <TaskBody task={task} />
    </article>
  );
}
