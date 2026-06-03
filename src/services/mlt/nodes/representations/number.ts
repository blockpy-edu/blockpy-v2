import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerNumberBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.NUMBER] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.NUMBER,
        message0: '%1',
        args0: [{ type: 'field_number', name: 'VALUE', value: 0 }],
        output: 'Number',
        colour: 230,
        tooltip: 'A number literal',
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
  return String(block.getFieldValue('VALUE'));
}
