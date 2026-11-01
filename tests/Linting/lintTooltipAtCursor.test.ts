/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* CODEMIRROR */
import { setDiagnostics } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';

import { EditorState } from '@codemirror/state';
import type { Tooltip } from '@codemirror/view';

/* PLUGIN */
import {
  getDiagnosticsAt,
  lintTooltipAtCursorField
} from 'src/Linting/lintTooltipAtCursor';

/* ========================= HELPERS ========================= */

/** A Base with a repeated key: the second `name` runs from 43 to 47. */
const TEXT: string = 'views:\n  - type: table\n    name: Films\n    name: Again\n';

const REPEATED_KEY: Diagnostic = { from: 43, to: 47, severity: 'error', message: 'Map keys must be unique' };

/**
 * Creates an editor state with the cursor tooltip and some errors, the cursor at the start of the text.
 *
 * @param diagnostics - The errors, put in place with the lint package's public `setDiagnostics()`.
 * @returns The state.
 */
function createStateWithErrors(diagnostics: Diagnostic[]): EditorState {
  const state: EditorState = EditorState.create({ doc: TEXT, extensions: [lintTooltipAtCursorField] });
  return state.update(setDiagnostics(state, diagnostics)).state;
}

/**
 * Moves the cursor, as a tap or an arrow key does.
 *
 * @param state - The state.
 * @param position - Where the cursor goes.
 * @returns The new state.
 */
function moveCursor(state: EditorState, position: number): EditorState {
  return state.update({ selection: { anchor: position } }).state;
}

/**
 * Reads the cursor tooltip.
 *
 * @param state - The state.
 * @returns The tooltip, or `null` if none is shown.
 */
function readTooltip(state: EditorState): Tooltip | null {
  return state.field(lintTooltipAtCursorField);
}

/* ========================= TESTS ========================= */

describe('lintTooltipAtCursorField', () => {
  test('moving the cursor into an underline shows the tooltip above it', () => {
    const state: EditorState = createStateWithErrors([REPEATED_KEY]);
    expect(readTooltip(moveCursor(state, 45))).toMatchObject({ pos: 43, end: 47, above: true });
  });

  test('both ends of the underline count', () => {
    const state: EditorState = createStateWithErrors([REPEATED_KEY]);
    expect(readTooltip(moveCursor(state, 43))).not.toBeNull();
    expect(readTooltip(moveCursor(state, 47))).not.toBeNull();
  });

  test('outside the underline, no tooltip', () => {
    const state: EditorState = createStateWithErrors([REPEATED_KEY]);
    expect(readTooltip(moveCursor(state, 42))).toBeNull();
  });

  test('typing hides it', () => {
    const shown: EditorState = moveCursor(createStateWithErrors([REPEATED_KEY]), 45);
    const typed: EditorState = shown.update({ changes: { from: 45, insert: 'x' }, selection: { anchor: 46 } }).state;
    expect(readTooltip(typed)).toBeNull();
  });

  test('leaving hides it, and moving back in shows it again', () => {
    const shown: EditorState = moveCursor(createStateWithErrors([REPEATED_KEY]), 45);
    const left: EditorState = moveCursor(shown, 10);
    expect(readTooltip(left)).toBeNull();
    expect(readTooltip(moveCursor(left, 44))).not.toBeNull();
  });

  test('new errors under a cursor that hasn\'t moved don\'t show it', () => {
    const state: EditorState = moveCursor(EditorState.create({ doc: TEXT, extensions: [lintTooltipAtCursorField] }), 45);
    const linted: EditorState = state.update(setDiagnostics(state, [REPEATED_KEY])).state;
    expect(readTooltip(linted)).toBeNull();
  });

  test('a selection that isn\'t a cursor shows no tooltip', () => {
    const state: EditorState = createStateWithErrors([REPEATED_KEY]);
    expect(readTooltip(state.update({ selection: { anchor: 43, head: 47 } }).state)).toBeNull();
  });
});

describe('getDiagnosticsAt', () => {
  test('lists every error at the position, with the range they cover together', () => {
    const wider: Diagnostic = { from: 39, to: 47, severity: 'error', message: 'Another error' };
    const state: EditorState = createStateWithErrors([REPEATED_KEY, wider]);

    const found = getDiagnosticsAt(state, 45);
    expect(found?.from).toBe(39);
    expect(found?.to).toBe(47);
    const messages: string[] | undefined = found?.diagnostics.map((diagnostic) => diagnostic.message);
    expect(messages).toHaveLength(2);
    expect(messages).toEqual(expect.arrayContaining(['Another error', 'Map keys must be unique']));
  });

  test('no errors at the position gives null', () => {
    expect(getDiagnosticsAt(createStateWithErrors([REPEATED_KEY]), 10)).toBeNull();
  });
});
