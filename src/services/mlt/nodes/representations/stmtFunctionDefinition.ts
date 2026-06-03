import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const functionDefinitionAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.FUNC_DEF,
  statementNodeTypes: ['FunctionDefinition'],
};
