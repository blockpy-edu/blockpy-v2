import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const addAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.ADD,
};

export const subtractAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.SUBTRACT,
};

export const multiplyAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.MULTIPLY,
};

export const divideAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.DIVIDE,
};

export const moduloAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.MODULO,
};

export const powerAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.POWER,
};

export const compareAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.COMPARE,
};

export const boolOpAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.BOOL_OP,
};
