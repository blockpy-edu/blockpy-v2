import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const decoratedStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.DECORATED,
  statementNodeTypes: ['Decorated'],
};
