// Tokenizer for `[key]` blank markers in question bodies
// (docs/architecture/06 §1.3). `[[` and `]]` escape literal brackets.

export type BlankToken = { kind: "text"; text: string } | { kind: "blank"; key: string };

/**
 * Splits a question body into literal text runs and `[key]` blanks. Unclosed
 * or empty brackets are kept as literal text; `[[`/`]]` produce `[`/`]`.
 */
export function tokenizeBlanks(body: string): BlankToken[] {
    const tokens: BlankToken[] = [];
    let text = "";
    let index = 0;

    const flushText = () => {
        if (text) {
            tokens.push({ kind: "text", text });
            text = "";
        }
    };

    while (index < body.length) {
        const char = body[index];
        if (char === "[" && body[index + 1] === "[") {
            text += "[";
            index += 2;
            continue;
        }
        if (char === "]" && body[index + 1] === "]") {
            text += "]";
            index += 2;
            continue;
        }
        if (char === "[") {
            const close = body.indexOf("]", index + 1);
            const key = close === -1 ? "" : body.slice(index + 1, close);
            if (close === -1 || !key.trim()) {
                text += char;
                index += 1;
                continue;
            }
            flushText();
            tokens.push({ kind: "blank", key });
            index = close + 1;
            continue;
        }
        text += char;
        index += 1;
    }
    flushText();
    return tokens;
}

/** The blank keys of a body, in order of appearance. */
export function blankKeys(body: string): string[] {
    return tokenizeBlanks(body)
        .filter((token): token is { kind: "blank"; key: string } => token.kind === "blank")
        .map((token) => token.key);
}
