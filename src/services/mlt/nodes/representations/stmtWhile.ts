import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const whileStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.WHILE,
  statementNodeTypes: ['WhileStatement'],
};

export const whileElseStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.WHILE_ELSE,
  statementNodeTypes: ['WhileStatement'],
};
