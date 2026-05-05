import { pythonLanguage } from '@codemirror/lang-python';
import type { SyntaxNode } from '@lezer/common';
import type { ParseResult, TranslationError, UnsupportedSyntaxError, SourceLocation } from '../types';
import { PYTHON_BLOCK_TYPES } from './pythonBlocks';

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

function unsupportedError(node: SyntaxNode, source: string): UnsupportedSyntaxError {
  return {
    type: 'unsupported_syntax',
    nodeType: node.type.name,
    location: getLocation(node, source),
    sourceExcerpt: source.slice(node.from, Math.min(node.to, node.from + 60)),
    message: `Unsupported syntax: ${node.type.name}`,
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
  next?: string,
): string {
  let xml = `<block type="${type}">`;
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

function errorBlock(message: string): string {
  return makeBlock(PYTHON_BLOCK_TYPES.ERROR, { MESSAGE: message }, {}, {});
}

function unsupportedBlock(code: string): string {
  return makeBlock(PYTHON_BLOCK_TYPES.UNSUPPORTED, { CODE: code }, {}, {});
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

const ARITH_OPS: Record<string, string> = {
  '+': PYTHON_BLOCK_TYPES.ADD,
  '-': PYTHON_BLOCK_TYPES.SUBTRACT,
  '*': PYTHON_BLOCK_TYPES.MULTIPLY,
  '/': PYTHON_BLOCK_TYPES.DIVIDE,
  '%': PYTHON_BLOCK_TYPES.MODULO,
  '**': PYTHON_BLOCK_TYPES.POWER,
};

const COMPARE_OPS = new Set(['==', '!=', '<', '<=', '>', '>=']);

// Convert an expression node to block xml
function exprToBlock(node: SyntaxNode, source: string, errors: TranslationError[]): string {
  const type = node.type.name;

  switch (type) {
    case 'Number':
      return makeBlock(PYTHON_BLOCK_TYPES.NUMBER, { VALUE: nodeText(node, source) }, {}, {});
    case 'String': {
      const raw = nodeText(node, source);
      let value = raw;
      if (raw.startsWith('"""') || raw.startsWith("'''")) {
        value = raw.slice(3, -3);
      } else if (
        (raw.startsWith("'") && raw.endsWith("'")) ||
        (raw.startsWith('"') && raw.endsWith('"'))
      ) {
        value = raw.slice(1, -1);
      }
      return makeBlock(PYTHON_BLOCK_TYPES.STRING, { VALUE: value }, {}, {});
    }
    case 'Boolean': {
      const val = nodeText(node, source);
      return makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: val === 'True' ? 'True' : 'False' }, {}, {});
    }
    case 'None':
      return makeBlock(PYTHON_BLOCK_TYPES.NONE, {}, {}, {});
    case 'VariableName':
      return makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: nodeText(node, source) }, {}, {});
    case 'BinaryExpression': {
      const children = allChildren(node);
      if (children.length < 3) {
        errors.push(unsupportedError(node, source));
        return unsupportedBlock(nodeText(node, source));
      }
      const leftNode = children[0]!;
      const opNode = children[1]!;
      const rightNode = children[2]!;
      const op = nodeText(opNode, source);
      const left = exprToBlock(leftNode, source, errors);
      const right = exprToBlock(rightNode, source, errors);

      if (op in ARITH_OPS) {
        return makeBlock(ARITH_OPS[op]!, {}, { LEFT: left, RIGHT: right }, {});
      }
      if (COMPARE_OPS.has(op)) {
        return makeBlock(PYTHON_BLOCK_TYPES.COMPARE, { OP: op }, { LEFT: left, RIGHT: right }, {});
      }
      if (op === 'and' || op === 'or') {
        return makeBlock(PYTHON_BLOCK_TYPES.BOOL_OP, { OP: op }, { LEFT: left, RIGHT: right }, {});
      }
      errors.push(unsupportedError(node, source));
      return unsupportedBlock(nodeText(node, source));
    }
    case 'UnaryExpression': {
      const children = allChildren(node);
      if (children.length >= 2) {
        const op = nodeText(children[0]!, source);
        if (op === 'not') {
          const val = exprToBlock(children[1]!, source, errors);
          return makeBlock(PYTHON_BLOCK_TYPES.NOT, {}, { VALUE: val }, {});
        }
      }
      errors.push(unsupportedError(node, source));
      return unsupportedBlock(nodeText(node, source));
    }
    case 'CallExpression': {
      const children = allChildren(node);
      if (children.length < 1) {
        errors.push(unsupportedError(node, source));
        return unsupportedBlock(nodeText(node, source));
      }
      const funcNode = children[0]!;
      const funcName = nodeText(funcNode, source);
      const argListNode = childByType(node, 'ArgList');
      let arg0 = '';
      if (argListNode) {
        const argChildren = allChildren(argListNode).filter(
          (c) => c.type.name !== ',' && c.type.name !== '(' && c.type.name !== ')',
        );
        if (argChildren.length > 0) {
          arg0 = exprToBlock(argChildren[0]!, source, errors);
        }
      }
      if (funcName === 'print') {
        return makeBlock(PYTHON_BLOCK_TYPES.PRINT, {}, arg0 ? { VALUE: arg0 } : {}, {});
      }
      return makeBlock(
        PYTHON_BLOCK_TYPES.FUNC_CALL,
        { NAME: funcName },
        arg0 ? { ARG0: arg0 } : {},
        {},
      );
    }
    case 'ArrayExpression': {
      const items = allChildren(node).filter(
        (c) => c.type.name !== '[' && c.type.name !== ']' && c.type.name !== ',',
      );
      const itemXml = items.length > 0 ? exprToBlock(items[0]!, source, errors) : '';
      return makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, itemXml ? { ITEMS: itemXml } : {}, {});
    }
    case 'ParenthesizedExpression': {
      // Unwrap the inner expression
      const inner = allChildren(node).find(
        (c) => c.type.name !== '(' && c.type.name !== ')',
      );
      if (inner) return exprToBlock(inner, source, errors);
      errors.push(unsupportedError(node, source));
      return unsupportedBlock(nodeText(node, source));
    }
    default: {
      errors.push(unsupportedError(node, source));
      return unsupportedBlock(nodeText(node, source));
    }
  }
}

