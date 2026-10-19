/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import { IterMode } from '@lezer/common';

import type {
  SyntaxNode,
  SyntaxNodeRef,
  Tree,
  TreeCursor
} from '@lezer/common';

/* PLUGIN */
import { getQuotedLiteralRanges } from 'src/BaseYamlLanguage/quotedLiteralRanges';
import type { DocumentRange } from 'src/BaseYamlLanguage/quotedLiteralRanges';
import { getYamlKeyPath } from 'src/BaseYamlLanguage/yamlKeyPath';
import type { ReadDocumentText } from 'src/BaseYamlLanguage/yamlKeyPath';

/* ============================================================ */

const FORMULAS_KEY: string = 'formulas';

/**
 * Gets the formulas defined under top-level `formulas` key of a Base YAML document.
 *
 * @param tree - Syntax tree of the Base YAML document.
 * @param readDocumentText - Function that reads the document text between two positions.
 * @returns The name of each formula and the corresponding formula text, with quotes and quote escapes removed.
 */
export function getFormulasFromBaseYaml(tree: Tree, readDocumentText: ReadDocumentText): Record<string, string> {
  const formulas: Record<string, string> = {};

  // Formula trees mounted inside values are skipped: only the YAML structure is read
  tree.iterate({
    mode: IterMode.IgnoreMounts,
    enter: (nodeRef: SyntaxNodeRef): boolean => {
      if (nodeRef.name !== 'Pair') {
        return true;
      }

      const keyPath: string[] | null = getYamlKeyPath(nodeRef.node, readDocumentText);
      if (keyPath == null || keyPath[0] !== FORMULAS_KEY) {
        return false;
      }

      // The `formulas` pair itself: look inside it
      if (keyPath.length === 1) {
        return true;
      }

      const name: string | undefined = keyPath[1];
      const formulaText: string | null = getPairValueText(nodeRef.node, readDocumentText);

      if (keyPath.length === 2 && name != null && formulaText != null && formulaText.trim() !== '') {
        formulas[name] = formulaText;
      }
      return false;
    }
  });

  return formulas;
}

/**
 * Gets the text of a `Pair` node's value, with quotes and quote escapes removed.
 *
 * @param pair - A `Pair` node.
 * @param readDocumentText - Reads text from the document.
 * @returns The value's text, or `null` if the pair has no value or its value is not a single literal.
 */
function getPairValueText(pair: SyntaxNode, readDocumentText: ReadDocumentText): string | null {
  const cursor: TreeCursor = pair.cursor(IterMode.IgnoreMounts);

  if (cursor.firstChild() === false) {
    return null;
  }

  // The value is the node after the `:`
  let isAfterColon: boolean = false;
  do {
    if (isAfterColon === true) {
      return getLiteralText(cursor.node, readDocumentText);
    }
    isAfterColon = cursor.name === ':';
  } while (cursor.nextSibling());

  return null;
}

/**
 * Gets the text of a plain, quoted or block literal.
 *
 * @param node - The literal's node.
 * @param readDocumentText - Reads text from the document.
 * @returns The text, decoded if it's quoted, or `null` if the node isn't a literal.
 */
function getLiteralText(node: SyntaxNode, readDocumentText: ReadDocumentText): string | null {
  switch (node.name) {
    case 'Literal': {
      return readDocumentText(node.from, node.to);
    }
    case 'QuotedLiteral': {
      const quote: string = readDocumentText(node.from, node.from + 1);
      const contentStart: number = node.from + 1;
      const contentEnd: number = Math.max(contentStart, node.to - 1);
      const contentRanges: DocumentRange[] = getQuotedLiteralRanges(readDocumentText(contentStart, contentEnd), contentStart, quote);

      return contentRanges.map((range: DocumentRange): string => readDocumentText(range.from, range.to)).join('');
    }
    case 'BlockLiteral': {
      const contentNode: SyntaxNode | null = getChildIgnoringMounts(node, 'BlockLiteralContent');
      return contentNode == null ? '' : readDocumentText(contentNode.from, contentNode.to);
    }
    default: {
      return null;
    }
  }
}

/**
 * Gets a node's first child with a given name, without entering mounted trees.
 *
 * @remarks
 * `SyntaxNode.getChild()` can't be used: it enters mounted trees, and a mounted formula tree replaces the node it's mounted on.
 *
 * @param node - Parent node.
 * @param name - Name of the child to find.
 * @returns The child, or `null` if there's none.
 */
function getChildIgnoringMounts(node: SyntaxNode, name: string): SyntaxNode | null {
  const cursor: TreeCursor = node.cursor(IterMode.IgnoreMounts);

  if (cursor.firstChild() === false) {
    return null;
  }

  do {
    if (cursor.name === name) {
      return cursor.node;
    }
  } while (cursor.nextSibling());

  return null;
}
