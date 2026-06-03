import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const printStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.PRINT,
  statementNodeTypes: ['PrintStatement'],
};
