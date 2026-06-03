import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerBooleanBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.BOOLEAN] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.BOOLEAN,
        message0: '%1',
        args0: [
          {
            type: 'field_dropdown',
            name: 'VALUE',
            options: [
              ['True', 'True'],
              ['False', 'False'],
            ],
          },
        ],
        output: 'Boolean',
        colour: 210,
        tooltip: 'A boolean literal',
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
  return block.getFieldValue('VALUE') as string;
}
