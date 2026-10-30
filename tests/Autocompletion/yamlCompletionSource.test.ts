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
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest';

/* OBSIDIAN */
import type {
  App,
  IconName
} from 'obsidian';

/* CODEMIRROR */
import {
  CompletionContext,
  insertCompletionText
} from '@codemirror/autocomplete';

import type {
  Completion,
  CompletionResult,
  CompletionSource
} from '@codemirror/autocomplete';

import { yamlLanguage } from '@codemirror/lang-yaml';
import { EditorState } from '@codemirror/state';
import type { TransactionSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/* PLUGIN */
import { createYamlCompletionSource } from 'src/Autocompletion/yamlCompletionSource';
import type { PropertyType } from 'src/Autocompletion/propertyIds';

/* ========================= TEST DATA ========================= */

const DOCUMENT: string = [
  'summaries:',
  '  Filtered mean: values.filter(value > 2000).mean()',
  '  "Mean: rounded": values.mean().round()',
  'views:',
  '  - type: table',
  '    name: All',
  '    summaries:',
  '      price: f',
  ''
].join('\n');

/** Position right after `price: f`, where the summary names are suggested. */
const SUMMARY_POSITION: number = DOCUMENT.indexOf('price: f') + 'price: f'.length;

/* ========================= HELPERS ========================= */

/**
 * Stands in for the property type reader: every property is a number.
 *
 * @returns `'number'`.
 */
function readPropertyType(): PropertyType {
  return 'number';
}

/**
 * Stands in for the summary icon reader: every result is a number.
 *
 * @returns The number icon.
 */
function readSummaryIcon(): IconName {
  return 'lucide-binary';
}

/**
 * Stands in for the property icon reader: every file property's value is text.
 *
 * @returns The text icon.
 */
function readPropertyIcon(): IconName {
  return 'lucide-text';
}

/**
 * Stands in for Obsidian's app, with one note property in the vault: `film - year`, a number.
 *
 * @returns The app.
 */
function createApp(): App {
  return {
    metadataTypeManager: {
      getAllProperties: () => ({ 'film - year': { name: 'film - year', widget: 'number' } }),
      getTypeInfo: () => ({ expected: { type: 'number', icon: 'lucide-binary' } })
    }
  } as unknown as App;
}

/**
 * Gets the suggestions at a position in the test document, as on Ctrl+Space.
 *
 * @param state - Editor state of the test document.
 * @param pos - Position to complete at.
 * @returns The suggestions.
 */
function getCompletionsAt(state: EditorState, pos: number): CompletionResult {
  const completionSource: CompletionSource = createYamlCompletionSource(createApp(), readPropertyType, readSummaryIcon, readPropertyIcon);
  const result = completionSource(new CompletionContext(state, pos, true)) as CompletionResult | null;
  if (result == null) {
    throw new Error('Expected suggestions.');
  }
  return result;
}

/**
 * Picks a suggestion, as CodeMirror does, in a stand-in for the real editor that records what's dispatched to it.
 *
 * @param state - Editor state to pick it in.
 * @param result - The suggestions.
 * @param label - Label of the suggestion to pick.
 * @returns The document after the pick.
 */
function pickCompletion(state: EditorState, result: CompletionResult, label: string): string {
  const completion: Completion | undefined = result.options.find((option: Completion): boolean => option.label === label);
  if (completion == null || typeof completion.apply !== 'function') {
    throw new TypeError(`Expected a suggestion "${label}" with an insert function.`);
  }

  const dispatched: TransactionSpec[] = [];
  const view: EditorView = {
    state,
    dispatch: (...specs: TransactionSpec[]): void => {
      dispatched.push(...specs);
    }
  } as unknown as EditorView;

  completion.apply(view, completion, result.from, result.to ?? SUMMARY_POSITION);
  return state.update(...dispatched).state.doc.toString();
}

/**
 * Picks a suggestion whose insert is its text, as CodeMirror does.
 *
 * @param state - Editor state to pick it in.
 * @param result - The suggestions.
 * @param label - Label of the suggestion to pick.
 * @returns The document after the pick.
 */
function pickTextCompletion(state: EditorState, result: CompletionResult, label: string): string {
  const completion: Completion | undefined = result.options.find((option: Completion): boolean => option.label === label);
  if (completion == null || typeof completion.apply !== 'string') {
    throw new TypeError(`Expected a suggestion "${label}" with an insert text.`);
  }
  return state.update(insertCompletionText(state, completion.apply, result.from, result.to ?? result.from)).state.doc.toString();
}

/**
 * Gets the suggestions at the end of a document, as on Ctrl+Space.
 *
 * @param document - The document.
 * @returns The editor state of the document, and the suggestions.
 */
function getCompletionsAtEnd(document: string): { state: EditorState; result: CompletionResult } {
  const state: EditorState = EditorState.create({ doc: document, extensions: yamlLanguage });
  return { state, result: getCompletionsAt(state, document.length) };
}

/* ========================= TESTS ========================= */

describe('createYamlCompletionSource', () => {
  test('a summary name is shown and matched without quotes, and inserted with them only where Obsidian would write them', () => {
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });
    const result: CompletionResult = getCompletionsAt(state, SUMMARY_POSITION);

    expect(result.options.map((option: Completion): string => option.label)).toEqual([
      'Average', 'Empty', 'Filled', 'Filtered mean', 'Max', 'Mean: rounded', 'Median', 'Min', 'Range', 'Stddev', 'Sum', 'Unique'
    ]);
    expect(pickCompletion(state, result, 'Filtered mean')).toContain('      price: Filtered mean\n');
    expect(pickCompletion(state, result, 'Mean: rounded')).toContain('      price: "Mean: rounded"\n');
    expect(pickCompletion(state, result, 'Filled')).toContain('      price: Filled\n');
  });
});

describe('createYamlCompletionSource: property ids', () => {
  const view: string = 'formulas:\n  Film: file.name\nviews:\n  - type: table\n    name: All\n';

  // Stands in for Obsidian's translations of the file properties' names
  beforeEach(() => {
    vi.stubGlobal('window', { i18next: { exists: (): boolean => true, t: (key: string): string => key } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('an item in a view\'s order: the file properties, the formulas and the vault\'s properties, inserted short', () => {
    const { state, result } = getCompletionsAtEnd(`${view}    order:\n      - fi`);
    const labels: string[] = result.options.map((option: Completion): string => option.label);

    expect(labels).toContain('file.name');
    expect(labels).not.toContain('file.file');
    expect(labels.slice(-2)).toEqual(['formula.Film', 'film - year']);
    expect(pickTextCompletion(state, result, 'film - year').endsWith('      - film - year')).toBe(true);
  });

  test('a key under properties: inserted in full, with its colon', () => {
    const { state, result } = getCompletionsAtEnd(`properties:\n  fi`);
    expect(pickTextCompletion(state, result, 'note.film - year').startsWith('properties:\n  note.film - year: ')).toBe(true);
  });

  test('a key in a view\'s summaries: the view\'s columns, inserted short, with its colon', () => {
    const { state, result } = getCompletionsAtEnd(`${view}    order:\n      - film - year\n    summaries:\n      `);
    expect(result.options.map((option: Completion): string => option.label)).toEqual(['film - year']);
    expect(pickTextCompletion(state, result, 'film - year').endsWith('    summaries:\n      film - year: ')).toBe(true);
  });
});
