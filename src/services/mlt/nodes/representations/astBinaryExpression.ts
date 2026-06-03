import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

const ARITH_OPS: Record<string, string> = {
  '+': PYTHON_BLOCK_TYPES.ADD,
  '-': PYTHON_BLOCK_TYPES.SUBTRACT,
  '*': PYTHON_BLOCK_TYPES.MULTIPLY,
  '/': PYTHON_BLOCK_TYPES.DIVIDE,
  '%': PYTHON_BLOCK_TYPES.MODULO,
  '**': PYTHON_BLOCK_TYPES.POWER,
};

const COMPARE_OPS = new Set(['==', '!=', '<', '<=', '>', '>=']);

export const addAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.ADD,
  expressionNodeTypes: ['BinaryExpression'],
  expressionToBlock: (node, source, errors, ctx) => {
    const children = ctx.allChildren(node);
    if (children.length < 3) {
      return ctx.makeCstExprBlock(node, source);
    }
    const leftNode = children[0]!;
    const opNode = children[1]!;
    const rightNode = children[2]!;
    const op = ctx.nodeText(opNode, source);
    const left = ctx.exprToBlock(leftNode, source, errors);
    const right = ctx.exprToBlock(rightNode, source, errors);
    if (op in ARITH_OPS) {
      return ctx.makeBlock(ARITH_OPS[op]!, {}, { LEFT: left, RIGHT: right }, {});
    }
    if (COMPARE_OPS.has(op)) {
      return ctx.makeBlock(
        PYTHON_BLOCK_TYPES.COMPARE,
        { OP: op },
        { LEFT: left, RIGHT: right },
        {},
      );
    }
    if (op === 'and' || op === 'or') {
      return ctx.makeBlock(
        PYTHON_BLOCK_TYPES.BOOL_OP,
        { OP: op },
        { LEFT: left, RIGHT: right },
        {},
      );
    }
    return ctx.makeCstExprBlock(node, source);
  },
};

export const subtractAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.SUBTRACT,
};

export const multiplyAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.MULTIPLY,
};

export const divideAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.DIVIDE,
};

export const moduloAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.MODULO,
};

export const powerAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.POWER,
};

export const compareAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.COMPARE,
};

export const boolOpAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.BOOL_OP,
};
