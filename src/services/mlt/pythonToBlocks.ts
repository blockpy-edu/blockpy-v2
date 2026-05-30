import { pythonLanguage } from '@codemirror/lang-python';
import type { SyntaxNode } from '@lezer/common';
import type { ParseResult, TranslationError, SourceLocation } from '../../types';
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

function comprehensionKind(nodeType: string): string {
  switch (nodeType) {
    case 'ArrayComprehensionExpression':
      return 'list';
    case 'SetComprehensionExpression':
      return 'set';
    case 'DictionaryComprehensionExpression':
      return 'dict';
    case 'ComprehensionExpression':
      return 'generator';
    default:
      return 'list';
  }
}

function makeComprehensionFragment(text: string, label: string): string {
  return makeBlock(PYTHON_BLOCK_TYPES.CST_EXPR, { NODE: label, CODE: text.trim() || '_' }, {}, {});
}

function nextClauseBoundary(children: SyntaxNode[], start: number): number {
  for (let i = start; i < children.length; i++) {
    const type = children[i]!.type.name;
    if (type === 'for' || type === 'if') {
      return i;
    }
  }
  return children.length - 1;
}

function expressionFromSlice(
  children: SyntaxNode[],
  start: number,
  endExclusive: number,
  source: string,
  errors: TranslationError[],
  label: string,
): string {
  if (start >= endExclusive || start < 0 || endExclusive > children.length) {
    return makeComprehensionFragment('_', label);
  }

  const slice = children.slice(start, endExclusive);
  const semantic = slice.filter((child) => {
    const type = child.type.name;
    return !isTokenNode(type) && !isKeywordNode(type) && !isIgnorableLeaf(type);
  });

  if (semantic.length === 1) {
    return exprToBlock(semantic[0]!, source, errors);
  }

  const raw = source.slice(slice[0]!.from, slice[slice.length - 1]!.to).trim();
  return makeComprehensionFragment(raw, label);
}

function comprehensionToStructuredBlock(
  node: SyntaxNode,
  source: string,
  errors: TranslationError[],
): string {
  const children = allChildren(node);
  const firstFor = children.findIndex((c) => c.type.name === 'for');
  if (firstFor === -1) {
    return makeBlock(
      PYTHON_BLOCK_TYPES.COMPREHENSION,
      { KIND: comprehensionKind(node.type.name), CODE: nodeText(node, source) },
      {},
      {},
    );
  }

  const expressionStart = isTokenNode(children[0]?.type.name ?? '') ? 1 : 0;
  const eltXml = expressionFromSlice(
    children,
    expressionStart,
    firstFor,
    source,
    errors,
    'ComprehensionElt',
  );

  const clauseXml: string[] = [];
  let i = firstFor;
  while (i < children.length) {
    const type = children[i]!.type.name;
    if (type === 'for') {
      const inIdx = children.findIndex((c, idx) => idx > i && c.type.name === 'in');
      if (inIdx <= i) break;
      const nextBoundary = nextClauseBoundary(children, inIdx + 1);
      const targetXml = expressionFromSlice(
        children,
        i + 1,
        inIdx,
        source,
        errors,
        'ComprehensionTarget',
      );
      const iterXml = expressionFromSlice(
        children,
        inIdx + 1,
        nextBoundary,
        source,
        errors,
        'ComprehensionIter',
      );
      clauseXml.push(
        makeBlock(
          PYTHON_BLOCK_TYPES.COMPREHENSION_FOR,
          {},
          { TARGET: targetXml, ITER: iterXml },
          {},
        ),
      );
      i = nextBoundary;
      continue;
    }

    if (type === 'if') {
      const nextBoundary = nextClauseBoundary(children, i + 1);
      const testXml = expressionFromSlice(
        children,
        i + 1,
        nextBoundary,
        source,
        errors,
        'ComprehensionTest',
      );
      clauseXml.push(makeBlock(PYTHON_BLOCK_TYPES.COMPREHENSION_IF, {}, { TEST: testXml }, {}));
      i = nextBoundary;
      continue;
    }
    i++;
  }

  const values: Record<string, string> = { ELT: eltXml };
  clauseXml.forEach((xml, index) => {
    values[`GENERATOR${index}`] = xml;
  });

  return makeBlock(
    PYTHON_BLOCK_TYPES.COMPREHENSION,
    { KIND: comprehensionKind(node.type.name), CODE: nodeText(node, source) },
    values,
    {},
    { items: String(Math.max(1, clauseXml.length)) },
  );
}

