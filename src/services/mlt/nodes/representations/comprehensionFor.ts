import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerComprehensionForBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.COMPREHENSION_FOR] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.COMPREHENSION_FOR,
        message0: 'for %1 in %2',
        args0: [
          { type: 'input_value', name: 'TARGET' },
          { type: 'input_value', name: 'ITER' },
        ],
        inputsInline: true,
        output: 'ComprehensionFor',
        colour: 260,
        tooltip: 'Comprehension for clause',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const target =
    ctx.blockToCode(block.getInputTargetBlock('TARGET') as BlocklyBlock, errors) || '_';
  const iter = ctx.blockToCode(block.getInputTargetBlock('ITER') as BlocklyBlock, errors) || '[]';
  return `for ${target} in ${iter}`;
}
