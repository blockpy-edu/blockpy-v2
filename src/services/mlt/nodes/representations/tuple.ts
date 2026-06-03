import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerTupleBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.TUPLE] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.TUPLE,
        message0: '(%1)',
        args0: [{ type: 'input_value', name: 'ITEMS' }],
        output: 'Array',
        colour: 260,
        tooltip: 'Tuple literal',
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
  if (items.length === 1) {
    return `(${items[0]},)`;
  }
  return `(${items.join(', ')})`;
}
