// We use dynamic Blockly import, so type the parameter with a loose definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockDefinition = any;

// We use dynamic Blockly import, so type the parameter
export interface BlocklyAPI {
  Blocks: Record<string, BlockDefinition>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface MutableBlock {
  argCount_: number;
  setColour: (colour: number) => void;
  setOutput: (newBoolean: boolean, check?: string | string[] | null) => void;
  setPreviousStatement: (newBoolean: boolean) => void;
  setNextStatement: (newBoolean: boolean) => void;
  setTooltip: (text: string) => void;
  setInputsInline: (newBoolean: boolean) => void;
  appendDummyInput: (name?: string) => {
    appendField: (...args: unknown[]) => { appendField: (...args: unknown[]) => unknown };
  };
  appendValueInput: (name: string) => unknown;
  getInput: (name: string) => unknown;
  removeInput: (name: string) => void;
  updateShape_: () => void;
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
  WHILE_ELSE: 'py_while_else',
  FOR: 'py_for',
  FOR_ELSE: 'py_for_else',
  FUNC_DEF: 'py_func_def',
  FUNC_CALL: 'py_func_call',
  RETURN: 'py_return',
  LIST: 'py_list',
  TUPLE: 'py_tuple',
  DICT: 'py_dict',
  COMPREHENSION: 'py_comprehension',
  DECORATED: 'py_decorated',
  INDEX: 'py_index',
  ATTR: 'py_attr',
  IMPORT: 'py_import',
  PRINT: 'py_print',
  EXPR_STMT: 'py_expr_stmt',
  CST_EXPR: 'py_cst_expr',
  CST_STMT: 'py_cst_stmt',
  TRY: 'py_try',
  UNSUPPORTED: 'py_unsupported',
  ERROR: 'py_error',
} as const;

export type PythonBlockType = (typeof PYTHON_BLOCK_TYPES)[keyof typeof PYTHON_BLOCK_TYPES];

function registerVariadicValueBlock(
  blockly: BlocklyAPI,
  type: string,
  opts: {
    colour: number;
    output?: string | null;
    previousStatement?: null;
    nextStatement?: null;
    tooltip: string;
    openLabel: string;
    closeLabel: string;
    inputPrefix: string;
    minCount: number;
  },
): void {
  blockly.Blocks[type] = {
    init(this: MutableBlock) {
      this.argCount_ = opts.minCount;
      this.setColour(opts.colour);
      if (opts.output !== undefined) {
        if (opts.output === null) {
          this.setOutput(true);
        } else {
          this.setOutput(true, opts.output);
        }
      }
      if (opts.previousStatement !== undefined) this.setPreviousStatement(true);
      if (opts.nextStatement !== undefined) this.setNextStatement(true);
      this.setTooltip(opts.tooltip);
      this.setInputsInline(true);
      this.updateShape_();
    },
    mutationToDom(this: MutableBlock) {
      const container = document.createElement('mutation');
      container.setAttribute('argc', String(this.argCount_));
      return container;
    },
    domToMutation(this: MutableBlock, xmlElement: Element) {
      const count = Number(xmlElement.getAttribute('argc'));
      this.argCount_ = Number.isFinite(count) ? Math.max(opts.minCount, count) : opts.minCount;
      this.updateShape_();
    },
    updateShape_(this: MutableBlock) {
      if (!this.getInput('OPEN')) {
        this.appendDummyInput('OPEN').appendField(opts.openLabel);
      }

      for (let i = 0; i < this.argCount_; i++) {
        if (!this.getInput(`${opts.inputPrefix}${i}`)) {
          this.appendValueInput(`${opts.inputPrefix}${i}`);
        }
      }

      let i = this.argCount_;
      while (this.getInput(`${opts.inputPrefix}${i}`)) {
        this.removeInput(`${opts.inputPrefix}${i}`);
        i++;
      }

      if (!this.getInput('CLOSE')) {
        this.appendDummyInput('CLOSE').appendField(opts.closeLabel);
      }
    },
  };
}

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

  // While/else loop
  blockly.Blocks[PYTHON_BLOCK_TYPES.WHILE_ELSE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.WHILE_ELSE,
        message0: 'while %1',
        args0: [{ type: 'input_value', name: 'CONDITION' }],
        message1: 'do %1',
        args1: [{ type: 'input_statement', name: 'BODY' }],
        message2: 'else %1',
        args2: [{ type: 'input_statement', name: 'ELSE' }],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: 'While/else loop',
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

  // For/else loop
  blockly.Blocks[PYTHON_BLOCK_TYPES.FOR_ELSE] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.FOR_ELSE,
        message0: 'for %1 in %2',
        args0: [
          { type: 'field_input', name: 'VAR', text: 'i' },
          { type: 'input_value', name: 'ITER' },
        ],
        message1: 'do %1',
        args1: [{ type: 'input_statement', name: 'BODY' }],
        message2: 'else %1',
        args2: [{ type: 'input_statement', name: 'ELSE' }],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: 'For/else loop',
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
    init(this: MutableBlock) {
      this.argCount_ = 1;
      this.setColour(290);
      this.setOutput(true);
      this.setTooltip('Function call');
      this.setInputsInline(true);
      this.appendDummyInput('FUNC')
        .appendField('call')
        .appendField(new blockly.FieldTextInput('my_function'), 'NAME');
      this.updateShape_();
    },
    mutationToDom(this: MutableBlock) {
      const container = document.createElement('mutation');
      container.setAttribute('argc', String(this.argCount_));
      return container;
    },
    domToMutation(this: MutableBlock, xmlElement: Element) {
      const count = Number(xmlElement.getAttribute('argc'));
      this.argCount_ = Number.isFinite(count) ? Math.max(0, count) : 1;
      this.updateShape_();
    },
    updateShape_(this: MutableBlock) {
      for (let i = 0; i < this.argCount_; i++) {
        if (!this.getInput(`ARG${i}`)) {
          this.appendValueInput(`ARG${i}`);
        }
      }
      let i = this.argCount_;
      while (this.getInput(`ARG${i}`)) {
        this.removeInput(`ARG${i}`);
        i++;
      }
    },
  };

