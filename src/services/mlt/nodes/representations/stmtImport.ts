import { PYTHON_BLOCK_TYPES } from '../../blockTypes';
import type { AstNodeModule } from '../types';

export const importStatementAstModule: AstNodeModule = {
  blockType: PYTHON_BLOCK_TYPES.IMPORT,
  statementNodeTypes: ['ImportStatement'],
  statementToBlock: (node, source, _errors, ctx) => {
    const children = ctx.allChildren(node);
    const moduleNode = children.find(
      (c) => c.type.name === 'VariableName' || c.type.name === 'dottedName',
    );
    const moduleName = moduleNode ? ctx.nodeText(moduleNode, source) : 'module';
    return ctx.makeBlock(PYTHON_BLOCK_TYPES.IMPORT, { MODULE: moduleName }, {}, {});
  },
};
