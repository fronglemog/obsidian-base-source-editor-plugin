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

import { yamlLanguage } from '@codemirror/lang-yaml';
import { parseMixed } from '@lezer/common';

import type {
  NestedParse,
  Parser,
  SyntaxNodeRef,
  Tree
} from '@lezer/common';

import {
  getFormulasFromBaseYaml,
  getPropertyDisplayNamesFromBaseYaml,
  getSummariesFromBaseYaml
} from 'src/BaseYamlLanguage/getFormulasFromBaseYaml';
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

describe('getSummariesFromBaseYaml', () => {
  test('reads the top-level summaries, not a view\'s', () => {
    const document: string = [
      'summaries:',
      '  Top: values.max()',
      '  "Two words": "values.unique().length"',
      'views:',
      '  - type: table',
      '    name: All',
      '    summaries:',
      '      price: Top',
      ''
    ].join('\n');
    const tree: Tree = yamlLanguage.parser.parse(document);
    expect(getSummariesFromBaseYaml(tree, getReadDocumentTextOf(document))).toEqual({
      'Top': 'values.max()',
      'Two words': 'values.unique().length'
    });
  });
});

describe('getPropertyDisplayNamesFromBaseYaml', () => {
  test('reads each display name under the property id it\'s set for, as written', () => {
    const document: string = [
      'properties:',
      '  note.title:',
      '    displayName: "Note: title"',
      '  file.name:',
      '    displayName: File',
      '  price:',
      '    displayName: Price',
      '  note.status:',
      '    width: 3',
      'views:',
      '  - type: table',
      '    name: All',
      ''
    ].join('\n');
    const tree: Tree = yamlLanguage.parser.parse(document);
    expect(getPropertyDisplayNamesFromBaseYaml(tree, getReadDocumentTextOf(document))).toEqual({
      'note.title': 'Note: title',
      'file.name': 'File',
      'price': 'Price'
    });
  });
});
