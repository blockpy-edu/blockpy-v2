import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerListBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.LIST] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.LIST,
        message0: '[%1]',
        args0: [{ type: 'input_value', name: 'ITEMS' }],
        output: 'Array',
        colour: 260,
        tooltip: 'List literal',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const items = ctx.variadicInputCodes(block, 'ADD', errors, 'ITEMS');
  return `[${items.join(', ')}]`;
}