  // Expression statement wrapper (for standalone expressions like foo())
  blockly.Blocks[PYTHON_BLOCK_TYPES.EXPR_STMT] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.EXPR_STMT,
        message0: '%1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null,
        nextStatement: null,
        colour: 300,
        tooltip: 'Standalone expression statement',
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

  // List literal (dynamic arity via XML mutation support)
  registerVariadicValueBlock(blockly, PYTHON_BLOCK_TYPES.LIST, {
    colour: 260,
    output: 'Array',
    tooltip: 'List literal',
    openLabel: '[',
    closeLabel: ']',
    inputPrefix: 'ADD',
    minCount: 0,
  });

  // Tuple literal (dynamic arity via XML mutation support)
  registerVariadicValueBlock(blockly, PYTHON_BLOCK_TYPES.TUPLE, {
    colour: 260,
    output: null,
    tooltip: 'Tuple literal',
    openLabel: '(',
    closeLabel: ')',
    inputPrefix: 'ADD',
    minCount: 0,
  });

  // Dictionary literal (stored as source text for now)
  blockly.Blocks[PYTHON_BLOCK_TYPES.DICT] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.DICT,
        message0: '%1',
        args0: [{ type: 'field_input', name: 'CODE', text: '{"key": 1}' }],
        output: null,
        colour: 260,
        tooltip: 'Dictionary literal',
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

  // Generic comprehension expression
  blockly.Blocks[PYTHON_BLOCK_TYPES.COMPREHENSION] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.COMPREHENSION,
        message0: '%1 %2',
        args0: [
          {
            type: 'field_dropdown',
            name: 'KIND',
            options: [
              ['list', 'list'],
              ['set', 'set'],
              ['dict', 'dict'],
              ['generator', 'generator'],
            ],
          },
          { type: 'field_input', name: 'CODE', text: 'x for x in xs' },
        ],
        output: null,
        colour: 260,
        tooltip: 'Python comprehension expression',
      });
    },
  };

  // Attribute access
  blockly.Blocks[PYTHON_BLOCK_TYPES.ATTR] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.ATTR,
        message0: '%1 . %2',
        args0: [
          { type: 'input_value', name: 'OBJ' },
          { type: 'field_input', name: 'ATTR', text: 'attr' },
        ],
        output: null,
        colour: 330,
        tooltip: 'Attribute access',
      });
    },
  };

  // Index access
  blockly.Blocks[PYTHON_BLOCK_TYPES.INDEX] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.INDEX,
        message0: '%1 [ %2 ]',
        args0: [
          { type: 'input_value', name: 'VALUE' },
          { type: 'input_value', name: 'INDEX' },
        ],
        output: null,
        colour: 260,
        tooltip: 'Index access',
      });
    },
  };

  // Generic try block fallback as raw source
  blockly.Blocks[PYTHON_BLOCK_TYPES.TRY] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.TRY,
        message0: 'try block %1',
        args0: [{ type: 'field_input', name: 'CODE', text: 'try:\n    pass' }],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: 'Try/except/finally source fallback',
      });
    },
  };

  // Decorated definitions (functions/classes)
  blockly.Blocks[PYTHON_BLOCK_TYPES.DECORATED] = {
    init(this: BlocklyAPI) {
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

  // Generic expression block used to preserve unsupported CST nodes as expressions
  blockly.Blocks[PYTHON_BLOCK_TYPES.CST_EXPR] = {
    init(this: BlocklyAPI) {
      this.jsonInit({
        type: PYTHON_BLOCK_TYPES.CST_EXPR,
        message0: '%1 %2',
        args0: [
          { type: 'field_input', name: 'NODE', text: 'NodeType' },
          { type: 'field_input', name: 'CODE', text: 'source' },
        ],
        output: null,
        colour: 20,
        tooltip: 'Generic CST expression node',
      });
    },
  };

  // Generic statement block used to preserve unsupported CST nodes as statements
  blockly.Blocks[PYTHON_BLOCK_TYPES.CST_STMT] = {
    init(this: BlocklyAPI) {
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
        { kind: 'block', type: PYTHON_BLOCK_TYPES.WHILE_ELSE },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.FOR },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.FOR_ELSE },
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
      contents: [
        { kind: 'block', type: PYTHON_BLOCK_TYPES.LIST },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.TUPLE },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.DICT },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.COMPREHENSION },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.INDEX },
        { kind: 'block', type: PYTHON_BLOCK_TYPES.ATTR },
      ],
    },
    {
      kind: 'category',
      name: 'Imports',
      colour: '45',
      contents: [{ kind: 'block', type: PYTHON_BLOCK_TYPES.IMPORT }],
    },
  ],
};
