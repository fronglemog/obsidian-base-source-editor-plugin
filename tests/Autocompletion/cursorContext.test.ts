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
  getValuePosition
} from 'src/Autocompletion/cursorContext';

import type {
  KeyPosition,
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
      typeValue: 'table'
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
      typeValue: 'table'
    });
    const position: number = 'views:\n  - type: '.length;
    expect(getValuePositionAfter('views:\n  - type: \n    name: All\n', '- type: ')).toMatchObject({ keyPath: ['views', '#', 'type'], from: position, to: position });
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
