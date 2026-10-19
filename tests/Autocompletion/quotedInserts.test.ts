/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test,
  vi
} from 'vitest';

import { pickedCompletion } from '@codemirror/autocomplete';
import type { Completion } from '@codemirror/autocomplete';

import {
  ChangeSet,
  EditorSelection,
  EditorState
} from '@codemirror/state';

import type {
  Annotation,
  TransactionSpec
} from '@codemirror/state';

import type { EditorView } from '@codemirror/view';

import { yamlLanguage } from '@codemirror/lang-yaml';
import { parseMixed } from '@lezer/common';

import type {
  NestedParse,
  Parser,
  SyntaxNodeRef,
  Tree
} from '@lezer/common';

import {
  escapeForQuotes,
  getQuoteAt,
  getQuotedCompletion,
  getQuotedSpec,
  mapPositionThroughEscape
} from 'src/Autocompletion/quotedInserts';

import type { ApplyCompletion } from 'src/Autocompletion/quotedInserts';

/* ========================= TEST DATA ========================= */

const QUOTES_DOCUMENT: string = [
  'formulas:',
  '  Double: "note.a"',
  '  Single: \'note.b\'',
  '  Plain: note.c',
  ''
].join('\n');

/**
 * Parses like the plugin does: a second parser mounted over each quoted string's text, as an overlay.
 * Plain YAML stands in for Obsidian's formula parser.
 */
const OVERLAY_PARSER: Parser = yamlLanguage.parser.configure({
  wrap: parseMixed((node: SyntaxNodeRef): NestedParse | null => {
    if (node.name !== 'QuotedLiteral' || node.to - node.from < 3) {
      return null;
    }
    return {
      parser: yamlLanguage.parser,
      overlay: [{ from: node.from + 1, to: node.to - 1 }]
    };
  })
});

/* ========================= HELPERS ========================= */

/**
 * Makes an insert function that works like Obsidian's (`RX()` in app.js): one dispatch, with the change,
 * the cursor, and the `pickedCompletion` annotation.
 *
 * @param insert - Text to insert.
 * @param cursorOffset - Where to put the cursor, counted from the start of the insert.
 * @returns The insert function.
 */
function createObsidianLikeApply(insert: string, cursorOffset: number): ApplyCompletion {
  const apply: ApplyCompletion = (view: EditorView, completion: Completion, from: number, to: number): void => {
    view.dispatch({
      changes: [{ from, to, insert }],
      selection: EditorSelection.single(from + cursorOffset),
      annotations: pickedCompletion.of(completion)
    });
  };
  return apply;
}

/**
 * Makes a stand-in for the real editor that records what's dispatched to it.
 *
 * @returns The view, and the list its dispatches are recorded in.
 */
function createRecordingView(): { view: EditorView; dispatched: TransactionSpec[] } {
  const dispatched: TransactionSpec[] = [];
  const view: EditorView = {
    state: EditorState.create({ doc: 'x: "ab"' }),
    dispatch: (...specs: TransactionSpec[]): void => {
      dispatched.push(...specs);
    }
  } as unknown as EditorView;

  return { view, dispatched };
}

/**
 * Runs a suggestion's insert function, as CodeMirror does when it's picked.
 *
 * @param completion - The suggestion.
 * @param view - Editor to insert into.
 * @param from - Start of the text it replaces.
 * @param to - End of the text it replaces.
 */
function runApply(completion: Completion, view: EditorView, from: number, to: number): void {
  const apply: string | ApplyCompletion | undefined = completion.apply;
  if (typeof apply !== 'function') {
    throw new TypeError('Expected an insert function.');
  }
  apply(view, completion, from, to);
}

/**
 * An insert function that reads `view.state`, which the stand-in view doesn't have.
 *
 * @param view - Editor to insert into.
 * @param completion - The picked suggestion.
 * @param from - Start of the text it replaces.
 * @param to - End of the text it replaces.
 */
function applyReadingState(view: EditorView, completion: Completion, from: number, to: number): void {
  const insert: string = `"${view.state.sliceDoc(from, to)}"`;
  view.dispatch({ changes: { from, to, insert } });
}

/**
 * Gets the position right after some text in the quotes test document.
 *
 * @param text - Text that appears once in the document.
 * @returns The position after it.
 */
function getPositionAfter(text: string): number {
  return QUOTES_DOCUMENT.indexOf(text) + text.length;
}

