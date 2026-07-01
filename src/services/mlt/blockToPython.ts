import type { TranslationError } from "../../types";
import type { BlockToPythonContext } from "./nodes/contracts";
import { blockToPythonHandlers } from "./nodes/blockToPythonHandlers";
import type { BlocklyBlock } from "./nodes/blocklyTypes";

export interface BlockToPythonResult {
    code: string;
    errors: TranslationError[];
}

function indent(code: string, spaces = 4): string {
    return code
        .split("\n")
        .map((line) => " ".repeat(spaces) + line)
        .join("\n");
}

function variadicInputCodes(
    block: BlocklyBlock,
    preferredPrefix: string,
    errors: TranslationError[],
    fallbackInput?: string,
): string[] {
    const values: string[] = [];
    for (let i = 0; i < 32; i++) {
        const child = block.getInputTargetBlock(`${preferredPrefix}${i}`) as BlocklyBlock;
        if (!child) continue;
        const code = blockToCode(child, errors).trim();
        if (code) values.push(code);
    }

    if (values.length === 0 && fallbackInput) {
        const fallback = block.getInputTargetBlock(fallbackInput) as BlocklyBlock;
        if (fallback) {
            const code = blockToCode(fallback, errors).trim();
            if (code) values.push(code);
        }
    }
    return values;
}

function comprehensionClauses(block: BlocklyBlock, errors: TranslationError[]): string[] {
    return variadicInputCodes(block, "GENERATOR", errors).filter(Boolean);
}

function blockToCode(block: BlocklyBlock | null, errors: TranslationError[]): string {
    if (!block) return "";
    const type = block.type as string;
    const handler = blockToPythonHandlers[type];
    if (!handler) {
        errors.push({
            type: "unsupported_syntax",
            message: `Unknown block type: ${type}`,
            nodeType: type,
        });
        return `# unknown block: ${type}`;
    }

    const ctx: BlockToPythonContext = {
        blockToCode,
        statementToCode,
        indent,
        variadicInputCodes,
        comprehensionClauses,
    };
    return handler(block, errors, ctx);
}

function statementToCode(block: BlocklyBlock | null, errors: TranslationError[]): string {
    if (!block) return "";
    const lines: string[] = [];
    let current: BlocklyBlock | null = block;
    while (current) {
        const line = blockToCode(current, errors);
        if (line) lines.push(line);
        current = current.getNextBlock ? (current.getNextBlock() as BlocklyBlock) : null;
    }
    return lines.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function workspaceToPython(workspace: any): BlockToPythonResult {
    const errors: TranslationError[] = [];
    if (!workspace) return { code: "", errors };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topBlocks = workspace.getTopBlocks(true) as any[];
    const lines: string[] = [];

    for (const block of topBlocks) {
        const code = blockToCode(block as BlocklyBlock, errors);
        if (code.trim()) {
            lines.push(code);
            // Follow next statements for top-level statement blocks
            let next: BlocklyBlock | null = block.getNextBlock
                ? (block.getNextBlock() as BlocklyBlock)
                : null;
            while (next) {
                const nextCode = blockToCode(next, errors);
                if (nextCode.trim()) lines.push(nextCode);
                next = next.getNextBlock ? (next.getNextBlock() as BlocklyBlock) : null;
            }
        }
    }

    return { code: lines.join("\n"), errors };
}

export { blockToCode, statementToCode };
