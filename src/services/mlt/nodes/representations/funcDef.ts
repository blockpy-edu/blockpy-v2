import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerFuncDefBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.FUNC_DEF] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.FUNC_DEF,
        message0: 'def %1 (%2)',
        args0: [
          { type: 'field_input', name: 'NAME', text: 'my_function' },
          { type: 'field_input', name: 'PARAMS', text: '' },
        ],
        message1: 'do %1',
        args1: [{ type: 'input_statement', name: 'BODY' }],
        previousStatement: null,
        nextStatement: null,
        colour: 290,
        tooltip: 'Function definition',
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
  const params = block.getFieldValue('PARAMS') as string;
  const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
  const bodyCode = ctx.statementToCode(bodyBlock, errors);
  return `def ${name}(${params}):\n${ctx.indent(bodyCode || 'pass')}`;
}
