// Question shell + exhaustive type switch (docs/architecture/06 §1.3). All
// twelve quizzer types render here; unknown types fall back to a read-only
// raw body so malformed content never crashes the quiz.

import { Markdown } from '../../../content/markdown';
import type { QuizAnswerValue, QuizFeedback, QuizQuestion } from '../../../quiz/types';
import { BlanksView, DropdownsView } from './BlankQuestions';
import { McqView, MultipleAnswersView, TrueFalseView } from './ChoiceQuestions';
import { MatchingQuestionView } from './MatchingQuestionView';
import { EssayView, FileUploadView, NumericalView, ShortAnswerView } from './TextQuestions';
import styles from './questions.module.css';

export interface QuestionRendererProps {
  question: QuizQuestion;
  value: QuizAnswerValue | undefined;
  /** Per-question grading feedback, shown when feedbackType allows. */
  feedback: QuizFeedback | null;
  disabled: boolean;
  onChange: (value: QuizAnswerValue) => void;
}

function QuestionControl({ question, value, disabled, onChange }: QuestionRendererProps) {
  switch (question.type) {
    case 'multiple_choice_question':
      return <McqView question={question} value={value} disabled={disabled} onChange={onChange} />;
    case 'multiple_answers_question':
      return (
        <MultipleAnswersView
          question={question}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'true_false_question':
      return (
        <TrueFalseView question={question} value={value} disabled={disabled} onChange={onChange} />
      );
    case 'matching_question':
      return (
        <MatchingQuestionView
          question={question}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case 'multiple_dropdowns_question':
      return (
        <DropdownsView question={question} value={value} disabled={disabled} onChange={onChange} />
      );
    case 'fill_in_multiple_blanks_question':
      return (
        <BlanksView question={question} value={value} disabled={disabled} onChange={onChange} />
      );
    case 'short_answer_question':
      return <ShortAnswerView value={value} disabled={disabled} onChange={onChange} />;
    case 'numerical_question':
    case 'calculated_question':
      return <NumericalView value={value} disabled={disabled} onChange={onChange} />;
    case 'essay_question':
      return <EssayView value={value} disabled={disabled} onChange={onChange} />;
    case 'file_upload_question':
      return <FileUploadView value={value} disabled={disabled} onChange={onChange} />;
    case 'text_only_question':
      return null;
    case 'unknown_question':
      return (
        <pre className={styles.unknown}>
          Unsupported question type “{question.rawType}”.{'\n'}
          {question.body}
        </pre>
      );
  }
}

/** Blank-marker bodies are rendered by their controls, not as markdown. */
const BODY_IN_CONTROL: readonly QuizQuestion['type'][] = [
  'multiple_dropdowns_question',
  'fill_in_multiple_blanks_question',
  'unknown_question',
];

export function QuestionRenderer(props: QuestionRendererProps) {
  const { question, feedback } = props;
  const feedbackClass = feedback
    ? feedback.status === 'pending'
      ? styles.feedbackPending
      : feedback.correct
        ? styles.feedbackCorrect
        : styles.feedbackIncorrect
    : '';
  return (
    <section className={styles.question} aria-label={`Question ${question.id}`}>
      {question.type !== 'text_only_question' ? (
        <p className={styles.points}>
          {question.points} {question.points === 1 ? 'point' : 'points'}
        </p>
      ) : null}
      {BODY_IN_CONTROL.includes(question.type) ? null : (
        <Markdown className={styles.body} source={question.body} />
      )}
      <QuestionControl {...props} />
      {feedback ? (
        <p className={`${styles.feedback} ${feedbackClass}`} role="status">
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
