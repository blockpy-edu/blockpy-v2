import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const attrAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.ATTR,
};

export const indexAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.INDEX,
};
