import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const returnStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.RETURN,
  statementNodeTypes: ['ReturnStatement'],
};
