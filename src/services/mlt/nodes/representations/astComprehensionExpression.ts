import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const comprehensionAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.COMPREHENSION,
};
