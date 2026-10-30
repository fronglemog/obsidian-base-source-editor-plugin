/**
 * Tests that parse YAML with CodeMirror's YAML parser.
 *
 * @remarks
 * The YAML parser runs on `@lezer/lr`. The plugin's build leaves `@lezer/lr` out, so in Obsidian the parser uses
 * Obsidian's own copy, while these tests use the copy in `node_modules`. `pnpm-workspace.yaml` pins that copy
 * to 1.4.10, the version Obsidian 1.14.5 runs, so the trees here are the trees the plugin gets in Obsidian.
 *
 * Versions of `@lezer/lr` can differ in where nodes start. Since 1.4.7, a mapping that is a key's value starts
 * right after the key's `:`; with 1.4.5 it started at its first key, on the next line. Code that works out
 * a column from where a node starts is the kind that breaks.
 *
 * When Obsidian updates its copy, these tests keep passing, because they still run 1.4.10. What you'd see instead
 * is code that passes here but fails in Obsidian. The drift check in `_local/obsidian copies/` reports the change:
 * its `lezer-lr-version` entry looks for four pieces of code that together only 1.4.10 has. To find Obsidian's
 * new version, compare its `@lezer/lr` code in `app.js` with the versions published on unpkg. Then pin that version
 * and run the tests: the tests that fail show what the new version changed.
 *
 * @packageDocumentation
 */

/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* CODEMIRROR */
import { yamlLanguage } from '@codemirror/lang-yaml';
import { Text } from '@codemirror/state';
import type { Tree } from '@lezer/common';

/* PLUGIN */
import {
  getKeyPosition,
  getListItemPosition,
  getPropertyKeyPosition,
  getValuePosition,
  getViewOrder
} from 'src/Autocompletion/cursorContext';

import type {
  KeyPosition,
  ListItemPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

/* ========================= TEST DATA ========================= */

const VIEW: string = 'views:\n  - type: table\n    name: All\n';

/* ========================= HELPERS ========================= */

/**
 * Gets the key position right after some text in a YAML document.
 *
 * @param document - YAML document.
 * @param text - Text to find; the position is just after its first occurrence.
 * @returns The key position, or `null` if the position isn't a key position.
 */
function getKeyPositionAfter(document: string, text: string): KeyPosition | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  const position: number = document.indexOf(text) + text.length;
  return getKeyPosition(tree, Text.of(document.split('\n')), position);
}

/**
 * Gets the value position right after some text in a YAML document.
 *
 * @param document - YAML document.
 * @param text - Text to find; the position is just after its first occurrence.
 * @returns The value position, or `null` if the position isn't a value position.
 */
function getValuePositionAfter(document: string, text: string): ValuePosition | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  const position: number = document.indexOf(text) + text.length;
  return getValuePosition(tree, Text.of(document.split('\n')), position);
}

/**
 * Gets the property key position right after some text in a YAML document.
 *
 * @param document - YAML document.
 * @param text - Text to find; the position is just after its first occurrence.
 * @returns The key position, or `null` if the position isn't a property key position.
 */
function getPropertyKeyPositionAfter(document: string, text: string): KeyPosition | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  const position: number = document.indexOf(text) + text.length;
  return getPropertyKeyPosition(tree, Text.of(document.split('\n')), position);
}

/**
 * Gets the property key position at the end of a YAML document.
 *
 * @param document - YAML document.
 * @returns The key position, or `null` if the end isn't a property key position.
 */
function getPropertyKeyPositionAtEnd(document: string): KeyPosition | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  return getPropertyKeyPosition(tree, Text.of(document.split('\n')), document.length);
}

/**
 * Gets the list item position at the end of a YAML document.
 *
 * @param document - YAML document.
 * @returns The list item position, or `null` if the end isn't a list item position.
 */
function getListItemPositionAtEnd(document: string): ListItemPosition | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  return getListItemPosition(tree, Text.of(document.split('\n')), document.length);
}

/**
 * Gets the property ids in the order of the view at the end of a YAML document.
 *
 * @param document - YAML document.
 * @returns The property ids.
 */
function getViewOrderAtEnd(document: string): string[] {
  const tree: Tree = yamlLanguage.parser.parse(document);
  return getViewOrder(tree, Text.of(document.split('\n')), document.length);
}

/* ========================= TESTS ========================= */

