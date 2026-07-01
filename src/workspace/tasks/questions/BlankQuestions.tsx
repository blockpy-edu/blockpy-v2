// Blank-marker question renderers (docs/architecture/06 §1.3): bodies hold
// `[key]` markers; the tokenizer splits the RAW body (these bodies are plain
// text, not markdown, so inputs interleave predictably).

import { tokenizeBlanks } from "../../../quiz/tokenizer";
import type {
    FillInMultipleBlanksQuestion,
    MultipleDropdownsQuestion,
    QuizAnswerValue,
} from "../../../quiz/types";
import styles from "./questions.module.css";

interface BlankProps<Q> {
    question: Q;
    value: QuizAnswerValue | undefined;
    disabled: boolean;
    onChange: (value: QuizAnswerValue) => void;
}

function answerMap(value: QuizAnswerValue | undefined): Record<string, string> {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

export function BlanksView({
    question,
    value,
    disabled,
    onChange,
}: BlankProps<FillInMultipleBlanksQuestion>) {
    const answers = answerMap(value);
    return (
        <p className={styles.blankBody}>
            {tokenizeBlanks(question.body).map((token, index) =>
                token.kind === "text" ? (
                    <span key={`text-${index}`}>{token.text}</span>
                ) : (
                    <input
                        key={`blank-${token.key}-${index}`}
                        type="text"
                        className={styles.blankInput}
                        aria-label={`Answer for ${token.key}`}
                        value={answers[token.key] ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange({ ...answers, [token.key]: event.target.value })
                        }
                    />
                ),
            )}
        </p>
    );
}

export function DropdownsView({
    question,
    value,
    disabled,
    onChange,
}: BlankProps<MultipleDropdownsQuestion>) {
    const answers = answerMap(value);
    return (
        <p className={styles.blankBody}>
            {tokenizeBlanks(question.body).map((token, index) =>
                token.kind === "text" ? (
                    <span key={`text-${index}`}>{token.text}</span>
                ) : (
                    <select
                        key={`blank-${token.key}-${index}`}
                        className={styles.select}
                        aria-label={`Answer for ${token.key}`}
                        value={answers[token.key] ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                            onChange({ ...answers, [token.key]: event.target.value })
                        }
                    >
                        <option value="">—</option>
                        {(question.answers[token.key] ?? []).map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                ),
            )}
        </p>
    );
}