function statementsInBody(bodyNode: SyntaxNode, source: string, errors: TranslationError[]): string {
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
  // Chain: wrap each block in the previous's <next>
  let result = xmlParts[xmlParts.length - 1]!;
  for (let i = xmlParts.length - 2; i >= 0; i--) {
    result = xmlParts[i]!.replace('</block>', `<next>${result}</next></block>`);
  }
  return result;
}

function stmtToBlocksNoChain(node: SyntaxNode, source: string, errors: TranslationError[]): string {
  const type = node.type.name;

  switch (type) {
    case 'AssignStatement': {
      const children = allChildren(node);
      // VariableName, AssignOp, rhs
      const assignOpIdx = children.findIndex((c) => c.type.name === 'AssignOp');
      if (assignOpIdx < 1) {
        errors.push(unsupportedError(node, source));
        return unsupportedBlock(nodeText(node, source));
      }
      const lhsNode = children[assignOpIdx - 1]!;
      const rhsNode = children[assignOpIdx + 1];
      const varName = nodeText(lhsNode, source);
      const valueXml = rhsNode
        ? exprToBlock(rhsNode, source, errors)
        : makeBlock(PYTHON_BLOCK_TYPES.NONE, {}, {}, {});
      return makeBlock(PYTHON_BLOCK_TYPES.ASSIGN, { VAR: varName }, { VALUE: valueXml }, {});
    }
    case 'ExpressionStatement': {
      const exprNode = node.firstChild;
      if (!exprNode) return '';
      return exprToBlock(exprNode, source, errors);
    }
    case 'IfStatement': {
      // if <cond> <Body> [elif/else ...]
      const children = allChildren(node);
      // Find condition: first non-keyword child before Body
      const condNode = children.find(
        (c) =>
          c.type.name !== 'if' &&
          c.type.name !== 'elif' &&
          c.type.name !== 'else' &&
          c.type.name !== ':' &&
          c.type.name !== 'Body' &&
          c.type.name !== 'ElseClause' &&
          c.type.name !== 'ElifClause',
      );
      const bodies = childrenByType(node, 'Body');
      const elseClause = childByType(node, 'ElseClause');

      const condXml = condNode
        ? exprToBlock(condNode, source, errors)
        : makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' }, {}, {});
      const bodyXml = bodies[0] ? statementsInBody(bodies[0], source, errors) : '';
      let elseXml = '';
      if (elseClause) {
        const elseBody = childByType(elseClause, 'Body');
        elseXml = elseBody ? statementsInBody(elseBody, source, errors) : '';
      }
      return makeBlock(
        PYTHON_BLOCK_TYPES.IF,
        {},
        { CONDITION: condXml },
        { BODY: bodyXml, ...(elseXml ? { ELSE: elseXml } : {}) },
      );
    }
    case 'WhileStatement': {
      // while <cond> <Body>
      const children = allChildren(node);
      const condNode = children.find(
        (c) =>
          c.type.name !== 'while' &&
          c.type.name !== ':' &&
          c.type.name !== 'Body' &&
          c.type.name !== '⚠',
      );
      const bodyNode = childByType(node, 'Body');
      const condXml = condNode
        ? exprToBlock(condNode, source, errors)
        : makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' }, {}, {});
      const bodyXml = bodyNode ? statementsInBody(bodyNode, source, errors) : '';
      return makeBlock(PYTHON_BLOCK_TYPES.WHILE, {}, { CONDITION: condXml }, { BODY: bodyXml });
    }
    case 'ForStatement': {
      // for <VariableName> in <iter> <Body>
      const children = allChildren(node);
      const inIdx = children.findIndex((c) => c.type.name === 'in');
      if (inIdx < 1) {
        errors.push(unsupportedError(node, source));
        return unsupportedBlock(nodeText(node, source));
      }
      const varNode = children[inIdx - 1]!;
      const bodyNode = childByType(node, 'Body');
      // iter is between 'in' and 'Body'
      const bodyIdx = children.findIndex((c) => c.type.name === 'Body');
      const iterNode = bodyIdx > inIdx + 1 ? children[inIdx + 1] : null;
      const varName = nodeText(varNode, source);
      const iterXml = iterNode
        ? exprToBlock(iterNode, source, errors)
        : makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, {}, {});
      const bodyXml = bodyNode ? statementsInBody(bodyNode, source, errors) : '';
      return makeBlock(
        PYTHON_BLOCK_TYPES.FOR,
        { VAR: varName },
        { ITER: iterXml },
        { BODY: bodyXml },
      );
    }
    case 'FunctionDefinition': {
      const nameNode = childByType(node, 'VariableName');
      const paramListNode = childByType(node, 'ParamList');
      const bodyNode = childByType(node, 'Body');
      const funcName = nameNode ? nodeText(nameNode, source) : 'f';
      const params = paramListNode
        ? nodeText(paramListNode, source).replace(/^\(/, '').replace(/\)$/, '')
        : '';
      const bodyXml = bodyNode ? statementsInBody(bodyNode, source, errors) : '';
      return makeBlock(
        PYTHON_BLOCK_TYPES.FUNC_DEF,
        { NAME: funcName, PARAMS: params },
        {},
        { BODY: bodyXml },
      );
    }
    case 'ReturnStatement': {
      // return <expr>
      const children = allChildren(node);
      // First child is 'return' keyword
      const exprNode = children.length > 1 ? children[1] : null;
      const valueXml = exprNode ? exprToBlock(exprNode, source, errors) : '';
      return makeBlock(
        PYTHON_BLOCK_TYPES.RETURN,
        {},
        valueXml ? { VALUE: valueXml } : {},
        {},
      );
    }
    case 'ImportStatement': {
      const children = allChildren(node);
      const moduleNode = children.find(
        (c) => c.type.name === 'VariableName' || c.type.name === 'dottedName',
      );
      const moduleName = moduleNode ? nodeText(moduleNode, source) : 'module';
      return makeBlock(PYTHON_BLOCK_TYPES.IMPORT, { MODULE: moduleName }, {}, {});
    }
    case 'PassStatement':
      // Pass is a no-op statement - skip silently
      return '';
    case 'PrintStatement': {
      // Python 2 print statement
      const children = allChildren(node);
      const exprNode = children.length > 1 ? children[1] : null;
      const valueXml = exprNode ? exprToBlock(exprNode, source, errors) : '';
      return makeBlock(PYTHON_BLOCK_TYPES.PRINT, {}, valueXml ? { VALUE: valueXml } : {}, {});
    }
    default: {
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
      errors.push(unsupportedError(node, source));
      return unsupportedBlock(nodeText(node, source));
    }
  }
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

    const xmlParts = topStatements
      .map((stmt) => stmtToBlocksNoChain(stmt, source, errors))
      .filter((x) => x !== '');

    const blocksContent = xmlParts.join('');
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
