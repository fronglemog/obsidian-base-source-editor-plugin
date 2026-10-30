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
  test,
  vi
} from 'vitest';

/* OBSIDIAN */
import {
  BooleanValue,
  DateValue,
  ListValue,
  NullValue,
  NumberValue
} from 'obsidian';

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
import type {
  BasesIdentifierContext,
  DateValueConstructor
} from 'src/obsidian-types';

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

/** `DateValue`, with the constructor Obsidian's class has but its typings leave out. */
const DateValueClass = DateValue as unknown as DateValueConstructor;

/**
 * Stands in for Obsidian's mock context class: evaluates three properties to values of their own types,
 * and fails to evaluate a fourth. Of the summary formulas, `values.first()` gives the first of the values,
 * and `values.broken()` fails.
 */
class EvaluatingMockContext extends NoteOnlyMockContext {
  evaluateIdent(expression: string): Value {
    switch (expression) {
      // Reads `values` through the context it's called on, as Obsidian's formulas do
      case 'values.first()': {
        const values: Value = (this as BasesIdentifierContext).getByIdentifier('values');
        return values instanceof ListValue ? values.get(0) : NullValue.value;
      }
      case 'values.broken()': {
        throw new Error('Evaluation failed');
      }
      case 'note["price"]': {
        return new NumberValue(3);
      }
      case 'file["ctime"]': {
        return new DateValueClass(new Date(), true);
      }
      case 'note["done"]': {
        return new BooleanValue(true);
      }
      case 'note["broken"]': {
        throw new Error('Evaluation failed');
      }
      default: {
        return NullValue.value;
      }
    }
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

describe('FormulaContext.readPropertyType', () => {
  test('reads a property\'s type by evaluating it', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readPropertyType(state, 'price')).toBe('number');
    expect(formulaContext.readPropertyType(state, 'file.ctime')).toBe('date');
    expect(formulaContext.readPropertyType(state, 'done')).toBe('checkbox');
    expect(formulaContext.readPropertyType(state, 'title')).toBe('other');
  });

  test('every type is other with a context that can\'t evaluate', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, NoteOnlyMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readPropertyType(state, 'price')).toBe('other');
  });

  test('a failed evaluation gives other, and is logged once', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readPropertyType(state, 'broken')).toBe('other');
    expect(formulaContext.readPropertyType(state, 'broken')).toBe('other');
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});

describe('FormulaContext.readSummaryIcon', () => {
  test('the icon of a summary\'s result, worked out with the property\'s value as values', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readSummaryIcon(state, 'price', 'values.first()')).toBe('lucide-binary');
    expect(formulaContext.readSummaryIcon(state, 'file.ctime', 'values.first()')).toBe('lucide-clock');
    expect(formulaContext.readSummaryIcon(state, 'done', 'values.first()')).toBe('lucide-check-square');
  });

  test('no result gives the icon of a summary without a result', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readSummaryIcon(state, 'title', 'values.first()')).toBe('lucide-square-function');
    expect(formulaContext.readSummaryIcon(state, 'price', 'values.unknown()')).toBe('lucide-square-function');
  });

  test('every icon is the one without a result with a context that can\'t evaluate', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, NoteOnlyMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readSummaryIcon(state, 'price', 'values.first()')).toBe('lucide-square-function');
  });

  test('a failed evaluation gives the icon without a result, and is logged once', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readSummaryIcon(state, 'price', 'values.broken()')).toBe('lucide-square-function');
    expect(formulaContext.readSummaryIcon(state, 'price', 'values.broken()')).toBe('lucide-square-function');
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});

describe('FormulaContext.readPropertyIcon', () => {
  test('the icon of a property\'s value', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readPropertyIcon(state, 'file.ctime')).toBe('lucide-clock');
    expect(formulaContext.readPropertyIcon(state, 'price')).toBe('lucide-binary');
    expect(formulaContext.readPropertyIcon(state, 'title')).toBe('lucide-file-question');
  });

  test('no icon with a context that can\'t evaluate', () => {
    const formulaContext: FormulaContext = new FormulaContext({} as App, NoteOnlyMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readPropertyIcon(state, 'file.ctime')).toBeNull();
  });

  test('a failed evaluation gives no icon, and is logged once', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const formulaContext: FormulaContext = new FormulaContext({} as App, EvaluatingMockContext);
    const state: EditorState = EditorState.create({ doc: DOCUMENT, extensions: yamlLanguage });

    expect(formulaContext.readPropertyIcon(state, 'broken')).toBeNull();
    expect(formulaContext.readPropertyIcon(state, 'broken')).toBeNull();
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
