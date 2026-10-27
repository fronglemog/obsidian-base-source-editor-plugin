/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import type {
  App,
  IconName
} from 'obsidian';

/* CODEMIRROR */
import { CompletionContext } from '@codemirror/autocomplete';

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
 * Gets the suggestions at a position in the test document, as on Ctrl+Space.
 *
 * @param state - Editor state of the test document.
 * @param pos - Position to complete at.
 * @returns The suggestions.
 */
function getCompletionsAt(state: EditorState, pos: number): CompletionResult {
  const completionSource: CompletionSource = createYamlCompletionSource({} as App, readPropertyType, readSummaryIcon);
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

/* ========================= TESTS ========================= */

describe('createYamlCompletionSource', () => {
  test('a summary name is shown and matched without quotes, and inserted with them if it needs them', () => {
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });
    const result: CompletionResult = getCompletionsAt(state, SUMMARY_POSITION);

    expect(result.options.map((option: Completion): string => option.label)).toEqual([
      'Average', 'Empty', 'Filled', 'Filtered mean', 'Max', 'Median', 'Min', 'Range', 'Stddev', 'Sum', 'Unique'
    ]);
    expect(pickCompletion(state, result, 'Filtered mean')).toContain('      price: "Filtered mean"\n');
    expect(pickCompletion(state, result, 'Filled')).toContain('      price: Filled\n');
  });
});
