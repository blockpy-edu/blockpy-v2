import { describe, it, expect } from 'vitest';
import { pythonToBlocks } from '../pythonToBlocks';

describe('pythonToBlocks', () => {
  it('returns empty XML for empty source', () => {
    const result = pythonToBlocks('');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('<xml');
    expect(result.errors).toHaveLength(0);
  });

  it('returns empty XML for whitespace-only source', () => {
    const result = pythonToBlocks('   \n  \n  ');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('<xml');
    expect(result.errors).toHaveLength(0);
  });

  it('converts a simple assignment: x = 5', () => {
    const result = pythonToBlocks('x = 5');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_assign');
    expect(result.blocksXml).toContain('py_number');
    expect(result.blocksXml).toContain('>x<');
    expect(result.blocksXml).toContain('>5<');
  });

  it('converts string assignment: name = "Alice"', () => {
    const result = pythonToBlocks('name = "Alice"');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_string');
    expect(result.blocksXml).toContain('Alice');
  });

  it('converts boolean assignment: flag = True', () => {
    const result = pythonToBlocks('flag = True');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_boolean');
    expect(result.blocksXml).toContain('True');
  });

  it('converts None assignment: val = None', () => {
    const result = pythonToBlocks('val = None');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_none');
  });

  it('converts arithmetic: z = 1 + 2', () => {
    const result = pythonToBlocks('z = 1 + 2');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_add');
  });

  it('converts subtraction: z = 5 - 3', () => {
    const result = pythonToBlocks('z = 5 - 3');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_subtract');
  });

  it('converts multiplication: z = 4 * 3', () => {
    const result = pythonToBlocks('z = 4 * 3');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_multiply');
  });

  it('converts division: z = 10 / 2', () => {
    const result = pythonToBlocks('z = 10 / 2');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_divide');
  });

  it('converts modulo: z = 7 % 3', () => {
    const result = pythonToBlocks('z = 7 % 3');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_modulo');
  });

  it('converts power: z = 2 ** 8', () => {
    const result = pythonToBlocks('z = 2 ** 8');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_power');
  });

  it('converts comparison: x == 5', () => {
    const result = pythonToBlocks('x == 5');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_compare');
    expect(result.blocksXml).toContain('==');
  });

  it('converts boolean and: x and y', () => {
    const result = pythonToBlocks('x and y');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_bool_op');
    expect(result.blocksXml).toContain('and');
  });

  it('converts boolean or: x or y', () => {
    const result = pythonToBlocks('x or y');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_bool_op');
    expect(result.blocksXml).toContain('or');
  });

  it('converts not expression: not z', () => {
    const result = pythonToBlocks('not z');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_not');
  });

  it('converts print call: print(x)', () => {
    const result = pythonToBlocks('print(x)');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_print');
  });

  it('converts generic function call: foo(42)', () => {
    const result = pythonToBlocks('foo(42)');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_func_call');
    expect(result.blocksXml).toContain('foo');
  });

  it('converts if statement', () => {
    const result = pythonToBlocks('if x > 0:\n    print(x)');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_if');
    expect(result.blocksXml).toContain('py_compare');
    expect(result.blocksXml).toContain('py_print');
  });

  it('converts while statement', () => {
    const result = pythonToBlocks('while x > 0:\n    x = x - 1');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_while');
  });

  it('converts for statement', () => {
    const result = pythonToBlocks('for i in items:\n    print(i)');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_for');
    expect(result.blocksXml).toContain('>i<');
  });

  it('converts function definition', () => {
    const result = pythonToBlocks('def greet(name):\n    return name');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_func_def');
    expect(result.blocksXml).toContain('greet');
  });

  it('converts return statement', () => {
    const result = pythonToBlocks('def f():\n    return 42');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_return');
  });

  it('converts import statement', () => {
    const result = pythonToBlocks('import math');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_import');
    expect(result.blocksXml).toContain('math');
  });

  it('converts list literal: [1, 2, 3]', () => {
    const result = pythonToBlocks('[1, 2, 3]');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_list');
  });

  it('converts multiple statements', () => {
    const result = pythonToBlocks('x = 1\ny = 2\nprint(x)');
    expect(result.success).toBe(true);
    // Should have multiple blocks
    expect((result.blocksXml!.match(/py_assign/g) ?? []).length).toBe(2);
    expect(result.blocksXml).toContain('py_print');
  });

  it('handles pass statement silently', () => {
    const result = pythonToBlocks('if True:\n    pass');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain('py_if');
  });

  it('produces unsupported block for unknown constructs and adds error', () => {
    // yield is not supported
    const result = pythonToBlocks('yield 42');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.blocksXml).toContain('py_unsupported');
  });

  it('escapes XML special chars in field values', () => {
    const result = pythonToBlocks('x = "<hello>"');
    expect(result.success).toBe(true);
    // The string value should be XML-escaped
    expect(result.blocksXml).not.toContain('>"<hello>"<');
    expect(result.blocksXml).toContain('&lt;');
  });

  it('has well-formed XML output', () => {
    const result = pythonToBlocks('x = 5\nprint(x)');
    expect(result.blocksXml).toMatch(/^<xml[^>]*>/);
    expect(result.blocksXml).toMatch(/<\/xml>$/);
  });
});
