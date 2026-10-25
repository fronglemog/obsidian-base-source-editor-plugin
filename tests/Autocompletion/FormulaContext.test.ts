/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import { NullValue } from 'obsidian';

import type {
  App,
  Value
} from 'obsidian';

/* CODEMIRROR */
import { yamlLanguage } from '@codemirror/lang-yaml';

import {
  EditorState,
  StateField
} from '@codemirror/state';

/* PLUGIN */
import { FormulaContext } from 'src/Autocompletion/FormulaContext';
import type { BasesIdentifierContext } from 'src/obsidian-types';

/* ========================= TEST DATA ========================= */

const DOCUMENT: string = [
  'summaries:',
  '  Mean: values.me',
  'formulas:',
  '  Title: file.name',
  ''
].join('\n');

/* ========================= HELPERS ========================= */

/**
 * Stands in for a mock context class: its only identifier is `note`.
 */
class NoteOnlyMockContext implements BasesIdentifierContext {
  keys(): string[] {
    return ['note'];
  }

  getByIdentifier(): Value {
    return NullValue.value;
  }
}

/**
 * Gets the position right after some text in the test document.
 *
 * @param text - Text to find.
 * @returns The position after its first occurrence.
 */
function getPositionAfter(text: string): number {
  return DOCUMENT.indexOf(text) + text.length;
}

/**
 * Moves the cursor.
 *
 * @param state - Editor state.
 * @param pos - New cursor position.
 * @returns The editor state with the cursor moved.
 */
function moveCursor(state: EditorState, pos: number): EditorState {
  return state.update({ selection: { anchor: pos } }).state;
}

/**
 * Creates a state field that records the context's identifiers each time it updates,
 * as Obsidian's function hint reads the context while the editor state updates.
 *
 * @param formulaContext - Context to read.
 * @param recorded - Receives the identifiers, once per update.
 * @returns The state field.
 */
function createContextReader(formulaContext: FormulaContext, recorded: string[][]): StateField<null> {
  return StateField.define<null>({
    create: (): null => null,
    update: (): null => {
      recorded.push(formulaContext.context.keys());
      return null;
    }
  });
}

/* ========================= TESTS ========================= */

describe('FormulaContext', () => {
  test('selects the summary context inside a summary formula, and the current context elsewhere', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, NoteOnlyMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    formulaContext.selectContextAt(state, getPositionAfter('Mean: values.me'));
    expect(formulaContext.context.keys()).toEqual(['values']);

    formulaContext.selectContextAt(state, getPositionAfter('Title: file.name'));
    expect(formulaContext.context.keys()).toEqual(['note']);
  });

  test('the context selector selects before other state fields read the context', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, NoteOnlyMockContext);
    const recorded: string[][] = [];

    // The reader is listed first, so only the selector's precedence can make the selector update first
    const state: EditorState = EditorState.create({
      doc: DOCUMENT,
      extensions: [
        yamlLanguage,
        createContextReader(formulaContext, recorded),
        formulaContext.createContextSelector()
      ]
    });

    const inSummary: EditorState = moveCursor(state, getPositionAfter('Mean: values.me'));
    moveCursor(inSummary, getPositionAfter('Title: file.name'));

    expect(recorded).toEqual([['values'], ['note']]);
  });
});
