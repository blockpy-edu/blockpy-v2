// Choice-style question renderers: multiple choice, multiple answers,
// true/false (docs/architecture/06 §1.3).

import { useId } from 'react';
import { Markdown } from '../../../content/markdown';
import type {
  McqQuestion,
  MultipleAnswersQuestion,
  QuizAnswerValue,
  TrueFalseQuestion,
} from '../../../quiz/types';
import styles from './questions.module.css';

interface ChoiceProps<Q> {
  question: Q;
  value: QuizAnswerValue | undefined;
  disabled: boolean;
  onChange: (value: QuizAnswerValue) => void;
}

export function McqView({ question, value, disabled, onChange }: ChoiceProps<McqQuestion>) {
  const groupName = useId();
  const selected = typeof value === 'string' ? value : '';
  return (
    <fieldset className={styles.choices} disabled={disabled}>
      <legend>Answer choices</legend>
      {question.answers.map((answer) => (
        <label key={answer} className={styles.choice}>
          <input
            type="radio"
            name={groupName}
            value={answer}
            checked={selected === answer}
            onChange={() => onChange(answer)}
          />
          <Markdown source={answer} />
        </label>
      ))}
    </fieldset>
  );
}

export function MultipleAnswersView({
  question,
  value,
  disabled,
  onChange,
}: ChoiceProps<MultipleAnswersQuestion>) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (answer: string) => {
    onChange(
      selected.includes(answer)
        ? selected.filter((item) => item !== answer)
        : [...selected, answer],
    );
  };
  return (
    <fieldset className={styles.choices} disabled={disabled}>
      <legend>Answer choices (select all that apply)</legend>
      {question.answers.map((answer) => (
        <label key={answer} className={styles.choice}>
          <input
            type="checkbox"
            checked={selected.includes(answer)}
            onChange={() => toggle(answer)}
          />
          <Markdown source={answer} />
        </label>
      ))}
    </fieldset>
  );
}

export function TrueFalseView({
  question,
  value,
  disabled,
  onChange,
}: ChoiceProps<TrueFalseQuestion>) {
  const groupName = useId();
  const selected = typeof value === 'string' ? value : '';
  void question;
  return (
    <fieldset className={styles.choices} disabled={disabled}>
      <legend>True or false</legend>
      {(['true', 'false'] as const).map((option) => (
        <label key={option} className={styles.choice}>
          <input
            type="radio"
            name={groupName}
            value={option}
            checked={selected === option}
            onChange={() => onChange(option)}
          />
          {option === 'true' ? 'True' : 'False'}
        </label>
      ))}
    </fieldset>
  );
}
