import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const forStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.FOR,
  statementNodeTypes: ['ForStatement'],
};

export const forElseStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.FOR_ELSE,
  statementNodeTypes: ['ForStatement'],
};
