import type { SyntaxNode } from "@lezer/common";
import type { TranslationError } from "../../../types";
import type { BlocklyBlock } from "./blocklyTypes";

export interface BlockToPythonContext {
    blockToCode: (block: BlocklyBlock, errors: TranslationError[]) => string;
    statementToCode: (block: BlocklyBlock, errors: TranslationError[]) => string;
    indent: (code: string, spaces?: number) => string;
    variadicInputCodes: (
        block: BlocklyBlock,
        preferredPrefix: string,
        errors: TranslationError[],
        fallbackInput?: string,
    ) => string[];
    comprehensionClauses: (block: BlocklyBlock, errors: TranslationError[]) => string[];
}

export interface PythonToBlocksContext {
    nodeText: (node: SyntaxNode, source: string) => string;
    allChildren: (node: SyntaxNode) => SyntaxNode[];
    childByType: (node: SyntaxNode, ...types: string[]) => SyntaxNode | null;
    childrenByType: (node: SyntaxNode, ...types: string[]) => SyntaxNode[];
    meaningfulChildren: (node: SyntaxNode) => SyntaxNode[];
    makeBlock: (
        type: string,
        fields: Record<string, string>,
        values: Record<string, string>,
        statements: Record<string, string>,
        mutations?: Record<string, string>,
        next?: string,
    ) => string;
    makeCstExprBlock: (node: SyntaxNode, source: string) => string;
    makeCstStmtBlock: (node: SyntaxNode, source: string) => string;
    errorBlock: (message: string) => string;
    exprToBlock: (node: SyntaxNode, source: string, errors: TranslationError[]) => string;
    stmtToBlocksNoChain: (node: SyntaxNode, source: string, errors: TranslationError[]) => string;
    statementsInBody: (bodyNode: SyntaxNode, source: string, errors: TranslationError[]) => string;
    getLocation: (
        node: SyntaxNode,
        source: string,
    ) => {
        line: number;
        col: number;
        endLine?: number;
        endCol?: number;
    };
}

export interface NodeHandlers {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockToPython?: (block: any, errors: TranslationError[], ctx: BlockToPythonContext) => string;
    expressionFromPython?: (
        node: SyntaxNode,
        source: string,
        errors: TranslationError[],
        ctx: PythonToBlocksContext,
    ) => string;
    statementFromPython?: (
        node: SyntaxNode,
        source: string,
        errors: TranslationError[],
        ctx: PythonToBlocksContext,
    ) => string;
}
