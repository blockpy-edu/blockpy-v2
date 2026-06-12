// The quiz runner (docs/architecture/06 §1): renders the visible question
// set, persists answers as QuizSubmission JSON through the normal answer.py
// save pipeline, and round-trips grading through update_submission — the
// server (or the offline transport simulating it) owns the answer key.

import { useMemo, useState } from 'react';
import { saveFile, updateSubmission } from '../../api/endpoints/submissions';
import { useApi } from '../../api/useApi';
import { canStartAttempt, finishAttempt, startAttempt } from '../../quiz/attempt';
import { visibleQuestionIds } from '../../quiz/pools';
import {
  parseQuizFeedbackMap,
  parseQuizInstructions,
  parseQuizSubmission,
  serializeQuizSubmission,
} from '../../quiz/types';
import type { QuizSubmission } from '../../quiz/types';
import { MAIN_STUDENT_FILE, readFile } from '../../vfs/vfs';
import { useVfsState, useWorkspace } from '../useWorkspace';
import { QuestionRenderer } from './questions/QuestionRenderer';
import type { ActivityTask } from '../../domain/activity';
import styles from './QuizTask.module.css';

interface QuizTaskProps {
  task: ActivityTask;
}

export function QuizTask({ task }: QuizTaskProps) {
  const { vfsStore, vfsRole, saveIds, activityStore } = useWorkspace();
  const { client } = useApi();
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawInstructions = task.kind.type === 'quiz' ? task.kind.instructions : '';
  const instructions = useMemo(() => parseQuizInstructions(rawInstructions), [rawInstructions]);
  const answerJson = useVfsState(
    (state) => readFile(state.files, MAIN_STUDENT_FILE, 'student')?.content ?? '',
  );
  const submission = useMemo(() => parseQuizSubmission(answerJson), [answerJson]);

  if (!instructions) {
    return (
      <div>
        <p className={styles.note}>
          This quiz could not be loaded; the raw content is shown below.
        </p>
        <pre className={styles.raw}>{rawInstructions}</pre>
      </div>
    );
  }

  const { settings } = instructions;
  const write = (updated: QuizSubmission) => {
    vfsStore.getState().write(MAIN_STUDENT_FILE, serializeQuizSubmission(updated), vfsRole);
  };

  const visible = visibleQuestionIds(
    instructions,
    saveIds.submissionId ?? 0,
    submission.attempt.count,
  );
  const perPage = settings.questionsPerPage > 0 ? settings.questionsPerPage : visible.length;
  const pageCount = Math.max(1, Math.ceil(visible.length / perPage));
  const currentPage = Math.min(page, pageCount - 1);
  const pageIds = visible.slice(currentPage * perPage, (currentPage + 1) * perPage);

  const { attempting, count } = submission.attempt;
  const startVerdict = canStartAttempt(settings, submission);

  const handleStart = () => {
    setPage(0);
    setError(null);
    write(startAttempt(submission));
  };

  const handleSubmit = async () => {
    const closed = finishAttempt(submission);
    write(closed);
    if (saveIds.submissionId === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const json = serializeQuizSubmission(closed);
      await saveFile(client, {
        kind: 'student',
        filename: 'answer.py',
        submissionId: saveIds.submissionId,
        code: json,
      });
      // The server regrades quizzes (regrade_if_quiz) and returns feedbacks.
      const result = await updateSubmission(client, {
        submissionId: saveIds.submissionId,
        score: 0,
        correct: false,
      });
      write({ ...closed, feedback: parseQuizFeedbackMap(result.feedbacks) });
      const { setStatus } = activityStore.getState();
      setStatus(task.assignmentId, result.correct ? 'graded' : 'complete');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Submitting the quiz failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!attempting && count === 0) {
    return (
      <div className={styles.start}>
        <p>
          This quiz has {visible.length} {visible.length === 1 ? 'question' : 'questions'}.
          {settings.attemptLimit > 0
            ? ` You have ${settings.attemptLimit} ${settings.attemptLimit === 1 ? 'attempt' : 'attempts'}.`
            : ''}
        </p>
        <button type="button" className={styles.primaryButton} onClick={handleStart}>
          Start quiz
        </button>
      </div>
    );
  }

  const showPerQuestionFeedback = !attempting && settings.feedbackType === 'IMMEDIATE';
  const gradedFeedback = Object.values(submission.feedback).filter((f) => f.status === 'graded');
  const correctCount = gradedFeedback.filter((f) => f.correct).length;

  return (
    <div className={styles.quiz}>
      {!attempting && count > 0 ? (
        <p className={styles.summary} role="status">
          {settings.feedbackType === 'NONE'
            ? 'Your responses were recorded.'
            : gradedFeedback.length > 0
              ? `You answered ${correctCount} of ${gradedFeedback.length} graded ${gradedFeedback.length === 1 ? 'question' : 'questions'} correctly.`
              : 'Your responses were submitted.'}
        </p>
      ) : null}
      <ol className={styles.questionList}>
        {pageIds.map((id) => (
          <li key={id}>
            <QuestionRenderer
              question={instructions.questions[id]}
              value={submission.studentAnswers[id]}
              feedback={showPerQuestionFeedback ? (submission.feedback[id] ?? null) : null}
              disabled={!attempting || submitting}
              onChange={(value) =>
                write({
                  ...submission,
                  studentAnswers: { ...submission.studentAnswers, [id]: value },
                })
              }
            />
          </li>
        ))}
      </ol>
      {pageCount > 1 ? (
        <p className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Previous page
          </button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === pageCount - 1}
          >
            Next page
          </button>
        </p>
      ) : null}
      <p className={styles.actions}>
        {attempting ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit quiz'}
          </button>
        ) : startVerdict.allowed ? (
          <button type="button" className={styles.pageButton} onClick={handleStart}>
            Try again
          </button>
        ) : (
          <span className={styles.note}>{startVerdict.reason}</span>
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
