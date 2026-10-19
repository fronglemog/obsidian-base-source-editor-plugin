/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  SyntaxNode
} from '@lezer/common';

/* ========================= YAML KEY PATH ========================= */

/**
 * Gets the path of YAML keys leading to a node, with `#` for each list item.
 * For example, a filter inside a view has the path `['views', '#', 'filters', 'and', '#']`.
 *
 * @param node - Syntax node.
 * @param readDocumentText - Reads text from the document, for key names.
 * @returns The key path, or `null` if the node is inside a key.
 */
export function getYamlKeyPath(node: SyntaxNode, readDocumentText: ReadDocumentText): string[] | null {
  const keyPath: string[] = [];

  for (
    let currentNode: SyntaxNode | null = node;
    currentNode != null;
    currentNode = currentNode.parent
  ) {
    if (currentNode.name === 'Key') {
      return null;
    }
    if (currentNode.name === 'Item') {
      keyPath.unshift('#');
    }
    else if (currentNode.name === 'Pair') {
      const keyNode: SyntaxNode | null = currentNode.getChild('Key');
      let keyText: string = '';

      if (keyNode != null) {
        keyText = readDocumentText(keyNode.from, keyNode.to);
      }

      const keyName: string = keyText.replace(/^(['"])(.*)\1$/s, '$2');
      keyPath.unshift(keyName);
    }
  }
  return keyPath;
}

/**
 * Returns whether the value at a YAML key path is a formula.
 *
 * @param keyPath - Key path, from {@link getYamlKeyPath}.
 * @returns `true` if the value should be parsed as a formula.
 */
export function isFormulaPath(keyPath: string[]): boolean {
  const rootKey: string | undefined = keyPath[0];

  const isFormulaDefinition: boolean = rootKey === 'formulas' && keyPath.length === 2;

  const isSummaryDefinition: boolean = rootKey === 'summaries' && keyPath.length === 2;

  if (isFormulaDefinition === true || isSummaryDefinition === true) {
    return true;
  }

  if (rootKey === 'filters') {
    return true;
  }

  const isViewFilter: boolean = (rootKey === 'views') && (keyPath[1] === '#') && (keyPath[2] === 'filters');
  if (isViewFilter === true) {
    return true;
  }

  return false;
}

/* ========================= TYPES ========================= */

/**
 * Reads the document's text between two positions. Same shape as {@link Input.read}.
 */
export type ReadDocumentText = (from: number, to: number) => string;
