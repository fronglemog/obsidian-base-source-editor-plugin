/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  Line,
  Text
} from '@codemirror/state';

import type {
  SyntaxNode,
  Tree
} from '@lezer/common';

/* PLUGIN */
import {
  getNodeBeforeSpaces,
  getYamlKeyPath
} from 'src/BaseYamlLanguage/yamlKeyPath';

import type { ReadDocumentText } from 'src/BaseYamlLanguage/yamlKeyPath';

/* ========================= KEY POSITION ========================= */

/** A line that can hold a key being typed: indentation, an optional list dash, the key, and the rest of the line. */
const KEY_LINE: RegExp = /^( *)(- +)?([A-Za-z]*)(.*)$/;

/**
 * A line that can hold a property id being typed as a key: indentation, then the property id so far, with no `:` yet.
 * Unlike a schema key, a property id can hold spaces, dots and dashes.
 */
const PROPERTY_KEY_LINE: RegExp = /^( *)((?:[^\s#:'"[\]{}-][^#:]*)?)$/;

/** A list item's line: indentation, the `-` and the spaces after it, then the item's plain text so far. */
const LIST_ITEM_LINE: RegExp = /^( *)(- +)((?:[^\s#:'"[\]{}][^#:]*)?)$/;

/** Quotes around a quoted key or value. */
const QUOTES: RegExp = /^(['"])(.*)\1$/s;

/**
 * Gets the key position at a document position: where a key of a YAML mapping is being typed, or could be.
 *
 * @remarks
 * Three kinds of line count, each with the position in its key:
 * - a line holding only a key being typed, or nothing: `    ro`
 * - the first key of a new list item: `  - ty`
 * - the name of an existing key, which is renamed: `name: All`
 *
 * While a key is typed, the YAML tree doesn't always show it as a key. After a list item's `-`, it's the item's value;
 * on the line under a key with nothing after its `:`, it's that key's value, continued onto the next line.
 * So the mapping is found from the line's indentation instead: the line belongs to the mapping whose keys
 * start in the same column, or starts the value of a key above it that has nothing after its `:`.
 *
 * @param tree - Syntax tree of the document.
 * @param doc - The document.
 * @param pos - Document position, such as the cursor.
 * @returns The key position, or `null` if `pos` isn't in a key position.
 */
export function getKeyPosition(tree: Tree, doc: Text, pos: number): KeyPosition | null {
  const line: Line = doc.lineAt(pos);
  const [, indent = '', dash = '', key = '', rest = ''] = KEY_LINE.exec(line.text) ?? [];

  const from: number = line.from + indent.length + dash.length;
  const to: number = from + key.length;
  if (pos < from || pos > to) {
    return null;
  }

  const readDocumentText: ReadDocumentText = (textFrom: number, textTo: number): string => doc.sliceString(textFrom, textTo);

  // An existing key, followed by its `:`
  if (rest.startsWith(':') === true && key !== '') {
    const pair: SyntaxNode | null = getPairWithKeyAt(tree, from);
    if (pair?.parent == null) {
      return null;
    }
    return describeMapping(pair.parent, getYamlKeyPath(pair.parent, readDocumentText), { from, to, isRename: true }, readDocumentText);
  }

  if (rest.trim() !== '') {
    return null;
  }

  if (dash !== '') {
    return getNewItemKeyPosition(tree, line.from + indent.length, { from, to, isRename: false }, readDocumentText);
  }

  return getNewKeyPosition(tree, doc, line, { from, to, isRename: false }, readDocumentText);
}

/**
 * Gets the key position at a document position where a property id is being typed as a key, or could be:
 * a line holding only the property id so far, or nothing, with no `:` yet.
 *
 * @remarks
 * The keys under `properties`, and in a view's `summaries` and `columnSize`, are property ids, such as `film - year`.
 * The mapping is found from the line's indentation, as for {@link getKeyPosition}.
 *
 * @param tree - Syntax tree of the document.
 * @param doc - The document.
 * @param pos - Document position, such as the cursor.
 * @returns The key position, from the start of the property id to the end of the line, or `null` if `pos` isn't in one.
 */
export function getPropertyKeyPosition(tree: Tree, doc: Text, pos: number): KeyPosition | null {
  const line: Line = doc.lineAt(pos);
  const match: RegExpExecArray | null = PROPERTY_KEY_LINE.exec(line.text);
  if (match == null) {
    return null;
  }

  const [, indent = ''] = match;
  const from: number = line.from + indent.length;
  if (pos < from) {
    return null;
  }

  const readDocumentText: ReadDocumentText = (textFrom: number, textTo: number): string => doc.sliceString(textFrom, textTo);
  return getNewKeyPosition(tree, doc, line, { from, to: line.to, isRename: false }, readDocumentText);
}

/**
 * Gets the key position for the first key of a new list item.
 *
 * @param tree - Syntax tree of the document.
 * @param dashPos - Position of the item's `-`.
 * @param range - The key's range, and whether it's renamed.
 * @param readDocumentText - Reads text from the document.
 * @returns The key position in the item's mapping, or `null` if the `-` isn't a list item's.
 */
function getNewItemKeyPosition(tree: Tree, dashPos: number, range: KeyRange, readDocumentText: ReadDocumentText): KeyPosition | null {
  const dashNode: SyntaxNode = tree.resolve(dashPos + 1, -1);
  const item: SyntaxNode | null = dashNode.nextSibling;

  if (dashNode.name !== '-' || item?.name !== 'Item') {
    return null;
  }

  const itemKeyPath: string[] | null = getYamlKeyPath(item, readDocumentText);
  if (itemKeyPath == null) {
    return null;
  }
  return describeMapping(item.getChild('BlockMapping'), itemKeyPath, range, readDocumentText);
}

/**
 * Gets the key position for a key typed on its own line, found from the line's indentation.
 *
 * @param tree - Syntax tree of the document.
 * @param doc - The document.
 * @param line - The line of the key.
 * @param range - The key's range, and whether it's renamed.
 * @param readDocumentText - Reads text from the document.
 * @returns The key position, or `null` if the line's indentation fits no mapping.
 */
function getNewKeyPosition(tree: Tree, doc: Text, line: Line, range: KeyRange, readDocumentText: ReadDocumentText): KeyPosition | null {
  const keyColumn: number = range.from - line.from;
  const lineAbove: Line | null = getContentLineAbove(doc, line);

  if (lineAbove != null) {
    const contentEnd: number = lineAbove.from + lineAbove.text.trimEnd().length;

    for (
      let node: SyntaxNode | null = tree.resolve(contentEnd, -1);
      node != null;
      node = node.parent
    ) {
      if (node.name !== 'Pair' && node.name !== 'BlockMapping' && node.name !== 'BlockSequence') {
        continue;
      }

      const start: number = node.name === 'BlockMapping' ? getMappingStart(node) : node.from;
      const column: number = start - doc.lineAt(start).from;
      if (column > keyColumn) {
        continue;
      }

      if (column === keyColumn) {
        // A key in the same column as this mapping's keys belongs to it. In a list, it would need a `-`.
        const mapping: SyntaxNode | null = node.name === 'Pair' ? node.parent : node;
        if (mapping?.name !== 'BlockMapping') {
          return null;
        }
        return describeMapping(mapping, getYamlKeyPath(mapping, readDocumentText), range, readDocumentText);
      }

      // Further in than this node: only a key whose value starts on a later line can hold the line
      if (node.name !== 'Pair') {
        return null;
      }
      return getValueKeyPosition(node, doc, line, range, readDocumentText);
    }
  }

  if (keyColumn !== 0) {
    return null;
  }

  // The top-level mapping, or an empty document
  const topMapping: SyntaxNode | null = tree.topNode.getChild('Document')?.getChild('BlockMapping') ?? null;
  return describeMapping(topMapping, [], range, readDocumentText);
}

/**
 * Gets the key position for a key on a line under a key with nothing after its `:`, which starts that key's value.
 *
 * @param pair - The pair of the key above.
 * @param doc - The document.
 * @param line - The line of the key.
 * @param range - The key's range, and whether it's renamed.
 * @param readDocumentText - Reads text from the document.
 * @returns The key position in the pair's value, or `null` if the pair has a value on its own line.
 */
function getValueKeyPosition(pair: SyntaxNode, doc: Text, line: Line, range: KeyRange, readDocumentText: ReadDocumentText): KeyPosition | null {
  const pairKeyPath: string[] | null = getYamlKeyPath(pair, readDocumentText);
  if (pairKeyPath == null) {
    return null;
  }

  const value: SyntaxNode | null = getPairValue(pair);
  if (value == null) {
    return describeMapping(null, pairKeyPath, range, readDocumentText);
  }

  const keyColumn: number = range.from - line.from;
  const valueStart: number = value.name === 'BlockMapping' ? getMappingStart(value) : value.from;
  const valueLine: Line = doc.lineAt(valueStart);
  const isOnLaterLine: boolean = valueLine.number > doc.lineAt(pair.from).number;

  if (value.name === 'BlockMapping') {
    if (isOnLaterLine === false || valueStart - valueLine.from !== keyColumn) {
      return null;
    }
    return describeMapping(value, pairKeyPath, range, readDocumentText);
  }

  // The key being typed, read as the start of the pair's value: a plain value, or a formula parsed from one
  const isOwnLine: boolean = valueLine.number === line.number;
  if (isOnLaterLine === false || isOwnLine === false || value.name === 'BlockLiteral' || value.name === 'QuotedLiteral') {
    return null;
  }
  return describeMapping(null, pairKeyPath, range, readDocumentText);
}

/**
 * Describes a key position in a mapping: its key path, the keys already there, and its `type` value.
 *
 * @param mapping - The mapping's node, or `null` for a mapping with no keys yet.
 * @param mappingKeyPath - The mapping's key path, or `null` if it can't be read.
 * @param range - The key's range, and whether it's renamed.
 * @param readDocumentText - Reads text from the document.
 * @returns The key position, or `null` if `mappingKeyPath` is `null`.
 */
function describeMapping(mapping: SyntaxNode | null, mappingKeyPath: string[] | null, range: KeyRange, readDocumentText: ReadDocumentText): KeyPosition | null {
  if (mappingKeyPath == null) {
    return null;
  }

  const existingKeys: string[] = [];
  const pairs: SyntaxNode[] = mapping?.getChildren('Pair') ?? [];

  for (const pair of pairs) {
    const keyNode: SyntaxNode | null = pair.getChild('Key');

    // The key at the position isn't one of the keys already there
    if (keyNode == null || keyNode.from === range.from) {
      continue;
    }
    existingKeys.push(unquote(readDocumentText(keyNode.from, keyNode.to)));
  }

  return {
    mappingKeyPath,
    from: range.from,
    to: range.to,
    isRename: range.isRename,
    existingKeys,
    typeValue: getMappingValue(mapping, 'type', readDocumentText)
  };
}

/**
 * Gets the value of a key in a mapping, such as a view's `type` or a sort item's `property`.
 *
 * @param mapping - The mapping's node, or `null` for a mapping with no keys yet.
 * @param key - The key.
 * @param readDocumentText - Reads text from the document.
 * @returns The value without quotes, or `null` if the mapping has no such key with a value.
 */
function getMappingValue(mapping: SyntaxNode | null, key: string, readDocumentText: ReadDocumentText): string | null {
  const value: SyntaxNode | null = getMappingValueNode(mapping, key, readDocumentText);
  return value == null ? null : unquote(readDocumentText(value.from, value.to));
}

/**
 * Gets the value's node of a key in a mapping, such as a view's `order` list.
 *
 * @param mapping - The mapping's node, or `null` for a mapping with no keys yet.
 * @param key - The key.
 * @param readDocumentText - Reads text from the document.
 * @returns The value's node, or `null` if the mapping has no such key with a value.
 */
function getMappingValueNode(mapping: SyntaxNode | null, key: string, readDocumentText: ReadDocumentText): SyntaxNode | null {
  const pairs: SyntaxNode[] = mapping?.getChildren('Pair') ?? [];

  for (const pair of pairs) {
    const keyNode: SyntaxNode | null = pair.getChild('Key');
    const value: SyntaxNode | null = getPairValue(pair);

    if (keyNode != null && value != null && unquote(readDocumentText(keyNode.from, keyNode.to)) === key) {
      return value;
    }
  }
  return null;
}

/**
 * Gets the property ids in the `order` of the view a line belongs to, as written: the view's columns.
 *
 * @remarks
 * The view is found from the nearest line above with content, as a key typed on its own line belongs to the mapping above it.
 *
 * @param tree - Syntax tree of the document.
 * @param doc - The document.
 * @param pos - Document position, such as the cursor.
 * @returns The property ids, without quotes, or none if the line isn't in a view, or the view has no `order`.
 */
export function getViewOrder(tree: Tree, doc: Text, pos: number): string[] {
  const lineAbove: Line | null = getContentLineAbove(doc, doc.lineAt(pos));
  if (lineAbove == null) {
    return [];
  }

  const readDocumentText: ReadDocumentText = (textFrom: number, textTo: number): string => doc.sliceString(textFrom, textTo);
  const contentEnd: number = lineAbove.from + lineAbove.text.trimEnd().length;

  for (
    let node: SyntaxNode | null = tree.resolve(contentEnd, -1);
    node != null;
    node = node.parent
  ) {
    if (node.name === 'Item' && getYamlKeyPath(node, readDocumentText)?.join('/') === 'views/#') {
      const order: SyntaxNode | null = getMappingValueNode(node.getChild('BlockMapping'), 'order', readDocumentText);
      return order == null ? [] : getListItemTexts(order, null, readDocumentText);
    }
  }
  return [];
}

/* ========================= VALUE POSITION ========================= */

/**
 * Gets the value position at a document position: where the value of a key is being typed on the key's line, or could be.
 *
 * @remarks
 * Only plain values count: a key, `:`, at least one space, then the value or nothing. Quoted values, block scalars,
 * lists in brackets and values that start on a later line don't. A comment after the value isn't part of it.
 * The position can be anywhere in the value, including its start: `type: ‸table`, or after spaces typed after it
 * at the end of the line: `property: film ‸`, where the value being typed is `film `.
 *
 * @param tree - Syntax tree of the document.
 * @param doc - The document.
 * @param pos - Document position, such as the cursor.
 * @returns The value position, or `null` if `pos` isn't in a value position.
 */
export function getValuePosition(tree: Tree, doc: Text, pos: number): ValuePosition | null {
  const readDocumentText: ReadDocumentText = (textFrom: number, textTo: number): string => doc.sliceString(textFrom, textTo);

  const pairValue: PairValue | null = getPairValueAt(tree, pos, readDocumentText);
  if (pairValue == null) {
    return null;
  }

  const { pair, value } = pairValue;
  const keyLine: number = doc.lineAt(pair.from).number;
  if (value != null && doc.lineAt(value.to).number !== keyLine) {
    return null;
  }

  // Spaces typed after the value only count at the end of the line, so a pick doesn't take the space before a comment
  if (value != null && value.to < pos && doc.sliceString(pos, doc.lineAt(pos).to).trim() !== '') {
    return null;
  }

  const keyPath: string[] | null = getYamlKeyPath(pair, readDocumentText);
  if (keyPath == null) {
    return null;
  }

  return {
    keyPath,
    from: value?.from ?? pos,
    to: Math.max(value?.to ?? pos, pos),
    typeValue: getMappingValue(pair.parent, 'type', readDocumentText),
    propertyValue: getMappingValue(pair.parent, 'property', readDocumentText)
  };
}

/**
 * Gets the pair whose plain value is at a position, and that value.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position.
 * @param readDocumentText - Reads text from the document.
 * @returns The pair and its value, with `null` for an empty value; or `null` if `pos` isn't in a pair's plain value.
 */
function getPairValueAt(tree: Tree, pos: number, readDocumentText: ReadDocumentText): PairValue | null {
  // In a value, or at its end
  const node: SyntaxNode = tree.resolve(pos, -1);
  if (node.name === 'Literal' && node.parent?.name === 'Pair') {
    return { pair: node.parent, value: node };
  }

  const nodeBeforeSpaces: SyntaxNode | null = getNodeBeforeSpaces(tree, pos, readDocumentText);

  // After a value and spaces typed after it, such as `property: film ‸`: the value's node ends before the spaces
  if (nodeBeforeSpaces?.name === 'Literal' && nodeBeforeSpaces.parent?.name === 'Pair') {
    return { pair: nodeBeforeSpaces.parent, value: nodeBeforeSpaces };
  }

  // At an empty value, or at the start of one: after a key's `:` and at least one space
  if (nodeBeforeSpaces?.name !== ':' || nodeBeforeSpaces.parent?.name !== 'Pair') {
    return null;
  }

  const value: SyntaxNode | null = nodeBeforeSpaces.nextSibling;
  if (value != null && (value.name !== 'Literal' || value.from !== pos)) {
    return null;
  }
  return { pair: nodeBeforeSpaces.parent, value };
}

/* ========================= LIST ITEM POSITION ========================= */

/**
 * Gets the list item position at a document position: where a plain list item is being typed, or could be,
 * such as a property id in a view's `order`.
 *
 * @remarks
 * Only a `-`, at least one space, then the item's plain text or nothing counts. An item holding a mapping,
 * a quoted value or a list doesn't.
 *
 * @param tree - Syntax tree of the document.
 * @param doc - The document.
 * @param pos - Document position, such as the cursor.
 * @returns The list item position, from the start of the item's text to the end of the line, or `null` if `pos` isn't in one.
 */
export function getListItemPosition(tree: Tree, doc: Text, pos: number): ListItemPosition | null {
  const line: Line = doc.lineAt(pos);
  const match: RegExpExecArray | null = LIST_ITEM_LINE.exec(line.text);
  if (match == null) {
    return null;
  }

  const [, indent = '', dash = ''] = match;
  const from: number = line.from + indent.length + dash.length;
  if (pos < from) {
    return null;
  }

  const dashNode: SyntaxNode = tree.resolve(line.from + indent.length + 1, -1);
  const item: SyntaxNode | null = dashNode.nextSibling;
  const list: SyntaxNode | null = item?.parent ?? null;
  if (dashNode.name !== '-' || item?.name !== 'Item' || list == null) {
    return null;
  }

  // A plain item, or an empty one
  const content: SyntaxNode | null = item.firstChild;
  if (content != null && content.name !== 'Literal') {
    return null;
  }

  const readDocumentText: ReadDocumentText = (textFrom: number, textTo: number): string => doc.sliceString(textFrom, textTo);
  const listKeyPath: string[] | null = getYamlKeyPath(list, readDocumentText);
  if (listKeyPath == null) {
    return null;
  }

  return {
    listKeyPath,
    from,
    to: line.to,
    existingItems: getListItemTexts(list, item, readDocumentText)
  };
}

/**
 * Gets the texts of a list's items.
 *
 * @param list - The list's node.
 * @param skippedItem - An item to leave out, such as the one being typed, or `null`.
 * @param readDocumentText - Reads text from the document.
 * @returns The items' texts, without quotes. Empty items are left out.
 */
function getListItemTexts(list: SyntaxNode, skippedItem: SyntaxNode | null, readDocumentText: ReadDocumentText): string[] {
  const texts: string[] = [];

  for (const item of list.getChildren('Item')) {
    const content: SyntaxNode | null = item.firstChild;
    if (content != null && item.from !== skippedItem?.from) {
      texts.push(unquote(readDocumentText(content.from, content.to)));
    }
  }
  return texts;
}

/* ========================= HELPERS ========================= */

/**
 * Gets the pair whose key starts at a position.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position.
 * @returns The pair, or `null` if no key starts at `pos`.
 */
function getPairWithKeyAt(tree: Tree, pos: number): SyntaxNode | null {
  for (
    let node: SyntaxNode | null = tree.resolve(pos, 1);
    node != null;
    node = node.parent
  ) {
    if (node.name === 'Key') {
      return node.from === pos && node.parent?.name === 'Pair' ? node.parent : null;
    }
  }
  return null;
}

/**
 * Gets a pair's value: the node after its `:`.
 *
 * @param pair - The pair's node.
 * @returns The value's node, or `null` if the pair has no value.
 */
function getPairValue(pair: SyntaxNode): SyntaxNode | null {
  const value: SyntaxNode | null = pair.lastChild;
  if (value == null || value.name === 'Key' || value.name === ':') {
    return null;
  }
  return value;
}

/**
 * Gets where a mapping's keys start: the start of its first key.
 *
 * @remarks
 * A mapping's node can start before its first key. With the `@lezer/lr` version Obsidian runs (1.4.10),
 * a mapping that is a key's value starts right after that key's `:`, on the key's line,
 * and a list item's mapping starts right after the item's `-`.
 *
 * @param mapping - The mapping's node.
 * @returns The start of the mapping's first key, or the start of the mapping's node if it has no keys.
 */
function getMappingStart(mapping: SyntaxNode): number {
  return mapping.getChild('Pair')?.from ?? mapping.from;
}

/**
 * Gets the nearest line above a line that has content, skipping empty lines and comments.
 *
 * @param doc - The document.
 * @param line - The line to start above.
 * @returns The line, or `null` if there's none.
 */
function getContentLineAbove(doc: Text, line: Line): Line | null {
  for (let number: number = line.number - 1; number >= 1; number -= 1) {
    const lineAbove: Line = doc.line(number);
    const content: string = lineAbove.text.trim();

    if (content !== '' && content.startsWith('#') === false) {
      return lineAbove;
    }
  }
  return null;
}

/**
 * Removes the quotes around a quoted key or value.
 *
 * @param text - The text, quoted or not.
 * @returns The text without its quotes.
 */
function unquote(text: string): string {
  return text.replace(QUOTES, '$2');
}

/* ========================= TYPES ========================= */

/**
 * A position where a key of a YAML mapping is being typed, or could be.
 */
export type KeyPosition = {
  /** Key path of the mapping the key belongs to, from {@link getYamlKeyPath}. */
  mappingKeyPath: string[];
  /** Start of the key being typed or renamed. */
  from: number;
  /** End of the key being typed or renamed. */
  to: number;
  /** Whether an existing key, followed by its `:`, is being renamed. */
  isRename: boolean;
  /** Keys already in the mapping, apart from the one at the position. */
  existingKeys: string[];
  /** The value of the mapping's `type` key, such as a view's type, or `null` if it has none. */
  typeValue: string | null;
};

/**
 * The range of a key being typed or renamed.
 */
type KeyRange = {
  from: number;
  to: number;
  isRename: boolean;
};

/**
 * A position where the value of a key is being typed on the key's line, or could be.
 */
export type ValuePosition = {
  /** Key path of the value: its mapping's key path, then its key. From {@link getYamlKeyPath}. */
  keyPath: string[];
  /** Start of the value, or the position itself if the value is empty. */
  from: number;
  /** End of the value, before any comment, or the position itself if the value is empty or the position is after it. */
  to: number;
  /** The value of the mapping's `type` key, such as a view's type, or `null` if it has none. */
  typeValue: string | null;
  /** The value of the mapping's `property` key, such as the property a sort item sorts by, or `null` if it has none. */
  propertyValue: string | null;
};

/**
 * A position where a plain list item is being typed, or could be.
 */
export type ListItemPosition = {
  /** Key path of the list, such as `['views', '#', 'order']`. From {@link getYamlKeyPath}. */
  listKeyPath: string[];
  /** Start of the item's text, or the position itself if the item is empty. */
  from: number;
  /** End of the line. */
  to: number;
  /** The texts of the list's other items, without quotes. */
  existingItems: string[];
};

/**
 * A pair, and its plain value: `null` if the value is empty.
 */
type PairValue = {
  pair: SyntaxNode;
  value: SyntaxNode | null;
};