describe('getKeyPosition', () => {
  test('a partial key at the top level', () => {
    expect(getKeyPositionAfter('filters:\n  and: []\nfo\n', '\nfo')).toMatchObject({
      mappingKeyPath: [],
      isRename: false,
      existingKeys: ['filters'],
      typeValue: null
    });
  });

  test('a partial key in a view, with the keys already there and the view\'s type', () => {
    expect(getKeyPositionAfter(`${VIEW}    ro\n`, '    ro')).toMatchObject({
      mappingKeyPath: ['views', '#'],
      isRename: false,
      existingKeys: ['type', 'name'],
      typeValue: 'table'
    });
    expect(getKeyPositionAfter('views:\n  - type: cards\n    ro\n    name: All\n', '    ro')).toMatchObject({
      mappingKeyPath: ['views', '#'],
      existingKeys: ['type', 'name'],
      typeValue: 'cards'
    });
  });

  test('an empty line', () => {
    expect(getKeyPositionAfter(`${VIEW}    \n`, 'All\n    ')).toMatchObject({
      mappingKeyPath: ['views', '#'],
      existingKeys: ['type', 'name']
    });
    expect(getKeyPositionAfter('filters:\n  and: []\n\nviews: []\n', '[]\n')).toMatchObject({
      mappingKeyPath: [],
      existingKeys: ['filters', 'views']
    });
  });

  test('the first key of a new list item', () => {
    expect(getKeyPositionAfter('views:\n  - name: All\n  - ty\n', '  - ty')).toMatchObject({
      mappingKeyPath: ['views', '#'],
      existingKeys: [],
      typeValue: null
    });
    expect(getKeyPositionAfter(`${VIEW}    sort:\n      - pro\n`, '- pro')).toMatchObject({
      mappingKeyPath: ['views', '#', 'sort', '#'],
      existingKeys: []
    });
  });

  test('the line under a key with nothing after its colon', () => {
    expect(getKeyPositionAfter(`${VIEW}    groupBy:\n      pro\n`, '      pro')).toMatchObject({
      mappingKeyPath: ['views', '#', 'groupBy'],
      existingKeys: []
    });
    expect(getKeyPositionAfter(`${VIEW}    groupBy:\n      property: status\n      dir\n`, '      dir')).toMatchObject({
      mappingKeyPath: ['views', '#', 'groupBy'],
      existingKeys: ['property']
    });
  });

  test('an empty line right under a key, above the keys already in its mapping', () => {
    expect(getKeyPositionAfter(`${VIEW}    groupBy:\n      \n      property: status\n`, 'groupBy:\n      ')).toMatchObject({
      mappingKeyPath: ['views', '#', 'groupBy'],
      existingKeys: ['property']
    });
  });

  test('the line under a line that ends with a comment', () => {
    expect(getKeyPositionAfter('views:\n  - type: table # main\n    \n    name: All\n', '# main\n    ')).toMatchObject({
      mappingKeyPath: ['views', '#'],
      existingKeys: ['type', 'name']
    });
    expect(getKeyPositionAfter(`${VIEW}    groupBy:\n      property: status # main\n      \n      direction: ASC\n`, '# main\n      ')).toMatchObject({
      mappingKeyPath: ['views', '#', 'groupBy'],
      existingKeys: ['property', 'direction']
    });
  });

  test('under filters, and in a filter list', () => {
    expect(getKeyPositionAfter('filters:\n  an\n', '  an')).toMatchObject({ mappingKeyPath: ['filters'] });
    expect(getKeyPositionAfter('filters:\n  and:\n    - an\n', '- an')).toMatchObject({ mappingKeyPath: ['filters', 'and', '#'] });
  });

  test('renaming an existing key replaces only its name', () => {
    const nameFrom: number = VIEW.indexOf('name');
    expect(getKeyPositionAfter(VIEW, '    na')).toEqual({
      mappingKeyPath: ['views', '#'],
      from: nameFrom,
      to: nameFrom + 'name'.length,
      isRename: true,
      existingKeys: ['type'],
      typeValue: 'table'
    });
  });

  test('a new key\'s range covers the whole partial key', () => {
    const document: string = `${VIEW}    rowHe\n`;
    const keyFrom: number = document.indexOf('rowHe');
    expect(getKeyPositionAfter(document, '    row')).toMatchObject({ from: keyFrom, to: keyFrom + 'rowHe'.length });
  });

  test('not after a colon', () => {
    expect(getKeyPositionAfter(VIEW, 'name: ')).toBeNull();
    expect(getKeyPositionAfter(VIEW, 'name: A')).toBeNull();
  });

  test('not in a block scalar, a comment or quotes', () => {
    expect(getKeyPositionAfter('formulas:\n  Title: |\n    file\n', '    file')).toBeNull();
    expect(getKeyPositionAfter(`${VIEW}    # ro\n`, '# ro')).toBeNull();
    expect(getKeyPositionAfter(`${VIEW}    "ro\n`, '"ro')).toBeNull();
  });

  test('not on a line that fits no mapping', () => {
    expect(getKeyPositionAfter(`${VIEW}      ro\n`, '      ro')).toBeNull();
    expect(getKeyPositionAfter('views:\n  - type: table\n  ro\n', '\n  ro')).toBeNull();
    expect(getKeyPositionAfter('views:\n  -ty\n', '-ty')).toBeNull();
  });

  test('not in a formula that continues on the next line', () => {
    expect(getKeyPositionAfter('filters:\n  file.na\n', 'file.na')).toBeNull();
  });
});

