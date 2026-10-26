/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

import { yamlLanguage } from '@codemirror/lang-yaml';
import { parseMixed } from '@lezer/common';

import type {
  NestedParse,
  Parser,
  SyntaxNodeRef,
  Tree
} from '@lezer/common';

import { getFormulasFromBaseYaml } from 'src/BaseYamlLanguage/getFormulasFromBaseYaml';
import type { ReadDocumentText } from 'src/BaseYamlLanguage/yamlKeyPath';

/* ========================= TEST DATA ========================= */

const DOCUMENT: string = [
  'formulas:',
  '  Plain: note.x',
  String.raw`  "Quoted key": "a \" b"`,
  '  Single: \'it\'\'s\'',
  '  Block: |',
  '    if(x,',
  '      1, 2)',
  '  Empty:',
  'views:',
  '  - type: table',
  '    name: Plain',
  ''
].join('\n');

const EXPECTED_FORMULAS: Record<string, string> = {
  'Plain': 'note.x',
  'Quoted key': 'a " b',
  'Single': 'it\'s',
  'Block': '    if(x,\n      1, 2)'
};

/* ========================= HELPERS ========================= */

/**
 * Makes a ReadDocumentText for a string.
 *
 * @param document - The document's text.
 * @returns A function reading `document`.
 */
function getReadDocumentTextOf(document: string): ReadDocumentText {
  const readDocumentText = (from: number, to: number): string => document.slice(from, to);
  return readDocumentText;
}

/* ========================= TESTS ========================= */

describe('getDocumentFormulas', () => {
  test('reads plain, quoted and block formulas, and skips empty ones', () => {
    const tree: Tree = yamlLanguage.parser.parse(DOCUMENT);
    expect(getFormulasFromBaseYaml(tree, getReadDocumentTextOf(DOCUMENT))).toEqual(EXPECTED_FORMULAS);
  });

  test('ignores trees mounted inside values', () => {
    // Stands in for the plugin's parser, which mounts Obsidian's formula parser inside formula values.
    const parser: Parser = yamlLanguage.parser.configure({
      wrap: parseMixed((node: SyntaxNodeRef): NestedParse | null => {
        const isValue: boolean = (node.name === 'Literal' && node.node.parent?.name !== 'Key') || node.name === 'BlockLiteralContent';
        return isValue ? { parser: yamlLanguage.parser } : null;
      })
    });
    const tree: Tree = parser.parse(DOCUMENT);
    expect(getFormulasFromBaseYaml(tree, getReadDocumentTextOf(DOCUMENT))).toEqual(EXPECTED_FORMULAS);
  });

  test('returns nothing when there are no formulas', () => {
    const document: string = 'views:\n  - type: table\n';
    const tree: Tree = yamlLanguage.parser.parse(document);
    expect(getFormulasFromBaseYaml(tree, getReadDocumentTextOf(document))).toEqual({});
  });
});
