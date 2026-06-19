import { describe, it, expect } from 'vitest';
import { blockToCode, statementToCode, workspaceToPython } from '../mlt/blockToPython';
import { PYTHON_BLOCK_TYPES } from '../mlt/pythonBlocks';
import type { TranslationError } from '../../types';
import type { BlocklyBlock } from '../mlt/nodes/blocklyTypes';

interface MockBlock {
  type: string;
  getFieldValue: (name: string) => string;
  getInputTargetBlock: (name: string) => MockBlock | null;
  getNextBlock: () => MockBlock | null;
}

// Helper to create a mock block
function makeBlock(
  type: string,
  fields: Record<string, string> = {},
  inputs: Record<string, MockBlock | null> = {},
  next: MockBlock | null = null,
): BlocklyBlock {
  const block = {
    type,
    getFieldValue: (name: string) => fields[name] ?? '',
    getInputTargetBlock: (name: string) => (inputs[name] ?? null) as unknown as BlocklyBlock | null,
    getNextBlock: () => next as unknown as BlocklyBlock | null,
  };
  return block as unknown as BlocklyBlock;
}

describe('blockToCode', () => {
  it('converts NUMBER block', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '42' });
    expect(blockToCode(block, errors)).toBe('42');
    expect(errors).toHaveLength(0);
  });

  it('converts STRING block', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: 'hello' });
    expect(blockToCode(block, errors)).toBe('"hello"');
  });

  it('converts BOOLEAN block - True', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' });
    expect(blockToCode(block, errors)).toBe('True');
  });

  it('converts BOOLEAN block - False', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'False' });
    expect(blockToCode(block, errors)).toBe('False');
  });

  it('converts NONE block', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.NONE);
    expect(blockToCode(block, errors)).toBe('None');
  });

  it('converts VARIABLE block', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'my_var' });
    expect(blockToCode(block, errors)).toBe('my_var');
  });

  it('converts ASSIGN block', () => {
    const errors: TranslationError[] = [];
    const valueBlock = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '10' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.ASSIGN, { VAR: 'x' }, { VALUE: valueBlock });
    expect(blockToCode(block, errors)).toBe('x = 10');
  });

  it('converts ASSIGN block with no value defaults to None', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.ASSIGN, { VAR: 'y' }, { VALUE: null });
    expect(blockToCode(block, errors)).toBe('y = None');
  });

  it('converts ADD block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '1' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '2' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.ADD, {}, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(1 + 2)');
  });

  it('converts SUBTRACT block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '5' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '3' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.SUBTRACT, {}, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(5 - 3)');
  });

  it('converts MULTIPLY block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '4' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '3' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.MULTIPLY, {}, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(4 * 3)');
  });

  it('converts DIVIDE block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '10' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '2' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.DIVIDE, {}, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(10 / 2)');
  });

  it('converts MODULO block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '7' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '3' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.MODULO, {}, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(7 % 3)');
  });

  it('converts POWER block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '2' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '8' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.POWER, {}, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(2 ** 8)');
  });

  it('converts COMPARE block', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '5' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '3' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.COMPARE, { OP: '>' }, { LEFT: left, RIGHT: right });
    expect(blockToCode(block, errors)).toBe('(5 > 3)');
  });

  it('converts BOOL_OP block (and)', () => {
    const errors: TranslationError[] = [];
    const left = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' });
    const right = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'False' });
    const block = makeBlock(
      PYTHON_BLOCK_TYPES.BOOL_OP,
      { OP: 'and' },
      { LEFT: left, RIGHT: right },
    );
    expect(blockToCode(block, errors)).toBe('(True and False)');
  });

  it('converts NOT block', () => {
    const errors: TranslationError[] = [];
    const value = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.NOT, {}, { VALUE: value });
    expect(blockToCode(block, errors)).toBe('(not True)');
  });

  it('converts PRINT block', () => {
    const errors: TranslationError[] = [];
    const value = makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: 'hello' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.PRINT, {}, { VALUE: value });
    expect(blockToCode(block, errors)).toBe('print("hello")');
  });

  it('converts IMPORT block', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.IMPORT, { MODULE: 'math' });
    expect(blockToCode(block, errors)).toBe('import math');
  });

  it('converts FUNC_CALL block', () => {
    const errors: TranslationError[] = [];
    const arg = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '42' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.FUNC_CALL, { NAME: 'foo' }, { ARG0: arg });
    expect(blockToCode(block, errors)).toBe('foo(42)');
  });

  it('converts RETURN block', () => {
    const errors: TranslationError[] = [];
    const value = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '0' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.RETURN, {}, { VALUE: value });
    expect(blockToCode(block, errors)).toBe('return 0');
  });

  it('converts LIST block', () => {
    const errors: TranslationError[] = [];
    const items = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '1' });
    const block = makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, { ITEMS: items });
    expect(blockToCode(block, errors)).toBe('[1]');
  });

  it('converts UNSUPPORTED block', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.UNSUPPORTED, { CODE: 'yield 42' });
    expect(blockToCode(block, errors)).toBe('yield 42');
  });

  it('converts ERROR block and adds error', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock(PYTHON_BLOCK_TYPES.ERROR, { MESSAGE: 'something broke' });
    const result = blockToCode(block, errors);
    expect(result).toBe('# error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.type).toBe('parse_error');
  });

  it('handles unknown block type gracefully', () => {
    const errors: TranslationError[] = [];
    const block = makeBlock('unknown_block_xyz');
    const result = blockToCode(block, errors);
    expect(result).toContain('unknown_block_xyz');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.type).toBe('unsupported_syntax');
  });

  it('returns empty string for null block', () => {
    const errors: TranslationError[] = [];
    expect(blockToCode(null, errors)).toBe('');
  });
});