describe('getValuePosition', () => {
  test('a value being typed, with its key path and the view\'s type', () => {
    const document: string = `${VIEW}    rowHeight: me\n`;
    const valueFrom: number = document.indexOf('me\n');
    expect(getValuePositionAfter(document, 'rowHeight: me')).toEqual({
      keyPath: ['views', '#', 'rowHeight'],
      from: valueFrom,
      to: valueFrom + 'me'.length,
      typeValue: 'table',
      propertyValue: null
    });
  });

  test('the whole value, with the position in it or at its start', () => {
    const valueFrom: number = VIEW.indexOf('table');
    const expected: object = { keyPath: ['views', '#', 'type'], from: valueFrom, to: valueFrom + 'table'.length };
    expect(getValuePositionAfter(VIEW, 'type: ta')).toMatchObject(expected);
    expect(getValuePositionAfter(VIEW, 'type: ')).toMatchObject(expected);
  });

  test('an empty value', () => {
    const document: string = `${VIEW}    rowHeight: `;
    expect(getValuePositionAfter(document, 'rowHeight: ')).toEqual({
      keyPath: ['views', '#', 'rowHeight'],
      from: document.length,
      to: document.length,
      typeValue: 'table',
      propertyValue: null
    });
    const position: number = 'views:\n  - type: '.length;
    expect(getValuePositionAfter('views:\n  - type: \n    name: All\n', '- type: ')).toMatchObject({ keyPath: ['views', '#', 'type'], from: position, to: position });
  });

  test('the property beside a direction, in a sort item or groupBy', () => {
    const sortDocument: string = `${VIEW}    sort:\n      - property: note.price\n        direction: A\n`;
    expect(getValuePositionAfter(sortDocument, 'direction: A')).toMatchObject({ propertyValue: 'note.price' });

    const groupDocument: string = `${VIEW}    groupBy:\n      property: "film - year"\n      direction: \n`;
    expect(getValuePositionAfter(groupDocument, 'direction: ')).toMatchObject({ propertyValue: 'film - year' });
  });

  test('the first key of a list item, and a sort item\'s direction', () => {
    expect(getValuePositionAfter('views:\n  - type: ta\n', 'type: ta')).toMatchObject({ keyPath: ['views', '#', 'type'] });
    expect(getValuePositionAfter(`${VIEW}    sort:\n      - property: file.name\n        direction: A\n`, 'direction: A')).toMatchObject({ keyPath: ['views', '#', 'sort', '#', 'direction'] });
  });

  test('a comment after the value isn\'t part of it', () => {
    const document: string = `${VIEW}    rowHeight: me # short\n`;
    const valueFrom: number = document.indexOf('me #');
    expect(getValuePositionAfter(document, 'rowHeight: m')).toMatchObject({ from: valueFrom, to: valueFrom + 'me'.length });
  });

  test('spaces typed after the value, at the end of the line: the value runs to the position', () => {
    const document: string = `${VIEW}    sort:\n      - property: film \n`;
    const valueFrom: number = document.indexOf('film ');
    expect(getValuePositionAfter(document, 'property: film ')).toEqual({
      keyPath: ['views', '#', 'sort', '#', 'property'],
      from: valueFrom,
      to: valueFrom + 'film '.length,
      typeValue: null,
      propertyValue: 'film'
    });
    expect(getValuePositionAfter(`${VIEW}    groupBy:\n      property: film - \n`, 'property: film - ')).toMatchObject({ to: `${VIEW}    groupBy:\n      property: film - `.length });
  });

  test('not after spaces typed after the value, before a comment', () => {
    expect(getValuePositionAfter(`${VIEW}    rowHeight: me # short\n`, 'rowHeight: me ')).toBeNull();
  });

  test('not without a space after the colon', () => {
    expect(getValuePositionAfter('views:\n  - name: All\n    type:\n', 'type:')).toBeNull();
  });

  test('not in quotes, a list in brackets, a block scalar or a comment', () => {
    expect(getValuePositionAfter(`${VIEW}    rowHeight: "me"\n`, '"me')).toBeNull();
    expect(getValuePositionAfter(`${VIEW}    order: [file.name]\n`, '[file.na')).toBeNull();
    expect(getValuePositionAfter('formulas:\n  Title: |\n    file\n', '    file')).toBeNull();
    expect(getValuePositionAfter(`${VIEW}    rowHeight: # me\n`, '# me')).toBeNull();
  });

  test('not in a value that starts on a later line', () => {
    expect(getValuePositionAfter(`${VIEW}    groupBy:\n      pro\n`, '      pro')).toBeNull();
  });

  test('not in a key', () => {
    expect(getValuePositionAfter(`${VIEW}    rowHeight: medium\n`, '    row')).toBeNull();
  });
});

