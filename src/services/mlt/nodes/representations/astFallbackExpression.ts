import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const cstExpressionAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.CST_EXPR,
  expressionNodeTypes: ['LambdaExpression', 'AwaitExpression', 'ConditionalExpression'],
  expressionToBlock: (node, source, _errors, ctx) => ctx.makeCstExprBlock(node, source),
};

export const parenthesizedAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.CST_EXPR,
  expressionNodeTypes: ['ParenthesizedExpression'],
  expressionToBlock: (node, source, errors, ctx) => {
    const inner = ctx.meaningfulChildren(node)[0];
    if (inner) return ctx.exprToBlock(inner, source, errors);
    return ctx.makeCstExprBlock(node, source);
  },
};
