/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  SyntaxNode,
  Tree
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
  const isSummaryDefinition: boolean = isSummaryFormulaPath(keyPath);

  if (isFormulaDefinition === true || isSummaryDefinition === true) {
    return true;
  }

  if (isFilterPath(keyPath) === true) {
    return true;
  }

  return false;
}

/**
 * Returns whether the value at a YAML key path is a filter group: the list of filters under `and`, `or` or `not`.
 *
 * @remarks
 * {@link isFormulaPath} accepts these paths, as it accepts everything in a filter, but their value must be a list.
 *
 * @param keyPath - Key path, from {@link getYamlKeyPath}.
 * @returns `true` if the value is a filter group.
 */
export function isFilterGroupPath(keyPath: string[]): boolean {
  const lastKey: string | undefined = keyPath.at(-1);
  const isGroupKey: boolean = lastKey === 'and' || lastKey === 'or' || lastKey === 'not';

  return isGroupKey === true && isFilterPath(keyPath) === true;
}

/**
 * Returns whether the value at a YAML key path is a filter that can be written as a mapping:
 * the value of a `filters` key, or an item in a filter group.
 *
 * @remarks
 * Such a filter is a formula, or a mapping with one key: `and`, `or` or `not`.
 * A list straight under `filters` isn't a filter group, and Obsidian doesn't accept it, so its items don't count.
 *
 * @param keyPath - Key path, from {@link getYamlKeyPath}.
 * @returns `true` if the value is a filter that can be a mapping.
 */
export function isFilterMappingPath(keyPath: string[]): boolean {
  const isFiltersValue: boolean = keyPath.at(-1) === 'filters';
  const isGroupItem: boolean = keyPath.at(-1) === '#' && isFilterGroupPath(keyPath.slice(0, -1)) === true;

  return (isFiltersValue === true || isGroupItem === true) && isFilterPath(keyPath) === true;
}

/**
 * Returns whether the value at a YAML key path is the value of a `filters` key itself:
 * the top-level `filters`, or a view's `filters`, not a filter inside a group.
 *
 * @remarks
 * Obsidian reads a single formula there, but its own interface always writes a group: `and` with a list.
 *
 * @param keyPath - Key path, from {@link getYamlKeyPath}.
 * @returns `true` if the value is a `filters` key's own value.
 */
export function isFiltersValuePath(keyPath: string[]): boolean {
  return keyPath.at(-1) === 'filters' && isFilterPath(keyPath) === true;
}

/**
 * Returns whether the value at a YAML key path is a summary formula: the value of a key under the top-level `summaries`.
 *
 * @remarks
 * A view's `summaries` holds summary names, not formulas.
 *
 * @param keyPath - Key path, from {@link getYamlKeyPath}.
 * @returns `true` if the value is a summary formula.
 */
export function isSummaryFormulaPath(keyPath: string[]): boolean {
  return keyPath[0] === 'summaries' && keyPath.length === 2;
}

/**
 * Returns whether a document position is in a summary formula, or at its end.
 * An empty summary value, such as `Mean: ` with nothing typed, counts too.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position.
 * @param readDocumentText - Reads text from the document, for key names.
 * @returns `true` if `pos` is in a summary formula.
 */
export function isInSummaryFormula(tree: Tree, pos: number, readDocumentText: ReadDocumentText): boolean {
  const keyPath: string[] | null =
    getEmptyValueKeyPath(tree, pos, readDocumentText) ??
    getYamlKeyPath(tree.resolve(pos, -1), readDocumentText);

  if (keyPath == null) {
    return false;
  }
  return isSummaryFormulaPath(keyPath);
}

/**
 * Returns whether a key path is in a filter: under the top-level `filters`, or under a view's `filters`.
 *
 * @param keyPath - Key path, from {@link getYamlKeyPath}.
 * @returns `true` if the key path is in a filter.
 */
function isFilterPath(keyPath: string[]): boolean {
  const isGlobalFilter: boolean = keyPath[0] === 'filters';
  const isViewFilter: boolean = (keyPath[0] === 'views') && (keyPath[1] === '#') && (keyPath[2] === 'filters');

  return isGlobalFilter === true || isViewFilter === true;
}

/* ========================= EMPTY VALUES ========================= */

/** Characters YAML allows between a key's `:` or a list item's `-` and the value. */
const INLINE_SPACES: string[] = [' ', '\t'];

/**
 * Gets the key path of the empty YAML value at a position, such as the value of `Title: ` with nothing typed.
 *
 * @remarks
 * Four kinds of value count as empty, each where text typed at `pos` would become the value:
 * - after a key's `:` and at least one space, with nothing after it on the line but spaces or a comment: `Title: `
 * - after a list item's `-` and at least one space, with nothing after it: `- `
 * - between the quotes of an empty quoted string: `Title: ""`
 * - on an indented line of a block scalar that holds only spaces: `Title: |`, then an indented empty line
 *
 * Without a space after the `:` or `-`, YAML would read text typed there as part of the key or the dash.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position, such as the cursor.
 * @param readDocumentText - Reads text from the document.
 * @returns The key path, with `#` for a list item, or `null` if `pos` isn't in an empty value.
 */
