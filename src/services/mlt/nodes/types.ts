import type { SyntaxNode } from '@lezer/common';
import type { TranslationError } from '../../../types';

export interface AstNodeModule {
  blockType: string;
  expressionNodeTypes?: string[];
  statementNodeTypes?: string[];
  expressionToBlock?: (node: SyntaxNode, source: string, errors: TranslationError[]) => string;
  statementToBlock?: (node: SyntaxNode, source: string, errors: TranslationError[]) => string;
}
