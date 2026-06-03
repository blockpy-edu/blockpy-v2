import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerPrintBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.PRINT] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.PRINT,
        message0: 'print(%1)',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null,
        nextStatement: null,
        colour: 290,
        tooltip: 'Print to output',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
  const value = valueBlock ? ctx.blockToCode(valueBlock, errors) : '';
  return `print(${value})`;
}