function extractCallArguments(
  argListNode: SyntaxNode,
  source: string,
  errors: TranslationError[],
): string[] {
  const args = meaningfulChildren(argListNode);
  return args.map((arg) => exprToBlock(arg, source, errors));
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
      return makeBlock(
        PYTHON_BLOCK_TYPES.BOOLEAN,
        { VALUE: val === 'True' ? 'True' : 'False' },
        {},
        {},
      );
    }
    case 'None':
      return makeBlock(PYTHON_BLOCK_TYPES.NONE, {}, {}, {});
    case 'VariableName':
      return makeBlock(PYTHON_BLOCK_TYPES.VARIABLE, { NAME: nodeText(node, source) }, {}, {});
    case 'BinaryExpression': {
      const children = allChildren(node);
      if (children.length < 3) {
        return makeCstExprBlock(node, source);
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
      return makeCstExprBlock(node, source);
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
      return makeCstExprBlock(node, source);
    }
    case 'CallExpression': {
      const children = allChildren(node);
      if (children.length < 1) {
        return makeCstExprBlock(node, source);
      }
      const funcNode = children[0]!;
      const funcName = nodeText(funcNode, source);
      const argListNode = childByType(node, 'ArgList');
      let argBlocks: string[] = [];
      if (argListNode) {
        argBlocks = extractCallArguments(argListNode, source, errors);
      }
      if (funcName === 'print') {
        return makeBlock(
          PYTHON_BLOCK_TYPES.PRINT,
          {},
          argBlocks[0] ? { VALUE: argBlocks[0] } : {},
          {},
        );
      }
      const values: Record<string, string> = {};
      argBlocks.forEach((arg, index) => {
        values[`ARG${index}`] = arg;
      });
      return makeBlock(
        PYTHON_BLOCK_TYPES.FUNC_CALL,
        { NAME: funcName },
        values,
        {},
        { argc: String(argBlocks.length) },
      );
    }
    case 'ArrayExpression': {
      const items = meaningfulChildren(node);
      const values: Record<string, string> = {};
      items.forEach((item, index) => {
        values[`ADD${index}`] = exprToBlock(item, source, errors);
      });
      return makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, values, {}, { argc: String(items.length) });
    }
    case 'TupleExpression': {
      const items = meaningfulChildren(node);
      const values: Record<string, string> = {};
      items.forEach((item, index) => {
        values[`ADD${index}`] = exprToBlock(item, source, errors);
      });
      return makeBlock(PYTHON_BLOCK_TYPES.TUPLE, {}, values, {}, { argc: String(items.length) });
    }
    case 'DictionaryExpression': {
      // Preserve dictionary code as text until key/value pair blocks are introduced.
      return makeBlock(PYTHON_BLOCK_TYPES.DICT, { CODE: nodeText(node, source) }, {}, {});
    }
    case 'MemberExpression': {
      const parts = meaningfulChildren(node);
      if (parts.length >= 2) {
        const leftXml = exprToBlock(parts[0]!, source, errors);
        const rightPart = parts[1]!;
        if (rightPart.type.name === 'PropertyName') {
          return makeBlock(
            PYTHON_BLOCK_TYPES.ATTR,
            { ATTR: nodeText(rightPart, source) },
            { OBJ: leftXml },
            {},
          );
        }
        return makeBlock(
          PYTHON_BLOCK_TYPES.INDEX,
          {},
          { VALUE: leftXml, INDEX: exprToBlock(rightPart, source, errors) },
          {},
        );
      }
      return makeCstExprBlock(node, source);
    }
    case 'ArrayComprehensionExpression':
    case 'SetComprehensionExpression':
    case 'DictionaryComprehensionExpression':
    case 'ComprehensionExpression':
      return comprehensionToStructuredBlock(node, source, errors);
    case 'LambdaExpression':
    case 'AwaitExpression':
    case 'ConditionalExpression':
      return makeCstExprBlock(node, source);
    case 'ParenthesizedExpression': {
      // Unwrap the inner expression
      const inner = meaningfulChildren(node)[0];
      if (inner) return exprToBlock(inner, source, errors);
      return makeCstExprBlock(node, source);
    }
    default: {
      return makeCstExprBlock(node, source);
    }
  }
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
  const type = node.type.name;

  switch (type) {
    case 'AssignStatement': {
      const children = allChildren(node);
      // VariableName, AssignOp, rhs
      const assignOpIdx = children.findIndex((c) => c.type.name === 'AssignOp');
      if (assignOpIdx < 1) {
        return makeCstStmtBlock(node, source);
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
      const exprXml = exprToBlock(exprNode, source, errors);
      if (exprXml.includes(`type="${PYTHON_BLOCK_TYPES.PRINT}"`)) {
        return exprXml;
      }
      return makeBlock(PYTHON_BLOCK_TYPES.EXPR_STMT, {}, { VALUE: exprXml }, {});
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
      const bodyNodes = childrenByType(node, 'Body');
      const hasElseToken = children.some((c) => c.type.name === 'else');
      const bodyNode = bodyNodes[0] ?? null;
      const elseBodyNode =
        hasElseToken && bodyNodes.length > 1 ? bodyNodes[bodyNodes.length - 1] : null;
      const condXml = condNode
        ? exprToBlock(condNode, source, errors)
        : makeBlock(PYTHON_BLOCK_TYPES.BOOLEAN, { VALUE: 'True' }, {}, {});
      const bodyXml = bodyNode ? statementsInBody(bodyNode, source, errors) : '';
      if (elseBodyNode) {
        const elseXml = statementsInBody(elseBodyNode, source, errors);
        return makeBlock(
          PYTHON_BLOCK_TYPES.WHILE_ELSE,
          {},
          { CONDITION: condXml },
          { BODY: bodyXml, ...(elseXml ? { ELSE: elseXml } : {}) },
        );
      }
      return makeBlock(PYTHON_BLOCK_TYPES.WHILE, {}, { CONDITION: condXml }, { BODY: bodyXml });
    }
    case 'ForStatement': {
      // for <VariableName> in <iter> <Body>
      const children = allChildren(node);
      const inIdx = children.findIndex((c) => c.type.name === 'in');
      if (inIdx < 1) {
        return makeCstStmtBlock(node, source);
      }
      const varNode = children[inIdx - 1]!;
      const bodyNodes = childrenByType(node, 'Body');
      const hasElseToken = children.some((c) => c.type.name === 'else');
      const bodyNode = bodyNodes[0] ?? null;
      const elseBodyNode =
        hasElseToken && bodyNodes.length > 1 ? bodyNodes[bodyNodes.length - 1] : null;
      // iter is between 'in' and 'Body'
      const bodyIdx = children.findIndex((c) => c.type.name === 'Body');
      const iterNode = bodyIdx > inIdx + 1 ? children[inIdx + 1] : null;
      const varName = nodeText(varNode, source);
      const iterXml = iterNode
        ? exprToBlock(iterNode, source, errors)
        : makeBlock(PYTHON_BLOCK_TYPES.LIST, {}, {}, {});
      const bodyXml = bodyNode ? statementsInBody(bodyNode, source, errors) : '';
      if (elseBodyNode) {
        const elseXml = statementsInBody(elseBodyNode, source, errors);
        return makeBlock(
          PYTHON_BLOCK_TYPES.FOR_ELSE,
          { VAR: varName },
          { ITER: iterXml },
          { BODY: bodyXml, ...(elseXml ? { ELSE: elseXml } : {}) },
        );
      }
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
    case 'DecoratedStatement': {
      const decorators = childrenByType(node, 'Decorator')
        .map((decorator) => nodeText(decorator, source).trim())
        .join(', ');
      const target = meaningfulChildren(node).find((child) => child.type.name !== 'Decorator');
      const targetCode = target ? nodeText(target, source) : '';
      return makeBlock(
        PYTHON_BLOCK_TYPES.DECORATED,
        { DECORATORS: decorators || '@decorator', TARGET: targetCode || nodeText(node, source) },
        {},
        {},
      );
    }
    case 'ReturnStatement': {
      // return <expr>
      const children = allChildren(node);
      // First child is 'return' keyword
      const exprNode = children.length > 1 ? children[1] : null;
      const valueXml = exprNode ? exprToBlock(exprNode, source, errors) : '';
      return makeBlock(PYTHON_BLOCK_TYPES.RETURN, {}, valueXml ? { VALUE: valueXml } : {}, {});
    }
    case 'YieldStatement': {
      const children = meaningfulChildren(node);
      const valueXml = children[0] ? exprToBlock(children[0], source, errors) : '';
      return makeBlock(PYTHON_BLOCK_TYPES.EXPR_STMT, {}, valueXml ? { VALUE: valueXml } : {}, {});
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
      return makeCstStmtBlock(node, source);
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
