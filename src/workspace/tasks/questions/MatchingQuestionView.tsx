// Matching question renderer (docs/architecture/06 §1.3): statements column
// with a per-statement dropdown over a deterministically shuffled answer list.

import { shuffle } from '../../../quiz/pools';
import type { MatchingQuestion, QuizAnswerValue } from '../../../quiz/types';
import styles from './questions.module.css';

interface MatchingProps {
  question: MatchingQuestion;
  value: QuizAnswerValue | undefined;
  disabled: boolean;
  onChange: (value: QuizAnswerValue) => void;
}

/** Stable seed from the question id so the shuffle survives re-renders. */
function seedFromId(id: string): number {
  let seed = 0;
  for (const char of id) {
    seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  }
  return seed;
}

export function MatchingQuestionView({ question, value, disabled, onChange }: MatchingProps) {
  const answers =
    typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
  const options = shuffle(question.answers, seedFromId(question.id));
  return (
    <ul className={styles.matchList}>
      {question.statements.map((statement) => (
        <li key={statement} className={styles.matchRow}>
          <span>{statement}</span>
          <select
            className={styles.select}
            aria-label={`Match for ${statement}`}
            value={answers[statement] ?? ''}
            disabled={disabled}
            onChange={(event) => onChange({ ...answers, [statement]: event.target.value })}
          >
            <option value="">—</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
