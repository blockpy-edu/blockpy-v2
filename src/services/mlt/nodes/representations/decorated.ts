import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerDecoratedBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.DECORATED] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.DECORATED,
        message0: 'decorators %1',
        args0: [{ type: 'field_input', name: 'DECORATORS', text: '@decorator' }],
        message1: 'definition %1',
        args1: [{ type: 'field_input', name: 'TARGET', text: 'def f(): ...' }],
        previousStatement: null,
        nextStatement: null,
        colour: 290,
        tooltip: 'Decorator-applied definition',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  void errors;
  void ctx;
  const decoratorsRaw = (block.getFieldValue('DECORATORS') as string) || '@decorator';
  const target = (block.getFieldValue('TARGET') as string) || 'def f():\n    pass';
  const decorators = decoratorsRaw
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (d.startsWith('@') ? d : `@${d}`));
  return `${decorators.join('\n')}\n${target}`;
}
