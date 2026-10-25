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
import { getKeyPosition } from 'src/Autocompletion/cursorContext';
import type { KeyPosition } from 'src/Autocompletion/cursorContext';

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
