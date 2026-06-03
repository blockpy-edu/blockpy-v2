import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerIndexBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.INDEX] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.INDEX,
        message0: '%1 [ %2 ]',
        args0: [
          { type: 'input_value', name: 'VALUE' },
          { type: 'input_value', name: 'INDEX' },
        ],
        output: null,
        colour: 260,
        tooltip: 'Index access',
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
  const index = ctx.blockToCode(block.getInputTargetBlock('INDEX') as BlocklyBlock, errors);
  return `${value}[${index}]`;
}