/**
 * Reads text from the quotes test document.
 *
 * @param from - Start position.
 * @param to - End position.
 * @returns The text.
 */
function readQuotesDocument(from: number, to: number): string {
  return QUOTES_DOCUMENT.slice(from, to);
}

/* ========================= TESTS ========================= */

describe('escapeForQuotes', () => {
  test('double quotes: formula strings become single-quoted', () => {
    expect(escapeForQuotes('note["film - title"]', '"')).toBe('note[\'film - title\']');
    expect(escapeForQuotes('"film - title"', '"')).toBe('\'film - title\'');
  });

  test('double quotes: escapes what still needs it', () => {
    // A `'` in a name: the formula escape `\'`, then YAML doubles the backslash
    expect(escapeForQuotes('note["it\'s"]', '"')).toBe(String.raw`note['it\\'s']`);
    // A `"` in a name: nothing to escape in a single-quoted formula string, but YAML escapes it
    expect(escapeForQuotes(String.raw`note["a\"b"]`, '"')).toBe(String.raw`note['a\"b']`);
    // A backslash outside a double-quoted formula string: YAML doubles it
    expect(escapeForQuotes(String.raw`'it\'s'`, '"')).toBe(String.raw`'it\\'s'`);
  });

  test('double quotes: leaves other text unchanged', () => {
    expect(escapeForQuotes('if()', '"')).toBe('if()');
    expect(escapeForQuotes('note.title', '"')).toBe('note.title');
  });

  test('single quotes: doubles \'', () => {
    expect(escapeForQuotes('note["it\'s"]', '\'')).toBe('note["it\'\'s"]');
  });

  test('single quotes: leaves double quotes and backslashes unchanged', () => {
    expect(escapeForQuotes(String.raw`a"b\c`, '\'')).toBe(String.raw`a"b\c`);
  });
});

describe('mapPositionThroughEscape', () => {
  // `note["it's"]` (12 characters) inserted at 10, so it ends at 22.
  // Escaped for double quotes, it's `note['it\\'s']` (14 characters), and ends at 24.
  const insert: string = 'note["it\'s"]';

  test('before the insert: unchanged', () => {
    expect(mapPositionThroughEscape(5, 10, insert, '"')).toBe(5);
  });

  test('inside the insert: after the escaped text before it', () => {
    expect(mapPositionThroughEscape(10, 10, insert, '"')).toBe(10);
    // After `note[`: nothing escaped yet
    expect(mapPositionThroughEscape(15, 10, insert, '"')).toBe(15);
    // After `note["it's"`: that string is now `'it\\'s'`, 2 characters longer
    expect(mapPositionThroughEscape(21, 10, insert, '"')).toBe(23);
    // The end
    expect(mapPositionThroughEscape(22, 10, insert, '"')).toBe(24);
  });

  test('after the insert: moved by the characters added', () => {
    expect(mapPositionThroughEscape(30, 10, insert, '"')).toBe(32);
  });

  test('single quotes', () => {
    // `note["it's"]` is 12 characters; escaped, `note["it''s"]` is 13
    expect(mapPositionThroughEscape(12, 0, 'note["it\'s"]', '\'')).toBe(13);
  });
});

describe('getQuotedSpec', () => {
  test('escapes an insert shaped like Obsidian\'s, and moves the cursor', () => {
    const annotation: Annotation<Completion> = pickedCompletion.of({ label: 'a' });
    const spec: TransactionSpec = {
      changes: [{ from: 4, to: 6, insert: 'note["it\'s"]' }],
      selection: EditorSelection.single(16),
      annotations: annotation
    };

    const quotedSpec: TransactionSpec | null = getQuotedSpec(spec, '"');

    expect(quotedSpec?.changes).toEqual({ from: 4, to: 6, insert: String.raw`note['it\\'s']` });
    expect(quotedSpec?.selection).toBeInstanceOf(EditorSelection);
    expect((quotedSpec?.selection as EditorSelection).main.head).toBe(18);
    expect(quotedSpec?.annotations).toBe(annotation);
  });

  test('accepts a single change and an { anchor } selection', () => {
    const spec: TransactionSpec = {
      changes: { from: 0, insert: '"it\'s"' },
      selection: { anchor: 6 }
    };

    const quotedSpec: TransactionSpec | null = getQuotedSpec(spec, '"');

    expect(quotedSpec?.changes).toEqual({ from: 0, to: 0, insert: String.raw`'it\\'s'` });
    expect(quotedSpec?.selection).toEqual({ anchor: 8 });
  });

  test('single quotes', () => {
    const spec: TransactionSpec = { changes: [{ from: 0, to: 0, insert: 'note["it\'s"]' }] };

    expect(getQuotedSpec(spec, '\'')?.changes).toEqual({ from: 0, to: 0, insert: 'note["it\'\'s"]' });
  });

  test('returns null for anything but a single text insert', () => {
    const twoChanges: TransactionSpec = { changes: [{ from: 0, insert: 'a' }, { from: 0, insert: 'b' }] };
    const changeSet: TransactionSpec = { changes: ChangeSet.of({ from: 0, insert: 'a' }, 0) };

    expect(getQuotedSpec(twoChanges, '"')).toBeNull();
    expect(getQuotedSpec(changeSet, '"')).toBeNull();
  });
});

