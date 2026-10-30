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

import type {
  SyntaxNode,
  Tree
} from '@lezer/common';

import {
  getEmptyValueKeyPath,
  getYamlKeyPath,
  isFilterGroupPath,
  isFilterMappingPath,
  isFiltersValuePath,
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

/**
 * Gets the key path of the empty value at the position right after some text in a YAML document.
 *
 * @param document - YAML document.
 * @param text - Text to find; the position is just after its first occurrence.
 * @returns The key path, or `null` if the position isn't in an empty value.
 */
function getEmptyValueKeyPathAfter(document: string, text: string): string[] | null {
  const tree: Tree = yamlLanguage.parser.parse(document);
  const position: number = document.indexOf(text) + text.length;
  return getEmptyValueKeyPath(tree, position, (from: number, to: number): string => document.slice(from, to));
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

  test('at an empty summary value', () => {
    expect(isInSummaryFormulaAfter('summaries:\n  Mean: \n  Total: values.sum()\n', 'Mean: ')).toBe(true);
    expect(isInSummaryFormulaAfter('formulas:\n  Title: \n', 'Title: ')).toBe(false);
  });
});

describe('isFilterGroupPath', () => {
  test('accepts and, or and not in a filter', () => {
    expect(isFilterGroupPath(['filters', 'and'])).toBe(true);
    expect(isFilterGroupPath(['filters', 'or', '#', 'not'])).toBe(true);
    expect(isFilterGroupPath(['views', '#', 'filters', 'or'])).toBe(true);
  });

  test('rejects filters, filter items, and keys named and outside filters', () => {
    expect(isFilterGroupPath(['filters'])).toBe(false);
    expect(isFilterGroupPath(['filters', 'and', '#'])).toBe(false);
    expect(isFilterGroupPath(['views', '#', 'filters'])).toBe(false);
    expect(isFilterGroupPath(['formulas', 'and'])).toBe(false);
  });
});

describe('isFilterMappingPath', () => {
  test('accepts a filters key\'s own value, and items in a filter group', () => {
    expect(isFilterMappingPath(['filters'])).toBe(true);
    expect(isFilterMappingPath(['views', '#', 'filters'])).toBe(true);
    expect(isFilterMappingPath(['filters', 'and', '#'])).toBe(true);
    expect(isFilterMappingPath(['views', '#', 'filters', 'or', '#', 'not', '#'])).toBe(true);
  });

  test('rejects items in a list straight under filters, which Obsidian doesn\'t accept', () => {
    expect(isFilterMappingPath(['filters', '#'])).toBe(false);
    expect(isFilterMappingPath(['views', '#', 'filters', '#'])).toBe(false);
  });

  test('rejects filter groups, and paths outside filters', () => {
    expect(isFilterMappingPath(['filters', 'and'])).toBe(false);
    expect(isFilterMappingPath(['views', '#'])).toBe(false);
    expect(isFilterMappingPath(['formulas', 'filters'])).toBe(false);
  });
});

describe('isFiltersValuePath', () => {
  test('accepts the value of the top-level filters and of a view\'s filters', () => {
    expect(isFiltersValuePath(['filters'])).toBe(true);
    expect(isFiltersValuePath(['views', '#', 'filters'])).toBe(true);
  });

  test('rejects filters inside a group, and keys named filters elsewhere', () => {
    expect(isFiltersValuePath(['filters', 'and', '#'])).toBe(false);
    expect(isFiltersValuePath(['views', '#', 'filters', 'or', '#'])).toBe(false);
    expect(isFiltersValuePath(['formulas', 'filters'])).toBe(false);
  });
});

describe('getEmptyValueKeyPath', () => {
  test('after a key and a space, with nothing typed', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: ', 'Title: ')).toEqual(['formulas', 'Title']);
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: \n  Other: file.name\n', 'Title: ')).toEqual(['formulas', 'Title']);
    expect(getEmptyValueKeyPathAfter('formulas:\n  "Note: title": \n', '"Note: title": ')).toEqual(['formulas', 'Note: title']);
  });

  test('with more spaces or a comment around the position', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title:   \n', 'Title: ')).toEqual(['formulas', 'Title']);
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title:   \n', 'Title:   ')).toEqual(['formulas', 'Title']);
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title:  # note\n', 'Title: ')).toEqual(['formulas', 'Title']);
  });

  test('between empty quotes', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: ""\n', 'Title: "')).toEqual(['formulas', 'Title']);
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: \'\'\n', 'Title: \'')).toEqual(['formulas', 'Title']);
  });

  test('on an indented line of an empty block scalar', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: |\n    \n', '|\n    ')).toEqual(['formulas', 'Title']);
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: |\n    \n  Other: file.name\n', '|\n    ')).toEqual(['formulas', 'Title']);
  });

  test('in an empty list item, with # for the item', () => {
    expect(getEmptyValueKeyPathAfter('filters:\n  and:\n    - \n', '- ')).toEqual(['filters', 'and', '#']);
    expect(getEmptyValueKeyPathAfter('filters:\n  and:\n    - \n    - file.name\n', '- ')).toEqual(['filters', 'and', '#']);
    expect(getEmptyValueKeyPathAfter('views:\n  - type: table\n    filters:\n      or:\n        - \n', 'or:\n        - ')).toEqual(['views', '#', 'filters', 'or', '#']);
  });

  test('for any key, whether its value is a formula or not', () => {
    expect(getEmptyValueKeyPathAfter('filters: \n', 'filters: ')).toEqual(['filters']);
    expect(getEmptyValueKeyPathAfter('summaries:\n  Mean: \n', 'Mean: ')).toEqual(['summaries', 'Mean']);
    expect(getEmptyValueKeyPathAfter('views:\n  - type: table\n    name: \n', 'name: ')).toEqual(['views', '#', 'name']);
  });

  test('not without a space after the colon or dash', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title:\n', 'Title:')).toBeNull();
    expect(getEmptyValueKeyPathAfter('filters:\n  and:\n    -\n', '-')).toBeNull();
  });

  test('not in a value that has text', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: f\n', 'Title: f')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: file.name \n', 'file.name ')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: "f"\n', '"f')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: |\n    file.name \n', 'file.name ')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: 1 - \n', '1 - ')).toBeNull();
  });

  test('not after the closing quote, on a key, or where a key would go', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: ""\n', '""')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: file.name\n', 'Ti')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: file.name\n  \n', 'file.name\n  ')).toBeNull();
  });

  test('not on a block scalar\'s | line, or on a line indented no further than its key', () => {
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: |\n', '|')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: | \n    file.name\n', '| ')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: |\n', '|\n')).toBeNull();
    expect(getEmptyValueKeyPathAfter('formulas:\n  Title: |\n  ', '|\n  ')).toBeNull();
  });

  test('not on a key or list item whose value starts on the next line', () => {
    expect(getEmptyValueKeyPathAfter('filters: \n  and:\n    - file.name\n', 'filters: ')).toBeNull();
    expect(getEmptyValueKeyPathAfter('views:\n  - \n    type: table\n', '- ')).toBeNull();
  });
});
