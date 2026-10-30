/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* CODEMIRROR */
import { autocompletion } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/* PLUGIN */
import { showSuggestions } from 'src/EditorCommands/showSuggestions';

/* ========================= HELPERS ========================= */

/**
 * Creates a stand-in editor view that records, in order, what's called on it.
 *
 * @param state - The editor's state.
 * @param hasFocus - Whether the editor has focus.
 * @param calls - Receives `'focus'` and `'dispatch'` as they're called.
 * @returns The stand-in view.
 */
function createRecordingView(state: EditorState, hasFocus: boolean, calls: string[]): EditorView {
  const view: Pick<EditorView, 'state' | 'hasFocus' | 'focus' | 'dispatch'> = {
    state,
    hasFocus,
    focus: (): void => {
      calls.push('focus');
    },
    dispatch: (): void => {
      calls.push('dispatch');
    }
  };
  return view as EditorView;
}

/* ========================= TESTS ========================= */

describe('showSuggestions', () => {
  test('without focus, as from the command palette: focuses the editor, then starts the suggestions', () => {
    const calls: string[] = [];
    const view: EditorView = createRecordingView(EditorState.create({ extensions: autocompletion() }), false, calls);

    expect(showSuggestions(view)).toBe(true);
    expect(calls).toEqual(['focus', 'dispatch']);
  });

  test('with focus, as from a hotkey or a toolbar button: starts the suggestions without focusing the editor again', () => {
    const calls: string[] = [];
    const view: EditorView = createRecordingView(EditorState.create({ extensions: autocompletion() }), true, calls);

    expect(showSuggestions(view)).toBe(true);
    expect(calls).toEqual(['dispatch']);
  });

  test('without autocomplete in the editor, starts nothing', () => {
    const calls: string[] = [];
    const view: EditorView = createRecordingView(EditorState.create({}), true, calls);

    expect(showSuggestions(view)).toBe(false);
    expect(calls).toEqual([]);
  });
});
