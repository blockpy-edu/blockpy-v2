import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const funcCallAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.FUNC_CALL,
};

export const printCallAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.PRINT,
};
