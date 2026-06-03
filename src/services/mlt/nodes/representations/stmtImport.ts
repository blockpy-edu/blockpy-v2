import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const importStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.IMPORT,
  statementNodeTypes: ['ImportStatement'],
};
