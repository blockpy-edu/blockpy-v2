import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRunState, useWorkspace } from "../useWorkspace";
import styles from "./ConsolePanel.module.css";
import type { ConsoleEntry } from "../run/runStore";

/**
 * The workspace console (docs/architecture/05 §5): streamed stdout/stderr,
 * inline input() handling, a REPL line, and run separators.
 */
export function ConsolePanel() {
    const { runCoordinator } = useWorkspace();
    const entries = useRunState((state) => state.entries);
    const status = useRunState((state) => state.status);
    const inputPrompt = useRunState((state) => state.inputPrompt);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const element = scrollRef.current;
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [entries, inputPrompt]);

    return (
        <div className={styles.console}>
            <div ref={scrollRef} className={styles.scroll} role="log" aria-label="Program output">
                {entries.length === 0 ? (
                    <p className={styles.empty}>Run your program to see its output here.</p>
                ) : (
                    <ol className={styles.entries}>
                        {entries.map((entry) => (
                            <ConsoleLine key={entry.id} entry={entry} />
                        ))}
                    </ol>
                )}
                {inputPrompt !== null ? (
                    <InputPromptForm
                        prompt={inputPrompt}
                        onSubmit={(value) => void runCoordinator.submitInput(value)}
                    />
                ) : null}
            </div>
            <ReplForm
                disabled={status === "running" || status === "awaiting-input"}
                onSubmit={(code) => void runCoordinator.evaluate(code)}
            />
        </div>
    );
}

function ConsoleLine({ entry }: { entry: ConsoleEntry }) {
    if (entry.kind === "separator") {
        return (
            <li className={styles.separator} aria-label={entry.text}>
                {entry.text}
            </li>
        );
    }
    if (entry.kind === "image") {
        return (
            <li className={styles.line}>
                <img src={`data:image/png;base64,${entry.text}`} alt="Program graphical output" />
            </li>
        );
    }
    const kindClass =
        entry.kind === "stderr"
            ? styles.stderr
            : entry.kind === "echo"
              ? styles.echo
              : entry.kind === "result"
                ? styles.result
                : entry.kind === "notice"
                  ? styles.notice
                  : styles.stdout;
    return <li className={`${styles.line} ${kindClass}`}>{entry.text}</li>;
}

function InputPromptForm({
    prompt,
    onSubmit,
}: {
    prompt: string;
    onSubmit: (value: string) => void;
}) {
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(value);
        setValue("");
    };

    return (
        <form className={styles.inputForm} onSubmit={handleSubmit}>
            <label className={styles.inputLabel}>
                {prompt || "Input requested:"}
                <input
                    ref={inputRef}
                    className={styles.inputField}
                    type="text"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />
            </label>
            <button type="submit" className={styles.inputSubmit}>
                Enter
            </button>
        </form>
    );
}

function ReplForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (code: string) => void }) {
    const [code, setCode] = useState("");

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = code.trim();
        if (!trimmed) {
            return;
        }
        onSubmit(trimmed);
        setCode("");
    };

    return (
        <form className={styles.replForm} onSubmit={handleSubmit}>
            <span className={styles.replPrompt} aria-hidden="true">
                &gt;&gt;&gt;
            </span>
            <input
                className={styles.replField}
                type="text"
                aria-label="Python console input"
                placeholder="Evaluate Python (after a run)"
                value={code}
                disabled={disabled}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
            />
        </form>
    );
}
