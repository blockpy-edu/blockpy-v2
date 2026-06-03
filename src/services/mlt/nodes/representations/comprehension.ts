import type { BlocklyAPI, BlocklyBlock } from '../blocklyTypes';
import type { BlockToPythonContext } from '../contracts';
import type { TranslationError } from '../../../../types';
import { PYTHON_BLOCK_TYPES } from '../../pythonBlocks';

export function registerComprehensionBlock(blockly: BlocklyAPI): void {
  blockly.Blocks[PYTHON_BLOCK_TYPES.COMPREHENSION] = {
    init(this: BlocklyBlock) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.COMPREHENSION,
        message0: 'comprehension %1',
        args0: [{ type: 'input_value', name: 'ELT' }],
        output: null,
        colour: 260,
        tooltip: 'Python comprehension',
      });
    },
  };
}

export function blockToPython(
  block: BlocklyBlock,
  errors: TranslationError[],
  ctx: BlockToPythonContext,
): string {
  const kind = (block.getFieldValue('KIND') as string) || 'list';
  const legacyCode = ((block.getFieldValue('CODE') as string) || '').trim();
  const elt = ctx.blockToCode(block.getInputTargetBlock('ELT') as BlocklyBlock, errors).trim();
  const clauses = ctx.comprehensionClauses(block, errors);
  const inner =
    elt && clauses.length > 0 ? `${elt} ${clauses.join(' ')}` : legacyCode || 'x for x in []';
  if (kind === 'generator') return `(${inner})`;
  if (kind === 'set') return `{${inner}}`;
  if (kind === 'dict') return `{${inner}}`;
  return `[${inner}]`;
}
