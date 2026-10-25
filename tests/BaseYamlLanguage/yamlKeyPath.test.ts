/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

import { yamlLanguage } from '@codemirror/lang-yaml';

import type {
  SyntaxNode,
  Tree
} from '@lezer/common';

import {
  getYamlKeyPath,
  isFormulaPath,
  isInSummaryFormula,
  isSummaryFormulaPath
} from 'src/BaseYamlLanguage/yamlKeyPath';

/* ========================= HELPERS ========================= */

/**
 * Gets the key path at the first occurrence of some text in a YAML document.
 *
 * @param document - YAML document.
 * @param text - Text to find; the key path is taken just inside its first character.
 * @returns The key path.
 */
function getKeyPathAt(document: string, text: string): string[] | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  const position: number = document.indexOf(text) + 1;
  const node: SyntaxNode = tree.resolveInner(position, 1);
  return getYamlKeyPath(node, (from: number, to: number): string => document.slice(from, to));
}

/**
 * Returns whether the position right after some text in a YAML document is in a summary formula.
 *
 * @param document - YAML document.
 * @param text - Text to find; the position is just after its first occurrence.
 * @returns Whether the position is in a summary formula.
 */
function isInSummaryFormulaAfter(document: string, text: string): boolean {
  const tree: Tree = yamlLanguage.parser.parse(document);
  const position: number = document.indexOf(text) + text.length;
  return isInSummaryFormula(tree, position, (from: number, to: number): string => document.slice(from, to));
}

/* ========================= TESTS ========================= */

describe('getYamlKeyPath', () => {
  test('gets the path of a formula', () => {
    const document: string = 'formulas:\n  Title: file.name\n';
    expect(getKeyPathAt(document, 'file.name')).toEqual(['formulas', 'Title']);
  });

  test('uses # for list items', () => {
    const document: string = 'views:\n  - type: table\n    filters:\n      and:\n        - file.name\n';
    expect(getKeyPathAt(document, 'file.name')).toEqual(['views', '#', 'filters', 'and', '#']);
  });

  test('removes the quotes around a quoted key', () => {
    const document: string = 'formulas:\n  "Note: title": note.title\n';
    expect(getKeyPathAt(document, 'note.title')).toEqual(['formulas', 'Note: title']);
  });

  test('returns null inside a key', () => {
    const document: string = 'formulas:\n  Title: file.name\n';
    expect(getKeyPathAt(document, 'Title')).toBeNull();
  });
});

describe('isFormulaPath', () => {
  test('accepts formulas, summaries and filters', () => {
    expect(isFormulaPath(['formulas', 'Title'])).toBe(true);
    expect(isFormulaPath(['summaries', 'Mean'])).toBe(true);
    expect(isFormulaPath(['filters', 'and', '#'])).toBe(true);
    expect(isFormulaPath(['views', '#', 'filters', 'and', '#'])).toBe(true);
  });

  test('rejects other keys', () => {
    expect(isFormulaPath(['formulas'])).toBe(false);
    expect(isFormulaPath(['views', '#', 'name'])).toBe(false);
  });
});

describe('isSummaryFormulaPath', () => {
  test('accepts a top-level summary', () => {
    expect(isSummaryFormulaPath(['summaries', 'Mean'])).toBe(true);
  });

  test('rejects a view\'s summaries and other keys', () => {
    expect(isSummaryFormulaPath(['summaries'])).toBe(false);
    expect(isSummaryFormulaPath(['views', '#', 'summaries', 'file.name'])).toBe(false);
    expect(isSummaryFormulaPath(['formulas', 'Title'])).toBe(false);
  });
});

describe('isInSummaryFormula', () => {
  const document: string = [
    'summaries:',
    '  Plain: values.me',
    '  Double: "values.me"',
    '  Single: \'values.me\'',
    'formulas:',
    '  Title: file.name',
    'views:',
    '  - type: table',
    '    summaries:',
    '      file.size: Average',
    ''
  ].join('\n');

  test('at the end of a plain summary formula', () => {
    expect(isInSummaryFormulaAfter(document, 'Plain: values.me')).toBe(true);
  });

  test('inside a quoted summary formula', () => {
    expect(isInSummaryFormulaAfter(document, 'Double: "values.me')).toBe(true);
    expect(isInSummaryFormulaAfter(document, 'Single: \'values.me')).toBe(true);
  });

  test('not in a summary\'s key', () => {
    expect(isInSummaryFormulaAfter(document, '  Pla')).toBe(false);
  });

  test('not in other formulas, or in a view\'s summaries', () => {
    expect(isInSummaryFormulaAfter(document, 'Title: file.name')).toBe(false);
    expect(isInSummaryFormulaAfter(document, 'file.size: Average')).toBe(false);
  });
});
