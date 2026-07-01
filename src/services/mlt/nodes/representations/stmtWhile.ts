import { PYTHON_BLOCK_TYPES } from "../../blockTypes";
import type { AstNodeModule } from "../types";
import type { SyntaxNode } from "@lezer/common";
import type { TranslationError } from "../../../../types";
import type { PythonToBlocksContext } from "../contracts";

function whileStatementToBlock(
    node: SyntaxNode,
    source: string,
    errors: TranslationError[],
    ctx: PythonToBlocksContext,
): string {
    const children = ctx.allChildren(node);
    const condNode = children.find(
        (c) =>
            c.type.name !== "while" &&
            c.type.name !== ":" &&
            c.type.name !== "Body" &&
            c.type.name !== "⚠",
    );
    const bodyNodes = ctx.childrenByType(node, "Body");
    const hasElseToken = children.some((c) => c.type.name === "else");
    const bodyNode = bodyNodes[0] ?? null;
    const elseBodyNode =
        hasElseToken && bodyNodes.length > 1 ? bodyNodes[bodyNodes.length - 1] : null;
    const condXml = condNode
        ? ctx.exprToBlock(condNode, source, errors)
        : ctx.makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: "True" }, {}, {});
    const bodyXml = bodyNode ? ctx.statementsInBody(bodyNode, source, errors) : "";
    if (elseBodyNode) {
        const elseXml = ctx.statementsInBody(elseBodyNode, source, errors);
        return ctx.makeBlock(
            PYTHON_BLOCK_TYPES.WHILE_ELSE,
            {},
            { CONDITION: condXml },
            { BODY: bodyXml, ...(elseXml ? { ELSE: elseXml } : {}) },
        );
    }
    return ctx.makeBlock(PYTHON_BLOCK_TYPES.WHILE, {}, { CONDITION: condXml }, { BODY: bodyXml });
}

export const whileStatementAstModule: AstNodeModule = {
    blockType: PYTHON_BLOCK_TYPES.WHILE,
    statementNodeTypes: ["WhileStatement"],
    statementToBlock: whileStatementToBlock,
};

export const whileElseStatementAstModule: AstNodeModule = {
    blockType: PYTHON_BLOCK_TYPES.WHILE_ELSE,
};
