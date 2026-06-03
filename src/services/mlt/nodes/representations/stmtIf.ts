import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const ifStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.IF,
  statementNodeTypes: ['IfStatement'],
};
