import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerComprehensionIfBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.COMPREHENSION_IF] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.COMPREHENSION_IF,
        message0: 'if %1',
        args0: [{ type: 'input_value', name: 'TEST' }],
        inputsInline: true,
        output: 'ComprehensionIf',
        colour: 260,
        tooltip: 'Comprehension if clause',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const test = ctx.blockToCode(block.getInputTargetBlock('TEST') as BlocklyBlock, errors) || 'True';
  return `if ${test}`;
}
