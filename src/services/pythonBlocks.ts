// We use dynamic Blockly import, so type the parameter with a loose definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockDefinition = any;

// We use dynamic Blockly import, so type the parameter
export interface BlocklyAPI {
  Blocks: Record<string, BlockDefinition>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const PYTHON_BLOCK_TYPES = {
  NUMBER: 'py_number',
  STRING: 'py_string',
  BOOLEAN: 'py_boolean',
  NONE: 'py_none',
  VARIABLE: 'py_variable',
  ASSIGN: 'py_assign',
  ADD: 'py_add',
  SUBTRACT: 'py_subtract',
  MULTIPLY: 'py_multiply',
  DIVIDE: 'py_divide',
  MODULO: 'py_modulo',
  POWER: 'py_power',
  COMPARE: 'py_compare',
  BOOL_OP: 'py_bool_op',
  NOT: 'py_not',
  IF: 'py_if',
  WHILE: 'py_while',
  FOR: 'py_for',
  FUNC_DEF: 'py_func_def',
  FUNC_CALL: 'py_func_call',
  RETURN: 'py_return',
  LIST: 'py_list',
  TUPLE: 'py_tuple',
  DICT: 'py_dict',
  INDEX: 'py_index',
  ATTR: 'py_attr',
  IMPORT: 'py_import',
  PRINT: 'py_print',
  TRY: 'py_try',
  UNSUPPORTED: 'py_unsupported',
  ERROR: 'py_error',
} as const;

export type PythonBlockType = (typeof PYTHON_BLOCK_TYPES)[keyof typeof PYTHON_BLOCK_TYPES];

export function registerPythonBlocks(blockly: BlocklyAPI): void {
  // Number literal
  blockly.Blocks[PYTHON_BLOCK_TYPES.NUMBER] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.NUMBER,
        message0: '%1',
        args0: [{ type: 'field_number', name: 'VALUE', value: 0 }],
        output: 'Number',
        colour: 230,
        tooltip: 'A number literal',
      });
    },
  };

  // String literal
  blockly.Blocks[PYTHON_BLOCK_TYPES.STRING] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.STRING,
        message0: '"%1"',
        args0: [{ type: 'field_input', name: 'VALUE', text: '' }],
        output: 'String',
        colour: 160,
        tooltip: 'A string literal',
      });
    },
  };

  // Boolean literal
  blockly.Blocks[PYTHON_BLOCK_TYPES.BOOLEAN] = {
    init(this: BlocklyAPI) {
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

  // None literal
  blockly.Blocks[PYTHON_BLOCK_TYPES.NONE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.NONE,
        message0: 'None',
        output: null,
        colour: 210,
        tooltip: 'The None value',
      });
    },
  };

  // Variable reference
  blockly.Blocks[PYTHON_BLOCK_TYPES.VARIABLE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.VARIABLE,
        message0: '%1',
        args0: [{ type: 'field_input', name: 'NAME', text: 'x' }],
        output: null,
        colour: 330,
        tooltip: 'A variable reference',
      });
    },
  };

  // Assignment statement
  blockly.Blocks[PYTHON_BLOCK_TYPES.ASSIGN] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.ASSIGN,
        message0: '%1 = %2',
        args0: [
          { type: 'field_input', name: 'VAR', text: 'x' },
          { type: 'input_value', name: 'VALUE' },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 330,
        tooltip: 'Assign a value to a variable',
      });
    },
  };

  // Arithmetic: add
  blockly.Blocks[PYTHON_BLOCK_TYPES.ADD] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.ADD,
        message0: '%1 + %2',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Number',
        colour: 230,
        tooltip: 'Add two values',
      });
    },
  };

  // Arithmetic: subtract
  blockly.Blocks[PYTHON_BLOCK_TYPES.SUBTRACT] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.SUBTRACT,
        message0: '%1 - %2',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Number',
        colour: 230,
        tooltip: 'Subtract two values',
      });
    },
  };

  // Arithmetic: multiply
  blockly.Blocks[PYTHON_BLOCK_TYPES.MULTIPLY] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.MULTIPLY,
        message0: '%1 \u00d7 %2',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Number',
        colour: 230,
        tooltip: 'Multiply two values',
      });
    },
  };

  // Arithmetic: divide
  blockly.Blocks[PYTHON_BLOCK_TYPES.DIVIDE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.DIVIDE,
        message0: '%1 / %2',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Number',
        colour: 230,
        tooltip: 'Divide two values',
      });
    },
  };

  // Arithmetic: modulo
  blockly.Blocks[PYTHON_BLOCK_TYPES.MODULO] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.MODULO,
        message0: '%1 % %2',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Number',
        colour: 230,
        tooltip: 'Modulo of two values',
      });
    },
  };

  // Arithmetic: power
  blockly.Blocks[PYTHON_BLOCK_TYPES.POWER] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.POWER,
        message0: '%1 ** %2',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Number',
        colour: 230,
        tooltip: 'Raise to the power',
      });
    },
  };

  // Comparison
  blockly.Blocks[PYTHON_BLOCK_TYPES.COMPARE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.COMPARE,
        message0: '%1 %2 %3',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          {
            type: 'field_dropdown',
            name: 'OP',
            options: [
              ['==', '=='],
              ['!=', '!='],
              ['<', '<'],
              ['<=', '<='],
              ['>', '>'],
              ['>=', '>='],
            ],
          },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Boolean',
        colour: 210,
        tooltip: 'Compare two values',
      });
    },
  };

  // Boolean operator (and/or)
  blockly.Blocks[PYTHON_BLOCK_TYPES.BOOL_OP] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.BOOL_OP,
        message0: '%1 %2 %3',
        args0: [
          { type: 'input_value', name: 'LEFT' },
          {
            type: 'field_dropdown',
            name: 'OP',
            options: [
              ['and', 'and'],
              ['or', 'or'],
            ],
          },
          { type: 'input_value', name: 'RIGHT' },
        ],
        output: 'Boolean',
        colour: 210,
        tooltip: 'Boolean and/or',
      });
    },
  };

  // Not operator
  blockly.Blocks[PYTHON_BLOCK_TYPES.NOT] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.NOT,
        message0: 'not %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        output: 'Boolean',
        colour: 210,
        tooltip: 'Boolean not',
      });
    },
  };

  // If statement
  blockly.Blocks[PYTHON_BLOCK_TYPES.IF] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.IF,
        message0: 'if %1',
        args0: [{ type: 'input_value', name: 'CONDITION' }],
        message1: 'do %1',
        args1: [{ type: 'input_statement', name: 'BODY' }],
        message2: 'else %1',
        args2: [{ type: 'input_statement', name: 'ELSE' }],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: 'If/else statement',
      });
    },
  };

  // While loop
  blockly.Blocks[PYTHON_BLOCK_TYPES.WHILE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.WHILE,
        message0: 'while %1',
        args0: [{ type: 'input_value', name: 'CONDITION' }],
        message1: 'do %1',
        args1: [{ type: 'input_statement', name: 'BODY' }],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: 'While loop',
      });
    },
  };

  // For loop
  blockly.Blocks[PYTHON_BLOCK_TYPES.FOR] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.FOR,
        message0: 'for %1 in %2',
        args0: [
          { type: 'field_input', name: 'VAR', text: 'i' },
          { type: 'input_value', name: 'ITER' },
        ],
        message1: 'do %1',
        args1: [{ type: 'input_statement', name: 'BODY' }],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: 'For loop',
      });
    },
  };

  // Function definition
  blockly.Blocks[PYTHON_BLOCK_TYPES.FUNC_DEF] = {
    init(this: BlocklyAPI) {
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

  // Function call
  blockly.Blocks[PYTHON_BLOCK_TYPES.FUNC_CALL] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.FUNC_CALL,
        message0: '%1 (%2)',
        args0: [
          { type: 'field_input', name: 'NAME', text: 'my_function' },
          { type: 'input_value', name: 'ARG0' },
        ],
        output: null,
        previousStatement: null,
        nextStatement: null,
        colour: 290,
        tooltip: 'Function call',
      });
    },
  };

  // Return statement
  blockly.Blocks[PYTHON_BLOCK_TYPES.RETURN] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.RETURN,
        message0: 'return %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null,
        colour: 290,
        tooltip: 'Return statement',
      });
    },
  };

  // List literal
  blockly.Blocks[PYTHON_BLOCK_TYPES.LIST] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.LIST,
        message0: '[ %1 ]',
        args0: [{ type: 'input_value', name: 'ITEMS' }],
        output: 'Array',
        colour: 260,
        tooltip: 'List literal',
      });
    },
  };

  // Print statement
  blockly.Blocks[PYTHON_BLOCK_TYPES.PRINT] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.PRINT,
        message0: 'print(%1)',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null,
        nextStatement: null,
        colour: 290,
        tooltip: 'Print to output',
      });
    },
  };

  // Import statement
  blockly.Blocks[PYTHON_BLOCK_TYPES.IMPORT] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.IMPORT,
        message0: 'import %1',
        args0: [{ type: 'field_input', name: 'MODULE', text: 'math' }],
        previousStatement: null,
        nextStatement: null,
        colour: 45,
        tooltip: 'Import a module',
      });
    },
  };

  // Unsupported syntax placeholder
  blockly.Blocks[PYTHON_BLOCK_TYPES.UNSUPPORTED] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.UNSUPPORTED,
        message0: '\u26a0 unsupported: %1',
        args0: [{ type: 'field_input', name: 'CODE', text: '...' }],
        previousStatement: null,
        nextStatement: null,
        colour: 0,
        tooltip: 'Unsupported Python syntax',
      });
    },
  };

  // Error block placeholder
  blockly.Blocks[PYTHON_BLOCK_TYPES.ERROR] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.ERROR,
        message0: '\u26d4 error: %1',
        args0: [{ type: 'field_input', name: 'MESSAGE', text: 'parse error' }],
        previousStatement: null,
        nextStatement: null,
        colour: 0,
        tooltip: 'Parse error block',
      });
    },
  };
}

export const PYTHON_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Values',
      colour: '230',
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.NUMBER },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.STRING },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.BOOLEAN },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.NONE },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      colour: '330',
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.VARIABLE },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.ASSIGN },
      ],
    },
    {
      kind: 'category',
      name: 'Arithmetic',
      colour: '230',
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.ADD },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.SUBTRACT },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.MULTIPLY },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.DIVIDE },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.MODULO },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.POWER },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.COMPARE },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.BOOL_OP },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.NOT },
      ],
    },
    {
      kind: 'category',
      name: 'Control',
      colour: '120',
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.IF },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.WHILE },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.FOR },
      ],
    },
    {
      kind: 'category',
      name: 'Functions',
      colour: '290',
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.FUNC_DEF },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.FUNC_CALL },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.RETURN },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.PRINT },
      ],
    },
    {
      kind: 'category',
      name: 'Lists',
      colour: '260',
      contents: [{ kind: 'block', type: PYTHON_BLOCK_TYPES.LIST }],
    },
    {
      kind: 'category',
      name: 'Imports',
      colour: '45',
      contents: [{ kind: 'block', type: PYTHON_BLOCK_TYPES.IMPORT }],
    },
  ],
};
