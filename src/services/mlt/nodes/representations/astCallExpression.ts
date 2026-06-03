import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';
import type { SyntaxNode } from '@lezer/common';
import type { TranslationError } from '../../../../types';
import type { PythonToBlocksContext } from '../contracts';

function extractCallArguments(
  argListNode: SyntaxNode,
  source: string,
  errors: TranslationError[],
  ctx: PythonToBlocksContext,
): string[] {
  const args = ctx.meaningfulChildren(argListNode);
  return args.map((arg) => ctx.exprToBlock(arg, source, errors));
}

export const funcCallAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.FUNC_CALL,
  expressionNodeTypes: ['CallExpression'],
  expressionToBlock: (node, source, errors, ctx) => {
    const children = ctx.allChildren(node);
    if (children.length < 1) {
      return ctx.makeCstExprBlock(node, source);
    }
    const funcNode = children[0]!;
    const funcName = ctx.nodeText(funcNode, source);
    const argListNode = ctx.childByType(node, 'ArgList');
    let argBlocks: string[] = [];
    if (argListNode) {
      argBlocks = extractCallArguments(argListNode, source, errors, ctx);
    }
    if (funcName === 'print') {
      return ctx.makeBlock(
        PYTHON_BLOCK_TYPES.PRINT,
        {},
        argBlocks[0] ? { VALUE: argBlocks[0] } : {},
        {},
      );
    }
    const values: Record<string, string> = {};
    argBlocks.forEach((arg, index) => {
      values[`ARG${index}`] = arg;
    });
    return ctx.makeBlock(
      PYTHON_BLOCK_TYPES.FUNC_CALL,
      { NAME: funcName },
      values,
      {},
      { argc: String(argBlocks.length) },
    );
  },
};

export const printCallAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.PRINT,
};
