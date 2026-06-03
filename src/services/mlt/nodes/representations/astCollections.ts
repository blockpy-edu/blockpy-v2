import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const listAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.LIST,
};

export const tupleAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.TUPLE,
};

export const dictAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.DICT,
};