describe('getPropertyKeyPosition', () => {
  test('the first property id in a view\'s summaries, read as the start of its value', () => {
    const document: string = `${VIEW}    summaries:\n      film - ye`;
    expect(getPropertyKeyPositionAtEnd(document)).toMatchObject({
      mappingKeyPath: ['views', '#', 'summaries'],
      from: document.indexOf('film - ye'),
      to: document.length,
      existingKeys: []
    });
  });

  test('a property id under properties, after another', () => {
    const document: string = 'properties:\n  note.title:\n    displayName: Title\n  file.na';
    expect(getPropertyKeyPositionAtEnd(document)).toMatchObject({
      mappingKeyPath: ['properties'],
      from: document.indexOf('file.na'),
      existingKeys: ['note.title']
    });
  });

  test('an empty line in a view\'s columnSize, on Ctrl+Space', () => {
    const document: string = `${VIEW}    columnSize:\n      note.price: 120\n      `;
    expect(getPropertyKeyPositionAtEnd(document)).toMatchObject({
      mappingKeyPath: ['views', '#', 'columnSize'],
      from: document.length,
      to: document.length,
      existingKeys: ['note.price']
    });
  });

  test('an empty line right under columnSize or properties, above the property ids already there', () => {
    const columnSizeDocument: string = `${VIEW}    columnSize:\n      \n      note.price: 120\n`;
    const columnSizePosition: number = columnSizeDocument.indexOf('\n      \n') + '\n      '.length;
    expect(getPropertyKeyPositionAfter(columnSizeDocument, 'columnSize:\n      ')).toMatchObject({
      mappingKeyPath: ['views', '#', 'columnSize'],
      from: columnSizePosition,
      to: columnSizePosition,
      existingKeys: ['note.price']
    });
    expect(getPropertyKeyPositionAfter('properties:\n  \n  note.title:\n    displayName: Title\n', 'properties:\n  ')).toMatchObject({
      mappingKeyPath: ['properties'],
      existingKeys: ['note.title']
    });
  });

  test('the line under a property id whose line ends with a comment', () => {
    const document: string = `${VIEW}    columnSize:\n      note.price: 120 # wide\n      \n      note.title: 80\n`;
    expect(getPropertyKeyPositionAfter(document, '# wide\n      ')).toMatchObject({
      mappingKeyPath: ['views', '#', 'columnSize'],
      existingKeys: ['note.price', 'note.title']
    });
  });

  test('not on a line with a key and its colon, or a list item', () => {
    expect(getPropertyKeyPositionAtEnd(`${VIEW}    summaries:\n      price: Av`)).toBeNull();
    expect(getPropertyKeyPositionAtEnd(`${VIEW}    order:\n      - fi`)).toBeNull();
  });
});

describe('getListItemPosition', () => {
  test('an item being typed in a view\'s order, with the other items', () => {
    const document: string = `${VIEW}    order:\n      - film - year\n      - "file: x"\n      - fi`;
    expect(getListItemPositionAtEnd(document)).toEqual({
      listKeyPath: ['views', '#', 'order'],
      from: document.length - 'fi'.length,
      to: document.length,
      existingItems: ['film - year', 'file: x']
    });
  });

  test('an empty item, on Ctrl+Space', () => {
    const document: string = `${VIEW}    order:\n      - file.name\n      - `;
    expect(getListItemPositionAtEnd(document)).toEqual({
      listKeyPath: ['views', '#', 'order'],
      from: document.length,
      to: document.length,
      existingItems: ['file.name']
    });
  });

  test('not an item holding a key, or a line without a dash', () => {
    expect(getListItemPositionAtEnd(`${VIEW}    sort:\n      - property: fi`)).toBeNull();
    expect(getListItemPositionAtEnd(`${VIEW}    summaries:\n      fi`)).toBeNull();
  });
});

describe('getViewOrder', () => {
  test('the property ids in the view\'s order, without quotes', () => {
    expect(getViewOrderAtEnd(`${VIEW}    order:\n      - film - year\n      - "file: x"\n    summaries:\n      `)).toEqual(['film - year', 'file: x']);
  });

  test('none for a view without an order, or outside a view', () => {
    expect(getViewOrderAtEnd(`${VIEW}    summaries:\n      `)).toEqual([]);
    expect(getViewOrderAtEnd('properties:\n  ')).toEqual([]);
  });
});
