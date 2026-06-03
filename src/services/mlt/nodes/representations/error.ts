import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerErrorBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.ERROR] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.ERROR,
        message0: '\u26d4 error: %1',
        args0: [{ type: 'field_input', name: 'MESSAGE', text: 'parse error' }],
        previousStatement: null,
        nextStatement: null,
        colour: 0,
        tooltip: 'Parse error block',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  void ctx;
  errors.push({
    type: 'parse_error',
    message: (block.getFieldValue('MESSAGE') as string) || 'error block',
  });
  return '# error';
}
