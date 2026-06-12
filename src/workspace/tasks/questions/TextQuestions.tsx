// Free-entry question renderers: short answer, numerical/calculated, essay,
// file upload (docs/architecture/06 §1.3).

import { useId } from 'react';
import type { QuizAnswerValue } from '../../../quiz/types';
import styles from './questions.module.css';

interface EntryProps {
  value: QuizAnswerValue | undefined;
  disabled: boolean;
  onChange: (value: QuizAnswerValue) => void;
}

export function ShortAnswerView({ value, disabled, onChange }: EntryProps) {
  const id = useId();
  return (
    <p className={styles.inlineField}>
      <label htmlFor={id}>Your answer</label>
      <input
        id={id}
        type="text"
        className={styles.textInput}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </p>
  );
}

export function NumericalView({ value, disabled, onChange }: EntryProps) {
  const id = useId();
  return (
    <p className={styles.inlineField}>
      <label htmlFor={id}>Your answer (number)</label>
      <input
        id={id}
        type="number"
        step="any"
        className={styles.textInput}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </p>
  );
}

export function EssayView({ value, disabled, onChange }: EntryProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Your answer</label>
      <textarea
        id={id}
        className={styles.textArea}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function FileUploadView({ value, disabled, onChange }: EntryProps) {
  const id = useId();
  const current =
    typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    onChange({ filename: file.name, content: await file.text() });
  };
  return (
    <p className={styles.inlineField}>
      <label htmlFor={id}>Upload your answer</label>
      <input
        id={id}
        type="file"
        disabled={disabled}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {current?.filename ? <span className={styles.fileName}>Uploaded: {current.filename}</span> : null}
    </p>
  );
}
