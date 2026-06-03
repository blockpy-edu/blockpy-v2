import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const numberAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.NUMBER,
};

export const stringAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.STRING,
};

export const booleanAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.BOOLEAN,
};

export const noneAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.NONE,
};

export const variableAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.VARIABLE,
};
