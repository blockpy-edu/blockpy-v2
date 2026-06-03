import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerNotBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.NOT] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.NOT,
        message0: 'not %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        output: 'Boolean',
        colour: 210,
        tooltip: 'Boolean not',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const value = ctx.blockToCode(block.getInputTargetBlock('VALUE') as BlocklyBlock, errors);
  return `(not ${value})`;
}
