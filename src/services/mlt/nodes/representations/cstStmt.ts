import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerCstStmtBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.CST_STMT] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.CST_STMT,
        message0: '%1 %2',
        args0: [
          { type: 'field_input', name: 'NODE', text: 'NodeType' },
          { type: 'field_input', name: 'CODE', text: 'source' },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 20,
        tooltip: 'Generic CST statement node',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  void block;
  void errors;
  void ctx;
  return (block.getFieldValue('CODE') as string) || '';
}
