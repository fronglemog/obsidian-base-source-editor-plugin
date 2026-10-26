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

      const column: number = node.from - doc.lineAt(node.from).from;
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
  const valueLine: Line = doc.lineAt(value.from);
  const isOnLaterLine: boolean = valueLine.number > doc.lineAt(pair.from).number;

  if (value.name === 'BlockMapping') {
    if (isOnLaterLine === false || value.from - valueLine.from !== keyColumn) {
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
    typeValue: getTypeValue(mapping, readDocumentText)
  };
}

/**
 * Gets the value of a mapping's `type` key, such as a view's type.
 *
 * @param mapping - The mapping's node, or `null` for a mapping with no keys yet.
 * @param readDocumentText - Reads text from the document.
 * @returns The value without quotes, or `null` if the mapping has no `type` key with a value.
 */
function getTypeValue(mapping: SyntaxNode | null, readDocumentText: ReadDocumentText): string | null {
  const pairs: SyntaxNode[] = mapping?.getChildren('Pair') ?? [];

  for (const pair of pairs) {
    const keyNode: SyntaxNode | null = pair.getChild('Key');
    const value: SyntaxNode | null = getPairValue(pair);

    if (keyNode != null && value != null && unquote(readDocumentText(keyNode.from, keyNode.to)) === 'type') {
      return unquote(readDocumentText(value.from, value.to));
    }
  }
  return null;
}

/* ========================= VALUE POSITION ========================= */

/**
 * Gets the value position at a document position: where the value of a key is being typed on the key's line, or could be.
 *
 * @remarks
 * Only plain values count: a key, `:`, at least one space, then the value or nothing. Quoted values, block scalars,
 * lists in brackets and values that start on a later line don't. A comment after the value isn't part of it.
 * The position can be anywhere in the value, including its start: `type: ‸table`.
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

  const keyPath: string[] | null = getYamlKeyPath(pair, readDocumentText);
  if (keyPath == null) {
    return null;
  }

  return {
    keyPath,
    from: value?.from ?? pos,
    to: value?.to ?? pos,
    typeValue: getTypeValue(pair.parent, readDocumentText)
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

  // At an empty value, or at the start of one: after a key's `:` and at least one space
  const colon: SyntaxNode | null = getNodeBeforeSpaces(tree, pos, readDocumentText);
  if (colon?.name !== ':' || colon.parent?.name !== 'Pair') {
    return null;
  }

  const value: SyntaxNode | null = colon.nextSibling;
  if (value != null && (value.name !== 'Literal' || value.from !== pos)) {
    return null;
  }
  return { pair: colon.parent, value };
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
  /** End of the value, before any comment, or the position itself if the value is empty. */
  to: number;
  /** The value of the mapping's `type` key, such as a view's type, or `null` if it has none. */
  typeValue: string | null;
};

/**
 * A pair, and its plain value: `null` if the value is empty.
 */
type PairValue = {
  pair: SyntaxNode;
  value: SyntaxNode | null;
};