export function getEmptyValueKeyPath(tree: Tree, pos: number, readDocumentText: ReadDocumentText): string[] | null {
  for (
    let node: SyntaxNode | null = tree.resolve(pos, -1);
    node != null;
    node = node.parent
  ) {
    if (node.name === 'QuotedLiteral') {
      if (isEmptyQuotedLiteral(node, pos) === false) {
        return null;
      }
      return getYamlKeyPath(node, readDocumentText);
    }
    if (node.name === 'BlockLiteral') {
      if (isEmptyBlockLiteral(node, pos, readDocumentText) === false) {
        return null;
      }
      return getYamlKeyPath(node, readDocumentText);
    }
  }

  return getMissingValueKeyPath(tree, pos, readDocumentText);
}

/**
 * Returns whether a quoted YAML string is empty, with the position between its quotes.
 *
 * @param quotedLiteral - The quoted string's node.
 * @param pos - Document position.
 * @returns `true` if the string is `""` or `''` and `pos` is between the quotes.
 */
function isEmptyQuotedLiteral(quotedLiteral: SyntaxNode, pos: number): boolean {
  const isEmpty: boolean = quotedLiteral.to - quotedLiteral.from === 2;
  return isEmpty === true && pos === quotedLiteral.from + 1;
}

/**
 * Returns whether a block scalar's content holds only spaces and line breaks, with the position inside it.
 *
 * @remarks
 * The content starts on the line after the `|`. On a line indented no further than the key,
 * the content is empty and starts at the beginning of the line, because text typed there wouldn't be part of the block.
 *
 * @param blockLiteral - The block scalar's node.
 * @param pos - Document position.
 * @param readDocumentText - Reads text from the document.
 * @returns `true` if the content holds only spaces and line breaks, and `pos` is inside it.
 */
function isEmptyBlockLiteral(blockLiteral: SyntaxNode, pos: number, readDocumentText: ReadDocumentText): boolean {
  // The content's node, or the formula tree parsed in its place
  const content: SyntaxNode | null = blockLiteral.getChild('BlockLiteralHeader')?.nextSibling ?? null;
  if (content == null) {
    return false;
  }

  const isInContent: boolean = pos > content.from && pos <= content.to;
  const isBlank: boolean = readDocumentText(content.from, content.to).trim() === '';
  return isInContent === true && isBlank === true;
}

/**
 * Gets the key path of a key or list item that has no value yet, when the position is after its `:` or `-` and at least one space.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position.
 * @param readDocumentText - Reads text from the document.
 * @returns The key path, with `#` for a list item, or `null` if there's no such key or list item before `pos`.
 */
function getMissingValueKeyPath(tree: Tree, pos: number, readDocumentText: ReadDocumentText): string[] | null {
  const node: SyntaxNode | null = getNodeBeforeSpaces(tree, pos, readDocumentText);
  if (node == null) {
    return null;
  }

  // A key's `:`, with no value after it in the pair. A comment after it isn't part of the pair.
  if (node.name === ':' && node.parent?.name === 'Pair') {
    if (node.nextSibling != null) {
      return null;
    }
    return getYamlKeyPath(node, readDocumentText);
  }

  // A list item's `-`, with an empty item after it
  if (node.name === '-' && node.parent?.name === 'BlockSequence') {
    const item: SyntaxNode | null = node.nextSibling;
    if (item?.name !== 'Item' || item.firstChild != null) {
      return null;
    }
    return getYamlKeyPath(item, readDocumentText);
  }

  return null;
}

/**
 * Gets the syntax node just before the spaces before a position, on the same line,
 * such as the `:` of a key with nothing typed after it yet: `Title: `.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position.
 * @param readDocumentText - Reads text from the document.
 * @returns The node that ends where the spaces start, or `null` if there's no space just before `pos`.
 */
export function getNodeBeforeSpaces(tree: Tree, pos: number, readDocumentText: ReadDocumentText): SyntaxNode | null {
  let spacesStart: number = pos;
  while (spacesStart > 0 && INLINE_SPACES.includes(readDocumentText(spacesStart - 1, spacesStart))) {
    spacesStart -= 1;
  }

  if (spacesStart === pos) {
    return null;
  }
  return tree.resolve(spacesStart, -1);
}

/* ========================= TYPES ========================= */

/**
 * Reads the document's text between two positions. Same shape as {@link Input.read}.
 */
export type ReadDocumentText = (from: number, to: number) => string;
