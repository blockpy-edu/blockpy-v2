import { pythonLanguage } from '@codemirror/lang-python';
import type { SyntaxNode } from '@lezer/common';
import type { ParseResult, TranslationError, SourceLocation } from '../../types';
import { PYTHON_BLOCK_TYPES } from './pythonBlocks';
import {
  pythonExpressionHandlers,
  pythonStatementHandlers,
} from './nodes/representations/registry';
import type { PythonToBlocksContext } from './nodes/contracts';

const parser = pythonLanguage.parser;

function getLocation(node: SyntaxNode, source: string): SourceLocation {
  const before = source.slice(0, node.from);
  const lines = before.split('\n');
  const line = lines.length;
  const col = (lines[lines.length - 1] ?? '').length + 1;
  const afterSlice = source.slice(node.from, node.to);
  const endLines = afterSlice.split('\n');
  return {
    line,
    col,
    endLine: line + endLines.length - 1,
    endCol:
      endLines.length === 1
        ? col + afterSlice.length
        : (endLines[endLines.length - 1] ?? '').length + 1,
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeBlock(
  type: string,
  fields: Record<string, string>,
  values: Record<string, string>,
  statements: Record<string, string>,
  mutations?: Record<string, string>,
  next?: string,
): string {
  let xml = `<block type="${type}">`;
  if (mutations && Object.keys(mutations).length > 0) {
    const attrs = Object.entries(mutations)
      .map(([k, v]) => `${k}="${escapeXml(v)}"`)
      .join(' ');
    xml += `<mutation ${attrs}></mutation>`;
  }
  for (const [k, v] of Object.entries(fields)) {
    xml += `<field name="${k}">${escapeXml(v)}</field>`;
  }
  for (const [k, v] of Object.entries(values)) {
    xml += `<value name="${k}">${v}</value>`;
  }
  for (const [k, v] of Object.entries(statements)) {
    xml += `<statement name="${k}">${v}</statement>`;
  }
  if (next) xml += `<next>${next}</next>`;
  xml += '</block>';
  return xml;
}

function chainWithNext(blockXml: string, nextXml: string): string {
  const closingTag = '</block>';
  const lastCloseIdx = blockXml.lastIndexOf(closingTag);
  if (lastCloseIdx === -1) {
    return blockXml;
  }
  return blockXml.slice(0, lastCloseIdx) + `<next>${nextXml}</next>` + blockXml.slice(lastCloseIdx);
}

function setBlockPosition(blockXml: string, x: number, y: number): string {
  return blockXml.replace(/^<block\b([^>]*)>/, `<block$1 x="${x}" y="${y}">`);
}

function errorBlock(message: string): string {
  return makeBlock(PYTHON_BLOCK_TYPES.ERROR, { MESSAGE: message }, {}, {});
}

function nodeText(node: SyntaxNode, source: string): string {
  return source.slice(node.from, node.to);
}

function allChildren(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  let child = node.firstChild;
  while (child) {
    result.push(child);
    child = child.nextSibling;
  }
  return result;
}

function childByType(node: SyntaxNode, ...types: string[]): SyntaxNode | null {
  let child = node.firstChild;
  while (child) {
    if (types.includes(child.type.name)) return child;
    child = child.nextSibling;
  }
  return null;
}

function childrenByType(node: SyntaxNode, ...types: string[]): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  let child = node.firstChild;
  while (child) {
    if (types.includes(child.type.name)) result.push(child);
    child = child.nextSibling;
  }
  return result;
}

function isTokenNode(type: string): boolean {
  return type === '' || /^[^A-Za-z]+$/.test(type);
}

function isKeywordNode(type: string): boolean {
  return new Set([
    'if',
    'else',
    'elif',
    'for',
    'in',
    'while',
    'return',
    'def',
    'class',
    'lambda',
    'yield',
    'await',
    'from',
    'import',
    'as',
    'try',
    'except',
    'finally',
    'with',
    'async',
    'pass',
    'and',
    'or',
    'not',
  ]).has(type);
}

function isIgnorableLeaf(type: string): boolean {
  return type === 'newline' || type === 'indent' || type === 'dedent' || type === 'Comment';
}

function meaningfulChildren(node: SyntaxNode): SyntaxNode[] {
  return allChildren(node).filter((child) => {
    const type = child.type.name;
    return !isIgnorableLeaf(type) && !isTokenNode(type) && !isKeywordNode(type) && type !== ':';
  });
}

function makeCstExprBlock(node: SyntaxNode, source: string): string {
  return makeBlock(
    PYTHON_BLOCK_TYPES.CST_EXPR,
    { NODE: node.type.name, CODE: nodeText(node, source) },
    {},
    {},
  );
}

function makeCstStmtBlock(node: SyntaxNode, source: string): string {
  return makeBlock(
    PYTHON_BLOCK_TYPES.CST_STMT,
    { NODE: node.type.name, CODE: nodeText(node, source) },
    {},
    {},
  );
}

// ctx wires together the helper functions so registry handlers can call back into the parser.
// Function declarations are hoisted, so all references below are valid at module init time.
const ctx: PythonToBlocksContext = {
  nodeText,
  allChildren,
  childByType,
  childrenByType,
  meaningfulChildren,
  makeBlock,
  makeCstExprBlock,
  makeCstStmtBlock,
  errorBlock,
  exprToBlock,
  stmtToBlocksNoChain,
  statementsInBody,
  getLocation,
};

// Convert an expression node to block xml
function exprToBlock(node: SyntaxNode, source: string, errors: TranslationError[]): string {
  const handlers = pythonExpressionHandlers[node.type.name];
  if (handlers && handlers.length > 0) {
    return handlers[0]!(node, source, errors, ctx);
  }
  return makeCstExprBlock(node, source);
}

function statementsInBody(
  bodyNode: SyntaxNode,
  source: string,
  errors: TranslationError[],
): string {
  // Body contains ':', newlines, and statements
  const stmts = allChildren(bodyNode).filter((c) => {
    const t = c.type.name;
    return (
      t !== ':' &&
      t !== 'newline' &&
      t !== 'indent' &&
      t !== 'dedent' &&
      t !== '' &&
      t !== 'Comment'
    );
  });
  if (stmts.length === 0) return '';
  // Chain statements via stmtToBlocksNoChain then linking with <next>
  const xmlParts = stmts.map((s) => stmtToBlocksNoChain(s, source, errors)).filter((x) => x !== '');
  if (xmlParts.length === 0) return '';
  // Chain body statements vertically via <next> on each outer statement block.
  let result = xmlParts[xmlParts.length - 1]!;
  for (let i = xmlParts.length - 2; i >= 0; i--) {
    result = chainWithNext(xmlParts[i]!, result);
  }
  return result;
}

function stmtToBlocksNoChain(node: SyntaxNode, source: string, errors: TranslationError[]): string {
  const handlers = pythonStatementHandlers[node.type.name];
  if (handlers && handlers.length > 0) {
    return handlers[0]!(node, source, errors, ctx);
  }
  const typeName = node.type.name;
  if (typeName === '⚠' || typeName.startsWith('⚠')) {
    const parseError: TranslationError = {
      type: 'parse_error',
      message: `Parse error at: ${nodeText(node, source)}`,
      location: getLocation(node, source),
      sourceExcerpt: nodeText(node, source).slice(0, 60),
    };
    errors.push(parseError);
    return errorBlock(`Parse error: ${nodeText(node, source).slice(0, 30)}`);
  }
  return makeCstStmtBlock(node, source);
}

export function pythonToBlocks(source: string): ParseResult {
  const errors: TranslationError[] = [];

  if (!source.trim()) {
    return {
      success: true,
      blocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
      errors: [],
    };
  }

  try {
    const tree = parser.parse(source);
    const root = tree.topNode;

    // Collect top-level statement nodes
    const topStatements: SyntaxNode[] = [];
    let child = root.firstChild;
    while (child) {
      const t = child.type.name;
      if (t !== 'newline' && t !== '' && t !== 'indent' && t !== 'dedent' && t !== 'Comment') {
        topStatements.push(child);
      }
      child = child.nextSibling;
    }

    if (topStatements.length === 0) {
      return {
        success: true,
        blocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
        errors: [],
      };
    }

    const items = topStatements
      .map((stmt) => {
        const xml = stmtToBlocksNoChain(stmt, source, errors);
        return {
          xml,
          location: getLocation(stmt, source),
        };
      })
      .filter((item) => item.xml !== '');

    if (items.length === 0) {
      return {
        success: true,
        blocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
        errors,
      };
    }

    const groups: Array<typeof items> = [];
    let currentGroup = [items[0]!];
    for (let i = 1; i < items.length; i++) {
      const previous = items[i - 1]!;
      const current = items[i]!;
      const previousEndLine = previous.location.endLine ?? previous.location.line;
      const hasBlankLineBetween = current.location.line - previousEndLine > 1;
      if (hasBlankLineBetween) {
        groups.push(currentGroup);
        currentGroup = [current];
      } else {
        currentGroup.push(current);
      }
    }
    groups.push(currentGroup);

    const topBlocks = groups.map((group) => {
      let chainXml = group[group.length - 1]!.xml;
      for (let i = group.length - 2; i >= 0; i--) {
        chainXml = chainWithNext(group[i]!.xml, chainXml);
      }
      const startLine = group[0]!.location.line;
      return setBlockPosition(chainXml, 20, 20 + (startLine - 1) * 70);
    });

    const blocksContent = topBlocks.join('');
    const blocksXml = `<xml xmlns="https://developers.google.com/blockly/xml">${blocksContent}</xml>`;
    const hasParseErrors = errors.some((e) => e.type === 'parse_error');
    return { success: !hasParseErrors, blocksXml, errors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      blocksXml: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
      errors: [{ type: 'parse_error', message: `Parser threw: ${msg}` }],
    };
  }
}