describe('statementToCode', () => {
  it('chains multiple blocks with newlines', () => {
    const errors: TranslationError[] = [];
    const block3 = makeBlock(PYTHON_BLOCK_TYPES.IMPORT, { MODULE: 'sys' }, {}, null);
    const block2 = makeBlock(
      PYTHON_BLOCK_TYPES.ASSIGN,
      { VAR: 'y' },
      { VALUE: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '2' }) },
      block3,
    );
    const block1 = makeBlock(
      PYTHON_BLOCK_TYPES.ASSIGN,
      { VAR: 'x' },
      { VALUE: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '1' }) },
      block2,
    );
    const result = statementToCode(block1, errors);
    expect(result).toBe('x = 1\ny = 2\nimport sys');
  });
});

describe('IF block', () => {
  it('converts IF block with body', () => {
    const errors: TranslationError[] = [];
    const cond = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' });
    const body = makeBlock(
      PYTHON_BLOCK_TYPES.ASSIGN,
      { VAR: 'x' },
      { VALUE: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '1' }) },
    );
    const block = makeBlock(PYTHON_BLOCK_TYPES.IF, {}, { CONDITION: cond, BODY: body, ELSE: null });
    const result = blockToCode(block, errors);
    expect(result).toContain('if True:');
    expect(result).toContain('    x = 1');
  });
});

describe('WHILE block', () => {
  it('converts WHILE block', () => {
    const errors: TranslationError[] = [];
    const cond = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' });
    const body = makeBlock(
      PYTHON_BLOCK_TYPES.ASSIGN,
      { VAR: 'done' },
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' }),
      },
    );
    const block = makeBlock(PYTHON_BLOCK_TYPES.WHILE, {}, { CONDITION: cond, BODY: body });
    const result = blockToCode(block, errors);
    expect(result).toContain('while True:');
    expect(result).toContain('    done = True');
  });

  it('converts WHILE_ELSE block', () => {
    const errors: TranslationError[] = [];
    const cond = makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'False' });
    const body = makeBlock(
      PYTHON_BLOCK_TYPES.PRINT,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: 'loop' }),
      },
    );
    const elseBody = makeBlock(
      PYTHON_BLOCK_TYPES.PRINT,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: 'done' }),
      },
    );
    const block = makeBlock(
      PYTHON_BLOCK_TYPES.WHILE_ELSE,
      {},
      {
        CONDITION: cond,
        BODY: body,
        ELSE: elseBody,
      },
    );
    const result = blockToCode(block, errors);
    expect(result).toContain('while False:');
    expect(result).toContain('else:');
    expect(result).toContain('print("done")');
  });
});

describe('FOR block', () => {
  it('converts FOR block', () => {
    const errors: TranslationError[] = [];
    const iter = makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, { ITEMS: null });
    const body = makeBlock(
      PYTHON_BLOCK_TYPES.PRINT,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'i' }),
      },
    );
    const block = makeBlock(PYTHON_BLOCK_TYPES.FOR, { VAR: 'i' }, { ITER: iter, BODY: body });
    const result = blockToCode(block, errors);
    expect(result).toContain('for i in []');
    expect(result).toContain('    print(i)');
  });

  it('converts FOR_ELSE block', () => {
    const errors: TranslationError[] = [];
    const iter = makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, { ADD0: null });
    const body = makeBlock(
      PYTHON_BLOCK_TYPES.PRINT,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'i' }),
      },
    );
    const elseBody = makeBlock(
      PYTHON_BLOCK_TYPES.PRINT,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: 'done' }),
      },
    );
    const block = makeBlock(
      PYTHON_BLOCK_TYPES.FOR_ELSE,
      { VAR: 'i' },
      {
        ITER: iter,
        BODY: body,
        ELSE: elseBody,
      },
    );
    const result = blockToCode(block, errors);
    expect(result).toContain('for i in []:');
    expect(result).toContain('else:');
    expect(result).toContain('print("done")');
  });
});

