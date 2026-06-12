import { useRunState } from '../useWorkspace';
import styles from './FeedbackPanel.module.css';
import type { FeedbackCategory } from '../../engine/feedback/categories';

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  syntax: 'Syntax error',
  runtime: 'Runtime error',
  analyzer: 'Tip',
  instructor: 'Instructor feedback',
  success: 'Success',
  partial: 'Partial credit',
  system: 'System',
  none: '',
};

const POSITIVE_CATEGORIES: ReadonlySet<FeedbackCategory> = new Set(['success', 'partial']);

/** Renders the current run's feedback (docs/architecture/05 §4). */
export function FeedbackPanel() {
  const feedback = useRunState((state) => state.feedback);
  const status = useRunState((state) => state.status);

  if (!feedback) {
    return (
      <p className={styles.empty} role="status">
        {status === 'running' ? 'Running…' : 'Run your program to receive feedback.'}
      </p>
    );
  }

  const tone =
    POSITIVE_CATEGORIES.has(feedback.category) || feedback.correct
      ? styles.positive
      : feedback.category === 'none'
        ? styles.neutral
        : styles.negative;

  return (
    <div className={styles.panel} role="status" aria-live="polite">
      <div className={`${styles.card} ${tone}`}>
        {CATEGORY_LABELS[feedback.category] ? (
          <p className={styles.category}>{CATEGORY_LABELS[feedback.category]}</p>
        ) : null}
        <h3 className={styles.label}>{feedback.label}</h3>
        {feedback.message ? <p className={styles.message}>{feedback.message}</p> : null}
        {feedback.location ? (
          <p className={styles.location}>
            {feedback.location.file}, line {feedback.location.line}
          </p>
        ) : null}
        {feedback.score !== null ? (
          <p className={styles.score}>Score: {Math.round(feedback.score * 100)}%</p>
        ) : null}
      </div>
    </div>
  );
}
