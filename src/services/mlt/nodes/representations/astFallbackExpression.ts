import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const cstExpressionAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.CST_EXPR,
};

export const parenthesizedAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.CST_EXPR,
};
