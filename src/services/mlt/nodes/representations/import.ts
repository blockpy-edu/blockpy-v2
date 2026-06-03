import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerImportBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.IMPORT] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.IMPORT,
        message0: 'import %1',
        args0: [{ type: 'field_input', name: 'MODULE', text: 'math' }],
        previousStatement: null,
        nextStatement: null,
        colour: 45,
        tooltip: 'Import a module',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  void errors;
  void ctx;
  const module = block.getFieldValue('MODULE') as string;
  return `import ${module}`;
}
