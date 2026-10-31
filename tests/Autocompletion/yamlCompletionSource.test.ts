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
  autocompletion,
  CompletionContext,
  completionStatus,
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
import type { KeyInsertSettings } from 'src/Autocompletion/keyInserts';
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

/** The default settings for picked keys: "Key and next line", and the suggestions open after a key. */
const KEY_AND_NEXT_LINE_SETTINGS: KeyInsertSettings = { keyInsert: 'keyAndNextLine', suggestAfterKey: true };

/** The start of a view, with its type and name, for the keys typed after it. */
const VIEW: string = 'views:\n  - type: table\n    name: All\n';

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
 * The Bases core plugin counts as turned off, so views have no options.
 *
 * @returns The app.
 */
function createApp(): App {
  return {
    internalPlugins: {
      getEnabledPluginById: (): null => null
    },
    metadataTypeManager: {
      getAllProperties: () => ({ 'film - year': { name: 'film - year', widget: 'number' } }),
      getTypeInfo: () => ({ expected: { type: 'number', icon: 'lucide-binary' } })
    }
  } as unknown as App;
}

/**
 * Creates the completion source, with stand-ins for Obsidian.
 *
 * @param settings - The settings for picked keys.
 * @returns The completion source.
 */
function createCompletionSource(settings: KeyInsertSettings): CompletionSource {
  return createYamlCompletionSource(createApp(), readPropertyType, readSummaryIcon, readPropertyIcon, (): KeyInsertSettings => settings);
}

/**
 * Gets the suggestions at a position in the test document, as on Ctrl+Space.
 *
 * @param state - Editor state of the test document.
 * @param pos - Position to complete at.
 * @param settings - The settings for picked keys.
 * @returns The suggestions.
 */
function getCompletionsAt(state: EditorState, pos: number, settings: KeyInsertSettings = KEY_AND_NEXT_LINE_SETTINGS): CompletionResult {
  const result = createCompletionSource(settings)(new CompletionContext(state, pos, true)) as CompletionResult | null;
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
 * @param settings - The settings for picked keys.
 * @returns The editor state of the document, and the suggestions.
 */
function getCompletionsAtEnd(document: string, settings: KeyInsertSettings = KEY_AND_NEXT_LINE_SETTINGS): { state: EditorState; result: CompletionResult } {
  const state: EditorState = EditorState.create({ doc: document, extensions: yamlLanguage });
  return { state, result: getCompletionsAt(state, document.length, settings) };
}

/**
 * Picks a key suggestion at the end of a document, in a stand-in for the real editor whose state follows what's dispatched to it.
 * The state has CodeMirror's autocompletion, so whether the suggestions are opening again can be read after the pick.
 *
 * @param document - The document.
 * @param label - Label of the key to pick.
 * @param settings - The settings for picked keys.
 * @returns The document after the pick, and CodeMirror's completion status: `'pending'` while suggestions are being asked for.
 */
function pickKeyAtEnd(document: string, label: string, settings: KeyInsertSettings): { doc: string; status: string | null } {
  const completionSource: CompletionSource = createCompletionSource(settings);
  let state: EditorState = EditorState.create({ doc: document, extensions: [yamlLanguage, autocompletion({ override: [completionSource] })] });

  const result = completionSource(new CompletionContext(state, document.length, true)) as CompletionResult | null;
  const completion: Completion | undefined = result?.options.find((option: Completion): boolean => option.label === label);
  if (result == null || completion == null || typeof completion.apply !== 'function') {
    throw new TypeError(`Expected a key "${label}" with an insert function.`);
  }

  const view: EditorView = {
    get state(): EditorState {
      return state;
    },
    dispatch: (...specs: TransactionSpec[]): void => {
      state = state.update(...specs).state;
    }
  } as unknown as EditorView;

  completion.apply(view, completion, result.from, result.to ?? document.length);
  return { doc: state.doc.toString(), status: completionStatus(state) };
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

  test('a key under properties: inserted in full; it holds the property\'s settings, on a new line', () => {
    const { state, result } = getCompletionsAtEnd(`properties:\n  fi`);
    expect(pickCompletion(state, result, 'note.film - year')).toBe('properties:\n  note.film - year:\n    ');
  });

  test('a key under properties, with "Key only": inserted in full, with its colon', () => {
    const { state, result } = getCompletionsAtEnd(`properties:\n  fi`, { keyInsert: 'keyOnly', suggestAfterKey: true });
    expect(pickCompletion(state, result, 'note.film - year')).toBe('properties:\n  note.film - year: ');
  });

  test('a key in a view\'s summaries: the view\'s columns, inserted short, with its colon', () => {
    const { state, result } = getCompletionsAtEnd(`${view}    order:\n      - film - year\n    summaries:\n      `);
    expect(result.options.map((option: Completion): string => option.label)).toEqual(['film - year']);
    expect(pickCompletion(state, result, 'film - year').endsWith('    summaries:\n      film - year: ')).toBe(true);
  });
});

describe('createYamlCompletionSource: picked keys', () => {
  test('"Key and next line": a list gets a new line with "- "', () => {
    expect(pickKeyAtEnd('vi', 'views', KEY_AND_NEXT_LINE_SETTINGS).doc).toBe('views:\n  - ');
    expect(pickKeyAtEnd(`${VIEW}    so`, 'sort', KEY_AND_NEXT_LINE_SETTINGS).doc).toBe(`${VIEW}    sort:\n      - `);
  });

  test('"Key and next line": other keys get a new, indented line', () => {
    expect(pickKeyAtEnd(`${VIEW}    gr`, 'groupBy', KEY_AND_NEXT_LINE_SETTINGS).doc).toBe(`${VIEW}    groupBy:\n      `);
  });

  test('"Key and next line": a single value gets ": "', () => {
    expect(pickKeyAtEnd('views:\n  - ty', 'type', KEY_AND_NEXT_LINE_SETTINGS).doc).toBe('views:\n  - type: ');
  });

  test('"Key only": every key gets ": "', () => {
    expect(pickKeyAtEnd('vi', 'views', { keyInsert: 'keyOnly', suggestAfterKey: true }).doc).toBe('views: ');
    expect(pickKeyAtEnd(`${VIEW}    gr`, 'groupBy', { keyInsert: 'keyOnly', suggestAfterKey: true }).doc).toBe(`${VIEW}    groupBy: `);
  });

  test('"Suggest what comes after a key": the suggestions open after the pick only while it\'s on, in both modes', () => {
    expect(pickKeyAtEnd('vi', 'views', KEY_AND_NEXT_LINE_SETTINGS).status).toBe('pending');
    expect(pickKeyAtEnd('vi', 'views', { keyInsert: 'keyOnly', suggestAfterKey: true }).status).toBe('pending');
    expect(pickKeyAtEnd('vi', 'views', { keyInsert: 'keyAndNextLine', suggestAfterKey: false }).status).toBeNull();
  });

  test('renaming a key replaces only its name', () => {
    const document: string = `${VIEW}    gr: x\n`;
    const state: EditorState = EditorState.create({ doc: document, extensions: yamlLanguage });
    const result: CompletionResult = getCompletionsAt(state, document.indexOf('gr: x') + 'gr'.length);

    expect(pickTextCompletion(state, result, 'groupBy')).toBe(`${VIEW}    groupBy: x\n`);
  });
});
