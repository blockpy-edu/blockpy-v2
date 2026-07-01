import { PYTHON_BLOCK_TYPES } from "../../blockTypes";
import type { AstNodeModule } from "../types";

export const listAstModule: AstNodeModule = {
    blockType: PYTHON_BLOCK_TYPES.LIST,
    expressionNodeTypes: ["ArrayExpression"],
    expressionToBlock: (node, source, errors, ctx) => {
        const items = ctx.meaningfulChildren(node);
        const values: Record<string, string> = {};
        items.forEach((item, index) => {
            values[`ADD${index}`] = ctx.exprToBlock(item, source, errors);
        });
        return ctx.makeBlock(
            PYTHON_BLOCK_TYPES.LIST,
            {},
            values,
            {},
            { argc: String(items.length) },
        );
    },
};

export const tupleAstModule: AstNodeModule = {
    blockType: PYTHON_BLOCK_TYPES.TUPLE,
    expressionNodeTypes: ["TupleExpression"],
    expressionToBlock: (node, source, errors, ctx) => {
        const items = ctx.meaningfulChildren(node);
        const values: Record<string, string> = {};
        items.forEach((item, index) => {
            values[`ADD${index}`] = ctx.exprToBlock(item, source, errors);
        });
        return ctx.makeBlock(
            PYTHON_BLOCK_TYPES.TUPLE,
            {},
            values,
            {},
            { argc: String(items.length) },
        );
    },
};

export const dictAstModule: AstNodeModule = {
    blockType: PYTHON_BLOCK_TYPES.DICT,
    expressionNodeTypes: ["DictionaryExpression"],
    expressionToBlock: (node, source, _errors, ctx) =>
        ctx.makeBlock(PYTHON_BLOCK_TYPES.DICT, { CODE: ctx.nodeText(node, source) }, {}, {}),
};
