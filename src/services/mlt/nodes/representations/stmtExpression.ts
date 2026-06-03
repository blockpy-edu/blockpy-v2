import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const expressionStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.EXPR_STMT,
  statementNodeTypes: ['ExpressionStatement'],
};

export const yieldStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.EXPR_STMT,
  statementNodeTypes: ['YieldStatement'],
};