describe('getQuotedCompletion', () => {
  test('insert function: inserts the escaped text, with the cursor and annotation', () => {
    const insert: string = 'note["film - title"]';
    const completion: Completion = { label: 'film - title', apply: createObsidianLikeApply(insert, insert.length) };
    const { view, dispatched } = createRecordingView();

    const quotedCompletion: Completion = getQuotedCompletion(completion, '"');
    runApply(quotedCompletion, view, 10, 15);

    const escaped: string = 'note[\'film - title\']';
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.changes).toEqual({ from: 10, to: 15, insert: escaped });
    expect((dispatched[0]?.selection as EditorSelection).main.head).toBe(10 + escaped.length);
    expect((dispatched[0]?.annotations as Annotation<Completion>).value).toBe(quotedCompletion);
  });

  test('insert function: a function insert keeps its cursor inside the brackets', () => {
    const completion: Completion = { label: 'if()', apply: createObsidianLikeApply('if()', 3) };
    const { view, dispatched } = createRecordingView();

    runApply(getQuotedCompletion(completion, '"'), view, 10, 12);

    expect(dispatched[0]?.changes).toEqual({ from: 10, to: 12, insert: 'if()' });
    expect((dispatched[0]?.selection as EditorSelection).main.head).toBe(13);
  });

  test('text inserts: escapes apply, or the label when there\'s no apply', () => {
    expect(getQuotedCompletion({ label: 'a', apply: '"b"' }, '"').apply).toBe('\'b\'');
    expect(getQuotedCompletion({ label: '"a"' }, '"').apply).toBe('\'a\'');
    expect(getQuotedCompletion({ label: 'it\'s' }, '\'').apply).toBe('it\'\'s');
  });

  test('inserts unchanged, and logs why, if the insert function needs more than dispatch()', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { view, dispatched } = createRecordingView();

    runApply(getQuotedCompletion({ label: 'a', apply: applyReadingState }, '"'), view, 4, 6);

    expect(dispatched).toEqual([{ changes: { from: 4, to: 6, insert: '"ab"' } }]);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  test('inserts unchanged, and logs why, if the insert isn\'t a single text insert', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const recordedSpec: TransactionSpec = { changes: [{ from: 4, insert: '"a"' }, { from: 6, insert: '"b"' }] };
    const apply: ApplyCompletion = (view: EditorView): void => {
      view.dispatch(recordedSpec);
    };
    const { view, dispatched } = createRecordingView();

    runApply(getQuotedCompletion({ label: 'a', apply }, '"'), view, 4, 6);

    expect(dispatched).toEqual([recordedSpec]);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});

describe('getQuoteAt', () => {
  const tree: Tree = OVERLAY_PARSER.parse(QUOTES_DOCUMENT);

  test('inside double quotes', () => {
    expect(getQuoteAt(tree, getPositionAfter('Double: "note.'), readQuotesDocument)).toBe('"');
  });

  test('right after the opening quote', () => {
    expect(getQuoteAt(tree, getPositionAfter('Double: "'), readQuotesDocument)).toBe('"');
  });

  test('right after the closing quote: not inside', () => {
    expect(getQuoteAt(tree, getPositionAfter('"note.a"'), readQuotesDocument)).toBeNull();
  });

  test('inside single quotes', () => {
    expect(getQuoteAt(tree, getPositionAfter('Single: \'note.'), readQuotesDocument)).toBe('\'');
  });

  test('in a plain value: no quotes', () => {
    expect(getQuoteAt(tree, getPositionAfter('Plain: note.'), readQuotesDocument)).toBeNull();
  });
});