describe('additional expression blocks', () => {
  it('converts variadic FUNC_CALL args', () => {
    const errors: TranslationError[] = [];
    const a0 = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '1' });
    const a1 = makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '2' });
    const call = makeBlock(PYTHON_BLOCK_TYPES.FUNC_CALL, { NAME: 'f' }, { ARG0: a0, ARG1: a1 });
    expect(blockToCode(call, errors)).toBe('f(1, 2)');
  });

  it('converts TUPLE block', () => {
    const errors: TranslationError[] = [];
    const t = makeBlock(
      PYTHON_BLOCK_TYPES.TUPLE,
      {},
      {
        ADD0: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '1' }),
        ADD1: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '2' }),
      },
    );
    expect(blockToCode(t, errors)).toBe('(1, 2)');
  });

  it('converts COMPREHENSION block', () => {
    const errors: TranslationError[] = [];
    const c = makeBlock(PYTHON_BLOCK_TYPES.COMPREHENSION, {
      KIND: 'list',
      CODE: 'x for x in xs if x % 2 == 0',
    });
    expect(blockToCode(c, errors)).toBe('[x for x in xs if x % 2 == 0]');
  });

  it('converts structured COMPREHENSION with for/if clause blocks', () => {
    const errors: TranslationError[] = [];
    const elt = makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'x' });
    const forClause = makeBlock(
      PYTHON_BLOCK_TYPES.COMPREHENSION_FOR,
      {},
      {
        TARGET: makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'x' }),
        ITER: makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'xs' }),
      },
    );
    const ifClause = makeBlock(
      PYTHON_BLOCK_TYPES.COMPREHENSION_IF,
      {},
      {
        TEST: makeBlock(
          PYTHON_BLOCK_TYPES.COMPARE,
          { OP: '>' },
          {
            LEFT: makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'x' }),
            RIGHT: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '0' }),
          },
        ),
      },
    );
    const c = makeBlock(
      PYTHON_BLOCK_TYPES.COMPREHENSION,
      { KIND: 'list', CODE: '' },
      { ELT: elt, GENERATOR0: forClause, GENERATOR1: ifClause },
    );
    expect(blockToCode(c, errors)).toBe('[x for x in xs if (x > 0)]');
  });

  it('converts ATTR and INDEX blocks', () => {
    const errors: TranslationError[] = [];
    const obj = makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: 'data' });
    const attr = makeBlock(PYTHON_BLOCK_TYPES.ATTR, { ATTR: 'items' }, { OBJ: obj });
    const idx = makeBlock(
      PYTHON_BLOCK_TYPES.INDEX,
      {},
      {
        VALUE: attr,
        INDEX: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '0' }),
      },
    );
    expect(blockToCode(idx, errors)).toBe('data.items[0]');
  });
});

describe('FUNC_DEF block', () => {
  it('converts function definition', () => {
    const errors: TranslationError[] = [];
    const body = makeBlock(
      PYTHON_BLOCK_TYPES.RETURN,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: '0' }),
      },
    );
    const block = makeBlock(
      PYTHON_BLOCK_TYPES.FUNC_DEF,
      { NAME: 'greet', PARAMS: 'name' },
      { BODY: body },
    );
    const result = blockToCode(block, errors);
    expect(result).toContain('def greet(name):');
    expect(result).toContain('    return 0');
  });
});

describe('workspaceToPython', () => {
  it('returns empty code for null workspace', () => {
    const result = workspaceToPython(null);
    expect(result.code).toBe('');
    expect(result.errors).toHaveLength(0);
  });

  it('converts workspace with blocks', () => {
    const printBlock = makeBlock(
      PYTHON_BLOCK_TYPES.PRINT,
      {},
      {
        VALUE: makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: 'hello' }),
      },
    );
    const workspace = {
      getTopBlocks: () => [printBlock],
    };
    const result = workspaceToPython(workspace);
    expect(result.code).toBe('print("hello")');
    expect(result.errors).toHaveLength(0);
  });

  it('handles workspace with no blocks', () => {
    const workspace = { getTopBlocks: () => [] };
    const result = workspaceToPython(workspace);
    expect(result.code).toBe('');
  });
});
