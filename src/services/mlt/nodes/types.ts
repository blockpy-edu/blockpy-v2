import type { SyntaxNode } from "@lezer/common";
import type { TranslationError } from "../../../types";
import type { PythonToBlocksContext } from "./contracts";

export interface AstNodeModule {
    blockType: string;
    expressionNodeTypes?: string[];
    statementNodeTypes?: string[];
    expressionToBlock?: (
        node: SyntaxNode,
        source: string,
        errors: TranslationError[],
        ctx: PythonToBlocksContext,
    ) => string;
    statementToBlock?: (
        node: SyntaxNode,
        source: string,
        errors: TranslationError[],
        ctx: PythonToBlocksContext,
    ) => string;
}
