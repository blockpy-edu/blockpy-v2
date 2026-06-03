import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const assignStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.ASSIGN,
  statementNodeTypes: ['Assignment'],
};
