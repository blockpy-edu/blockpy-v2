import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const notAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.NOT,
  expressionNodeTypes: ['UnaryExpression'],
  expressionToBlock: (node, source, errors, ctx) => {
    const children = ctx.allChildren(node);
    if (children.length >= 2) {
      const op = ctx.nodeText(children[0]!, source);
      if (op === 'not') {
        const val = ctx.exprToBlock(children[1]!, source, errors);
        return ctx.makeBlock(PYTHON_BLOCK_TYPES.NOT, {}, { VALUE: val }, {});
      }
    }
    return ctx.makeCstExprBlock(node, source);
  },
};
