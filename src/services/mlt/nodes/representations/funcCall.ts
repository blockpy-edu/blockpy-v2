import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerFuncCallBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.FUNC_CALL] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.FUNC_CALL,
        message0: '%1(%2)',
        args0: [
          { type: 'field_input', name: 'NAME', text: 'foo' },
          { type: 'input_value', name: 'ARG0' },
        ],
        output: null,
        colour: 290,
        tooltip: 'Function call',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const name = block.getFieldValue('NAME') as string;
  const args = ctx.variadicInputCodes(block, 'ARG', errors, 'ARG0');
  return `${name}(${args.join(', ')})`;
}
