import { describe, it, expect } from 'vitest';
import { pythonToBlocks } from '../pythonToBlocks';
import { PYTHON_BLOCK_TYPES } from '../pythonBlocks';
import { blockToCode } from '../blockToPython';
import type { TranslationError } from '../../types';

// Mock block builder from XML - parses block XML to a simple block structure
// for lightweight round-trip tests without Blockly runtime
function parseBlockXml(xmlStr: string): {
  type: string;
  fields: Record<string, string>;
  hasType: (t: string) => boolean;
} {
  const typeMatch = xmlStr.match(/block type="([^"]+)"/);
  const type = typeMatch ? typeMatch[1]! : '';
  const fields: Record<string, string> = {};
  const fieldRegex = /<field name="([^"]+)">([^<]*)<\/field>/g;
  let m;
  while ((m = fieldRegex.exec(xmlStr)) !== null) {
    fields[m[1]!] = m[2]!
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
  return {
    type,
    fields,
    hasType: (t: string) => xmlStr.includes(`block type="${t}"`),
  };
}

describe('round-trip: Python → Blocks XML', () => {
  it('x = 5 produces assign block with number', () => {
    const result = pythonToBlocks('x = 5');
    expect(result.success).toBe(true);
    const parsed = parseBlockXml(result.blocksXml!);
    expect(parsed.hasType(PYTHON_BLOCK_TYPES.ASSIGN)).toBe(true);
    expect(parsed.hasType(PYTHON_BLOCK_TYPES.NUMBER)).toBe(true);
    expect(parsed.fields['VAR']).toBe('x');
    expect(parsed.fields['VALUE']).toBe('5');
  });

  it('import math produces import block', () => {
    const result = pythonToBlocks('import math');
    expect(result.success).toBe(true);
    const parsed = parseBlockXml(result.blocksXml!);
    expect(parsed.hasType(PYTHON_BLOCK_TYPES.IMPORT)).toBe(true);
    expect(parsed.fields['MODULE']).toBe('math');
  });

  it('print("hello") produces print block with string', () => {
    const result = pythonToBlocks('print("hello")');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain(PYTHON_BLOCK_TYPES.PRINT);
    expect(result.blocksXml).toContain(PYTHON_BLOCK_TYPES.STRING);
    expect(result.blocksXml).toContain('>hello<');
  });

  it('not True produces not block', () => {
    const result = pythonToBlocks('not True');
    expect(result.success).toBe(true);
    expect(result.blocksXml).toContain(PYTHON_BLOCK_TYPES.NOT);
    expect(result.blocksXml).toContain(PYTHON_BLOCK_TYPES.BOOLEAN);
  });
});

describe('blockToCode round-trip', () => {
  it('NUMBER block produces its value', () => {
    const errors: TranslationError[] = [];
    const block = { type: PYTHON_BLOCK_TYPES.NUMBER, getFieldValue: () => '99', getInputTargetBlock: () => null, getNextBlock: () => null };
    expect(blockToCode(block, errors)).toBe('99');
  });

  it('ASSIGN block with STRING value produces assignment', () => {
    const errors: TranslationError[] = [];
    const strBlock = { type: PYTHON_BLOCK_TYPES.STRING, getFieldValue: () => 'world', getInputTargetBlock: () => null, getNextBlock: () => null };
    const block = {
      type: PYTHON_BLOCK_TYPES.ASSIGN,
      getFieldValue: (n: string) => (n === 'VAR' ? 'msg' : ''),
      getInputTargetBlock: (n: string) => (n === 'VALUE' ? strBlock : null),
      getNextBlock: () => null,
    };
    expect(blockToCode(block, errors)).toBe('msg = "world"');
  });

  it('nested arithmetic: (1 + 2) * 3', () => {
    const errors: TranslationError[] = [];
    const n1 = { type: PYTHON_BLOCK_TYPES.NUMBER, getFieldValue: () => '1', getInputTargetBlock: () => null, getNextBlock: () => null };
    const n2 = { type: PYTHON_BLOCK_TYPES.NUMBER, getFieldValue: () => '2', getInputTargetBlock: () => null, getNextBlock: () => null };
    const n3 = { type: PYTHON_BLOCK_TYPES.NUMBER, getFieldValue: () => '3', getInputTargetBlock: () => null, getNextBlock: () => null };
    const addBlock = {
      type: PYTHON_BLOCK_TYPES.ADD,
      getFieldValue: () => '',
      getInputTargetBlock: (n: string) => (n === 'LEFT' ? n1 : n === 'RIGHT' ? n2 : null),
      getNextBlock: () => null,
    };
    const mulBlock = {
      type: PYTHON_BLOCK_TYPES.MULTIPLY,
      getFieldValue: () => '',
      getInputTargetBlock: (n: string) => (n === 'LEFT' ? addBlock : n === 'RIGHT' ? n3 : null),
      getNextBlock: () => null,
    };
    expect(blockToCode(mulBlock, errors)).toBe('((1 + 2) * 3)');
    expect(errors).toHaveLength(0);
  });

  it('DICT block preserves dictionary source', () => {
    const errors: TranslationError[] = [];
    const block = {
      type: PYTHON_BLOCK_TYPES.DICT,
      getFieldValue: (n: string) => (n === 'CODE' ? '{"a": 1}' : ''),
      getInputTargetBlock: () => null,
      getNextBlock: () => null,
    };
    expect(blockToCode(block, errors)).toBe('{"a": 1}');
    expect(errors).toHaveLength(0);
  });
});

describe('pythonToBlocks stability', () => {
  it('empty string is idempotent', () => {
    const r1 = pythonToBlocks('');
    const r2 = pythonToBlocks('');
    expect(r1.blocksXml).toBe(r2.blocksXml);
  });

  it('same input produces same XML (determinism)', () => {
    const src = 'x = 1\ny = x + 2\nprint(y)';
    const r1 = pythonToBlocks(src);
    const r2 = pythonToBlocks(src);
    expect(r1.blocksXml).toBe(r2.blocksXml);
    expect(r1.errors.length).toBe(r2.errors.length);
  });

  it('multiple statements all appear in XML', () => {
    const src = 'a = 1\nb = 2\nc = 3';
    const result = pythonToBlocks(src);
    expect((result.blocksXml!.match(/py_assign/g) ?? []).length).toBe(3);
  });
});
