import { PYTHON_BLOCK_TYPES } from './pythonBlocks';
import type { TranslationError } from '../types';

export interface BlockToPythonResult {
  code: string;
  errors: TranslationError[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlocklyBlock = any;

function indent(code: string, spaces = 4): string {
  return code
    .split('\n')
    .map((line) => ' '.repeat(spaces) + line)
    .join('\n');
}

function blockToCode(block: BlocklyBlock, errors: TranslationError[]): string {
  if (!block) return '';
  const type = block.type as string;

  switch (type) {
    case PYTHON_BLOCK_TYPES.NUMBER:
      return String(block.getFieldValue('VALUE'));
    case PYTHON_BLOCK_TYPES.STRING:
      return JSON.stringify(block.getFieldValue('VALUE'));
    case PYTHON_BLOCK_TYPES.BOOLEAN:
      return block.getFieldValue('VALUE') as string;
    case PYTHON_BLOCK_TYPES.NONE:
      return 'None';
    case PYTHON_BLOCK_TYPES.VARIABLE:
      return block.getFieldValue('NAME') as string;
    case PYTHON_BLOCK_TYPES.ASSIGN: {
      const varName = block.getFieldValue('VAR') as string;
      const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
      const value = valueBlock ? blockToCode(valueBlock, errors) : 'None';
      return `${varName} = ${value}`;
    }
    case PYTHON_BLOCK_TYPES.ADD: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} + ${right})`;
    }
    case PYTHON_BLOCK_TYPES.SUBTRACT: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} - ${right})`;
    }
    case PYTHON_BLOCK_TYPES.MULTIPLY: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} * ${right})`;
    }
    case PYTHON_BLOCK_TYPES.DIVIDE: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} / ${right})`;
    }
    case PYTHON_BLOCK_TYPES.MODULO: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} % ${right})`;
    }
    case PYTHON_BLOCK_TYPES.POWER: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} ** ${right})`;
    }
    case PYTHON_BLOCK_TYPES.COMPARE: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const op = block.getFieldValue('OP') as string;
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} ${op} ${right})`;
    }
    case PYTHON_BLOCK_TYPES.BOOL_OP: {
      const left = blockToCode(block.getInputTargetBlock('LEFT') as BlocklyBlock, errors);
      const op = block.getFieldValue('OP') as string;
      const right = blockToCode(block.getInputTargetBlock('RIGHT') as BlocklyBlock, errors);
      return `(${left} ${op} ${right})`;
    }
    case PYTHON_BLOCK_TYPES.NOT: {
      const value = blockToCode(block.getInputTargetBlock('VALUE') as BlocklyBlock, errors);
      return `(not ${value})`;
    }
    case PYTHON_BLOCK_TYPES.IF: {
      const condition = blockToCode(
        block.getInputTargetBlock('CONDITION') as BlocklyBlock,
        errors,
      );
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const elseBlock = block.getInputTargetBlock('ELSE') as BlocklyBlock;
      let code = `if ${condition}:\n`;
      const bodyCode = statementToCode(bodyBlock, errors);
      code += indent(bodyCode || 'pass') + '\n';
      if (elseBlock) {
        code += 'else:\n';
        code += indent(statementToCode(elseBlock, errors) || 'pass') + '\n';
      }
      return code.trimEnd();
    }
    case PYTHON_BLOCK_TYPES.WHILE: {
      const condition = blockToCode(
        block.getInputTargetBlock('CONDITION') as BlocklyBlock,
        errors,
      );
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      return `while ${condition}:\n${indent(bodyCode || 'pass')}`;
    }
    case PYTHON_BLOCK_TYPES.FOR: {
      const varName = block.getFieldValue('VAR') as string;
      const iterBlock = block.getInputTargetBlock('ITER') as BlocklyBlock;
      const iter = iterBlock ? blockToCode(iterBlock, errors) : '[]';
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      return `for ${varName} in ${iter}:\n${indent(bodyCode || 'pass')}`;
    }
    case PYTHON_BLOCK_TYPES.FUNC_DEF: {
      const name = block.getFieldValue('NAME') as string;
      const params = block.getFieldValue('PARAMS') as string;
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      return `def ${name}(${params}):\n${indent(bodyCode || 'pass')}`;
    }
    case PYTHON_BLOCK_TYPES.FUNC_CALL: {
      const name = block.getFieldValue('NAME') as string;
      const argBlock = block.getInputTargetBlock('ARG0') as BlocklyBlock;
      const arg = argBlock ? blockToCode(argBlock, errors) : '';
      return `${name}(${arg})`;
    }
    case PYTHON_BLOCK_TYPES.RETURN: {
      const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
      const value = valueBlock ? blockToCode(valueBlock, errors) : '';
      return `return ${value}`;
    }
    case PYTHON_BLOCK_TYPES.LIST: {
      const itemsBlock = block.getInputTargetBlock('ITEMS') as BlocklyBlock;
      const items = itemsBlock ? blockToCode(itemsBlock, errors) : '';
      return `[${items}]`;
    }
    case PYTHON_BLOCK_TYPES.PRINT: {
      const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
      const value = valueBlock ? blockToCode(valueBlock, errors) : '';
      return `print(${value})`;
    }
    case PYTHON_BLOCK_TYPES.IMPORT: {
      const module = block.getFieldValue('MODULE') as string;
      return `import ${module}`;
    }
    case PYTHON_BLOCK_TYPES.UNSUPPORTED:
      return (block.getFieldValue('CODE') as string) || '';
    case PYTHON_BLOCK_TYPES.ERROR:
      errors.push({
        type: 'parse_error',
        message: (block.getFieldValue('MESSAGE') as string) || 'error block',
      });
      return '# error';
    default:
      errors.push({
        type: 'unsupported_syntax',
        message: `Unknown block type: ${type}`,
        nodeType: type,
      });
      return `# unknown block: ${type}`;
  }
}

function statementToCode(block: BlocklyBlock, errors: TranslationError[]): string {
  if (!block) return '';
  const lines: string[] = [];
  let current: BlocklyBlock = block;
  while (current) {
    const line = blockToCode(current, errors);
    if (line) lines.push(line);
    current = current.getNextBlock ? (current.getNextBlock() as BlocklyBlock) : null;
  }
  return lines.join('\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function workspaceToPython(workspace: any): BlockToPythonResult {
  const errors: TranslationError[] = [];
  if (!workspace) return { code: '', errors };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topBlocks = workspace.getTopBlocks(true) as any[];
  const lines: string[] = [];

  for (const block of topBlocks) {
    const code = blockToCode(block as BlocklyBlock, errors);
    if (code.trim()) {
      lines.push(code);
      // Follow next statements for top-level statement blocks
      let next: BlocklyBlock = block.getNextBlock ? (block.getNextBlock() as BlocklyBlock) : null;
      while (next) {
        const nextCode = blockToCode(next, errors);
        if (nextCode.trim()) lines.push(nextCode);
        next = next.getNextBlock ? (next.getNextBlock() as BlocklyBlock) : null;
      }
    }
  }

  return { code: lines.join('\n'), errors };
}

export { blockToCode, statementToCode };
