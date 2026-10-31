/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* CODEMIRROR */
import { EditorState } from '@codemirror/state';

/* PLUGIN */
import { getKeyInsertText } from 'src/Autocompletion/keyInserts';
import type { AutocompleteKeyInsert } from 'src/Settings/PluginSettings';

/* ========================= TEST DATA ========================= */

/** A view's first key, after its `- `, and a key under it: both `ty` and `gr` start at column 4. */
const DOCUMENT: string = 'views:\n  - ty\n    gr';

/** Where `ty` starts, after the `- `. */
const DASH_KEY_FROM: number = DOCUMENT.indexOf('ty');

/** Where `gr` starts. */
const KEY_FROM: number = DOCUMENT.indexOf('gr');

/** Editor state of the test document, with CodeMirror's default indent unit: two spaces, as in the Base Source editor. */
const STATE: EditorState = EditorState.create({ doc: DOCUMENT });

/* ========================= TESTS ========================= */

describe('getKeyInsertText', () => {
  test('a single value: the key and ": ", in both modes', () => {
    expect(getKeyInsertText(STATE, 'type', DASH_KEY_FROM, 'value', 'structure')).toBe('type: ');
    expect(getKeyInsertText(STATE, 'type', DASH_KEY_FROM, 'value', 'colon')).toBe('type: ');
  });

  test('other keys: ":" and a new line, one level deeper than the key', () => {
    expect(getKeyInsertText(STATE, 'groupBy', KEY_FROM, 'mapping', 'structure')).toBe('groupBy:\n      ');
  });

  test('a list: ":" and a new line with "- ", one level deeper than the key', () => {
    expect(getKeyInsertText(STATE, 'sort', KEY_FROM, 'list', 'structure')).toBe('sort:\n      - ');
    expect(getKeyInsertText(STATE, 'views', 0, 'list', 'structure')).toBe('views:\n  - ');
  });

  test('a key after a list item\'s "- " is indented from the key, not the "-"', () => {
    expect(getKeyInsertText(STATE, 'filters', DASH_KEY_FROM, 'mapping', 'structure')).toBe('filters:\n      ');
  });

  test('"Key and colon": the key and ": ", whatever its value holds', () => {
    expect(getKeyInsertText(STATE, 'groupBy', KEY_FROM, 'mapping', 'colon')).toBe('groupBy: ');
    expect(getKeyInsertText(STATE, 'views', 0, 'list', 'colon')).toBe('views: ');
  });

  test('an unknown setting value counts as "Key and value structure"', () => {
    expect(getKeyInsertText(STATE, 'views', 0, 'list', 'only' as AutocompleteKeyInsert)).toBe('views:\n  - ');
  });
});
