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

function variadicInputCodes(
  block: BlocklyBlock,
  preferredPrefix: string,
  errors: TranslationError[],
  fallbackInput?: string,
): string[] {
  const values: string[] = [];
  for (let i = 0; i < 32; i++) {
    const child = block.getInputTargetBlock(`${preferredPrefix}${i}`) as BlocklyBlock;
    if (!child) continue;
    const code = blockToCode(child, errors).trim();
    if (code) values.push(code);
  }

  if (values.length === 0 && fallbackInput) {
    const fallback = block.getInputTargetBlock(fallbackInput) as BlocklyBlock;
    if (fallback) {
      const code = blockToCode(fallback, errors).trim();
      if (code) values.push(code);
    }
  }
  return values;
}

function comprehensionClauses(block: BlocklyBlock, errors: TranslationError[]): string[] {
  return variadicInputCodes(block, 'GENERATOR', errors).filter(Boolean);
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
      const condition = blockToCode(block.getInputTargetBlock('CONDITION') as BlocklyBlock, errors);
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
      const condition = blockToCode(block.getInputTargetBlock('CONDITION') as BlocklyBlock, errors);
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      return `while ${condition}:\n${indent(bodyCode || 'pass')}`;
    }
    case PYTHON_BLOCK_TYPES.WHILE_ELSE: {
      const condition = blockToCode(block.getInputTargetBlock('CONDITION') as BlocklyBlock, errors);
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const elseBlock = block.getInputTargetBlock('ELSE') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      const elseCode = statementToCode(elseBlock, errors);
      return `while ${condition}:\n${indent(bodyCode || 'pass')}\nelse:\n${indent(elseCode || 'pass')}`;
    }
    case PYTHON_BLOCK_TYPES.FOR: {
      const varName = block.getFieldValue('VAR') as string;
      const iterBlock = block.getInputTargetBlock('ITER') as BlocklyBlock;
      const iter = iterBlock ? blockToCode(iterBlock, errors) : '[]';
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      return `for ${varName} in ${iter}:\n${indent(bodyCode || 'pass')}`;
    }
    case PYTHON_BLOCK_TYPES.FOR_ELSE: {
      const varName = block.getFieldValue('VAR') as string;
      const iterBlock = block.getInputTargetBlock('ITER') as BlocklyBlock;
      const iter = iterBlock ? blockToCode(iterBlock, errors) : '[]';
      const bodyBlock = block.getInputTargetBlock('BODY') as BlocklyBlock;
      const elseBlock = block.getInputTargetBlock('ELSE') as BlocklyBlock;
      const bodyCode = statementToCode(bodyBlock, errors);
      const elseCode = statementToCode(elseBlock, errors);
      return `for ${varName} in ${iter}:\n${indent(bodyCode || 'pass')}\nelse:\n${indent(elseCode || 'pass')}`;
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
      const args = variadicInputCodes(block, 'ARG', errors, 'ARG0');
      return `${name}(${args.join(', ')})`;
    }
    case PYTHON_BLOCK_TYPES.RETURN: {
      const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
      const value = valueBlock ? blockToCode(valueBlock, errors) : '';
      return `return ${value}`;
    }
    case PYTHON_BLOCK_TYPES.LIST: {
      const items = variadicInputCodes(block, 'ADD', errors, 'ITEMS');
      return `[${items.join(', ')}]`;
    }
    case PYTHON_BLOCK_TYPES.TUPLE: {
      const items = variadicInputCodes(block, 'ADD', errors, 'ITEMS');
      if (items.length === 1) {
        return `(${items[0]},)`;
      }
      return `(${items.join(', ')})`;
    }
    case PYTHON_BLOCK_TYPES.DICT: {
      const code = (block.getFieldValue('CODE') as string) || '{}';
      return code.trim() || '{}';
    }
    case PYTHON_BLOCK_TYPES.PRINT: {
      const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
      const value = valueBlock ? blockToCode(valueBlock, errors) : '';
      return `print(${value})`;
    }
    case PYTHON_BLOCK_TYPES.EXPR_STMT: {
      const valueBlock = block.getInputTargetBlock('VALUE') as BlocklyBlock;
      return valueBlock ? blockToCode(valueBlock, errors) : '';
    }
    case PYTHON_BLOCK_TYPES.IMPORT: {
      const module = block.getFieldValue('MODULE') as string;
      return `import ${module}`;
    }
    case PYTHON_BLOCK_TYPES.ATTR: {
      const obj = blockToCode(block.getInputTargetBlock('OBJ') as BlocklyBlock, errors);
      const attr = block.getFieldValue('ATTR') as string;
      return `${obj}.${attr}`;
    }
    case PYTHON_BLOCK_TYPES.INDEX: {
      const value = blockToCode(block.getInputTargetBlock('VALUE') as BlocklyBlock, errors);
      const index = blockToCode(block.getInputTargetBlock('INDEX') as BlocklyBlock, errors);
      return `${value}[${index}]`;
    }
    case PYTHON_BLOCK_TYPES.COMPREHENSION: {
      const kind = (block.getFieldValue('KIND') as string) || 'list';
      const legacyCode = ((block.getFieldValue('CODE') as string) || '').trim();
      const elt = blockToCode(block.getInputTargetBlock('ELT') as BlocklyBlock, errors).trim();
      const clauses = comprehensionClauses(block, errors);
      const inner =
        elt && clauses.length > 0 ? `${elt} ${clauses.join(' ')}` : legacyCode || 'x for x in []';
      if (kind === 'generator') return `(${inner})`;
      if (kind === 'set') return `{${inner}}`;
      if (kind === 'dict') return `{${inner}}`;
      return `[${inner}]`;
    }
    case PYTHON_BLOCK_TYPES.COMPREHENSION_FOR: {
      const target =
        blockToCode(block.getInputTargetBlock('TARGET') as BlocklyBlock, errors) || '_';
      const iter = blockToCode(block.getInputTargetBlock('ITER') as BlocklyBlock, errors) || '[]';
      return `for ${target} in ${iter}`;
    }
    case PYTHON_BLOCK_TYPES.COMPREHENSION_IF: {
      const test = blockToCode(block.getInputTargetBlock('TEST') as BlocklyBlock, errors) || 'True';
      return `if ${test}`;
    }
    case PYTHON_BLOCK_TYPES.DECORATED: {
      const decoratorsRaw = (block.getFieldValue('DECORATORS') as string) || '@decorator';
      const target = (block.getFieldValue('TARGET') as string) || 'def f():\n    pass';
      const decorators = decoratorsRaw
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => (d.startsWith('@') ? d : `@${d}`));
      return `${decorators.join('\n')}\n${target}`;
    }
    case PYTHON_BLOCK_TYPES.CST_EXPR:
    case PYTHON_BLOCK_TYPES.CST_STMT:
    case PYTHON_BLOCK_TYPES.TRY:
      return (block.getFieldValue('CODE') as string) || '';
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
