import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerUnsupportedBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.UNSUPPORTED] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.UNSUPPORTED,
        message0: '\u26a0 unsupported: %1',
        args0: [{ type: 'field_input', name: 'CODE', text: '...' }],
        previousStatement: null,
        nextStatement: null,
        colour: 0,
        tooltip: 'Unsupported Python syntax',
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
  return (block.getFieldValue('CODE') as string) || '';
}
