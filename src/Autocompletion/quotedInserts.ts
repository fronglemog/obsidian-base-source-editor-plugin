/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  Completion,
  CompletionResult
} from '@codemirror/autocomplete';

import {
  ChangeSet,
  EditorSelection
} from '@codemirror/state';

import type {
  ChangeSpec,
  SelectionRange,
  TransactionSpec
} from '@codemirror/state';

import type { EditorView } from '@codemirror/view';

import type {
  SyntaxNode,
  Tree
} from '@lezer/common';

/* PLUGIN */
import type { ReadDocumentText } from 'src/BaseYamlLanguage/yamlKeyPath';
import { logError } from 'src/Util/logError';

/* ============================================================ */

/**
 * A double-quoted string in within a formula, quotes included..
 * Backslash escapes inside it (`\"`, `\\`) are part of the string.
 */
const FORMULA_DOUBLE_QUOTED_STRING: RegExp = /"(?:[^"\\]|\\.)*"/g;
const UNQUOTED_MESSAGE: string = 'a suggestion was inserted without escaping it for the quotes around the formula.';

/**
 * Escapes text for inserting into a quoted YAML string that holds a formula.
 *
 * @remarks
 * Inside double quotes, each double-quoted formula string is first rewritten with single quotes
 * (`"film - title"` becomes `'film - title'`), so ordinary names add no backslashes to the document.
 * Obsidian's formula autocomplete reads the raw document text, and can't work out types after a backslash.
 *
 * @param text - Text to insert.
 * @param quote - Quote character of the YAML string.
 * @returns The escaped text. For `"`, `\` and `"` are escaped with a backslash. For `'`, `'` is doubled.
 */
export function escapeForQuotes(text: string, quote: QuoteCharacter): string {
  if (quote === '"') {
    const singleQuotedText: string = text.replaceAll(FORMULA_DOUBLE_QUOTED_STRING, (match: string): string => toSingleQuotedFormulaString(match));

    // Backslashes first, so the backslashes added before quotes aren't doubled too
    return singleQuotedText.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`);
  }

  return text.replaceAll('\'', '\'\'');
}

/**
 * Rewrites a double-quoted formula string as a single-quoted one with the same value: `"it's"` -\> `'it\'s'`.
 *
 * @remarks
 * Formula strings use backslash escapes, like JavaScript strings.
 *
 * @param doubleQuotedString - The string, including its double quotes.
 * @returns The single-quoted string, or `doubleQuotedString` unchanged if its value can't be read.
 */
function toSingleQuotedFormulaString(doubleQuotedString: string): string {
  // Obsidian writes these with `JSON.stringify()`, so `JSON.parse()` reads them back
  let value: unknown;
  try {
    value = JSON.parse(doubleQuotedString);
  } catch {
    return doubleQuotedString;
  }

  // Always a string here; the check narrows the type for TypeScript
  if (typeof value !== 'string') {
    return doubleQuotedString;
  }

  const escapedValue: string = value.replaceAll('\\', String.raw`\\`).replaceAll('\'', String.raw`\'`);
  return `'${escapedValue}'`;
}

/**
 * Maps a position after an unescaped insert to the matching position after the escaped insert.
 *
 * @remarks
 * Exact unless the position is inside a formula string in the insert.
 * Obsidian's completions only place the cursor at the end of the insert or between a function's brackets.
 *
 * @param pos - Document position after the unescaped insert.
 * @param insertFrom - Where the insert starts.
 * @param insert - The unescaped inserted text.
 * @param quote - Quote character of the YAML string.
 * @returns The position after escaping.
 */
export function mapPositionThroughEscape(pos: number, insertFrom: number, insert: string, quote: QuoteCharacter): number {
  const offset: number = pos - insertFrom;

  // Before the insert: unchanged
  if (offset < 0) {
    return pos;
  }

  // After the insert: moved by the characters escaping adds
  if (offset > insert.length) {
    const addedLength: number = escapeForQuotes(insert, quote).length - insert.length;
    return pos + addedLength;
  }

  // Inside the insert: after the escaped text before it
  return insertFrom + escapeForQuotes(insert.slice(0, offset), quote).length;
}

/**
 * Wraps every completion in a result so its insert is escaped for the surrounding YAML quotes.
 *
 * @param result - Completion result from Obsidian's formula autocomplete.
 * @param quote - Quote character of the YAML string at the cursor.
 * @returns A copy of the result with wrapped completions.
 */
export function getQuotedResult(result: CompletionResult, quote: QuoteCharacter): CompletionResult {
  const options: Completion[] = result.options.map((completion: Completion): Completion => getQuotedCompletion(completion, quote));
  return { ...result, options };
}

/**
 * Wraps a completion so its insert is escaped for the surrounding YAML quotes.
 *
 * @remarks
 * A text insert (`apply` is a string, or absent so `label` is inserted) is escaped directly.
 * An insert function, which all of Obsidian's completions use, is wrapped with {@link applyQuoted}.
 *
 * @param completion - The completion.
 * @param quote - Quote character of the YAML string at the cursor.
 * @returns A copy of the completion with an escaped insert.
 */
export function getQuotedCompletion(completion: Completion, quote: QuoteCharacter): Completion {
  const apply: string | ApplyCompletion | undefined = completion.apply;

  if (typeof apply !== 'function') {
    const text: string = apply ?? completion.label;
    return { ...completion, apply: escapeForQuotes(text, quote) };
  }

  const quotedApply: ApplyCompletion = (view: EditorView, pickedCompletion: Completion, from: number, to: number): void => {
    applyQuoted(apply, quote, view, pickedCompletion, from, to);
  };
  return { ...completion, apply: quotedApply };
}

/**
 * Escapes the insert in a transaction spec created by a completion, and maps its selection to match.
 *
 * @param spec - Transaction spec, as passed to `view.dispatch()`.
 * @param quote - Quote character of the YAML string at the cursor.
 * @returns The escaped spec, or `null` if it isn't a single text insert (the only kind Obsidian's completions create).
 */
export function getQuotedSpec(spec: TransactionSpec, quote: QuoteCharacter): TransactionSpec | null {
  const singleInsert: SingleInsert | null = getSingleInsert(spec.changes);
  if (singleInsert == null) {
    return null;
  }

  const mapPosition = (pos: number): number => mapPositionThroughEscape(pos, singleInsert.from, singleInsert.insert, quote);

  const quotedSpec: TransactionSpec = {
    ...spec,
    changes: {
      from: singleInsert.from,
      to: singleInsert.to,
      insert: escapeForQuotes(singleInsert.insert, quote)
    },
    selection: spec.selection == null ? undefined : getMappedSelection(spec.selection, mapPosition)
  };
  return quotedSpec;
}

/**
 * Applies a completion's insert function, with its insert escaped for the surrounding YAML quotes.
 *
 * @remarks
 * Obsidian's insert function writes to the editor with `view.dispatch()`, so its text can't be escaped beforehand.
 * Instead, it's called with a mock view whose `dispatch()` saves the transaction specs in an array without changing the document.
 * Each saved spec's insert is then escaped and passed to the live view's `dispatch()`.
 * If the function throws, or a spec isn't a single text insert, the completion is inserted unescaped.
 *
 * @param apply - The completion's own insert function.
 * @param quote - Quote character of the YAML string at the cursor.
 * @param view - The editor.
 * @param completion - The picked completion.
 * @param from - Start of the range being replaced.
 * @param to - End of the range being replaced.
 */
function applyQuoted(apply: ApplyCompletion, quote: QuoteCharacter, view: EditorView, completion: Completion, from: number, to: number): void {
  const recordedSpecs: TransactionSpec[] = [];
  const standInView: EditorView = {
    dispatch: (...specs: TransactionSpec[]): void => {
      recordedSpecs.push(...specs);
    }
  } as unknown as EditorView;

  // Accessing undocumented API... keep this guard.
  // Obsidian's insert functions only call `view.dispatch()`; one that needs more of the view throws here
  try {
    apply(standInView, completion, from, to);
  } catch (error: unknown) {
    logError(`${UNQUOTED_MESSAGE} Its insert needs more of the editor than dispatch().`, error);
    apply(view, completion, from, to);
    return;
  }

  const quotedSpecs: TransactionSpec[] = [];
  for (const spec of recordedSpecs) {
    const quotedSpec: TransactionSpec | null = getQuotedSpec(spec, quote);

    if (quotedSpec == null) {
      logError(`${UNQUOTED_MESSAGE} Its insert isn't a single text insert.`);
      for (const recordedSpec of recordedSpecs) {
        view.dispatch(recordedSpec);
      }
      return;
    }
    quotedSpecs.push(quotedSpec);
  }

  // One dispatch per recorded spec, as the insert function made them
  for (const quotedSpec of quotedSpecs) {
    view.dispatch(quotedSpec);
  }
}

/**
 * Reads a transaction's changes as a single text insert.
 *
 * @param changes - The transaction's changes.
 * @returns The insert, or `null` if the changes are anything else.
 */
function getSingleInsert(changes: ChangeSpec | undefined): SingleInsert | null {
  const changesValue: unknown = changes;

  // Obsidian's completions pass an array with one change
  let change: unknown = changesValue;
  if (Array.isArray(changesValue)) {
    change = changesValue.length === 1 ? changesValue[0] : null;
  }

  if (change == null || typeof change !== 'object' || change instanceof ChangeSet) {
    return null;
  }

  const { from, to, insert } = change as { from?: unknown; to?: unknown; insert?: unknown };
  if (typeof from !== 'number' || typeof insert !== 'string') {
    return null;
  }

  return {
    from,
    to: typeof to === 'number' ? to : from,
    insert
  };
}

/**
 * Maps every position in a selection.
 *
 * @param selection - Selection, in either form a transaction spec accepts.
 * @param mapPosition - Returns the new value of a position.
 * @returns The mapped selection, in the same form as `selection`.
 */
function getMappedSelection(selection: SelectionSpec, mapPosition: (pos: number) => number): SelectionSpec {
  if (selection instanceof EditorSelection) {
    const ranges: SelectionRange[] = selection.ranges.map((range: SelectionRange): SelectionRange => {
      return EditorSelection.range(mapPosition(range.anchor), mapPosition(range.head));
    });
    return EditorSelection.create(ranges, selection.mainIndex);
  }

  return {
    anchor: mapPosition(selection.anchor),
    head: selection.head == null ? undefined : mapPosition(selection.head)
  };
}

/**
 * Gets the quote character of the quoted YAML string at a position.
 *
 * @remarks
 * Uses `resolve()`, not `resolveInner()`, so it stops at the YAML string instead of entering the formula tree mounted on it.
 *
 * @param tree - Syntax tree of the document.
 * @param pos - Document position.
 * @param readDocumentText - Reads text from the document.
 * @returns `"` or `'`, or `null` if `pos` isn't between the quotes of a quoted string.
 */
export function getQuoteAt(tree: Tree, pos: number, readDocumentText: ReadDocumentText): QuoteCharacter | null {
  const node: SyntaxNode = tree.resolve(pos, -1);

  // Strictly between the quotes: right after the closing quote, `resolve()` still returns the string
  const isInQuotes: boolean = node.name === 'QuotedLiteral' && pos > node.from && pos < node.to;
  if (isInQuotes === false) {
    return null;
  }

  const quote: string = readDocumentText(node.from, node.from + 1);
  if (quote === '"' || quote === '\'') {
    return quote;
  }
  return null;
}

/**
 * Quote character of a quoted YAML string.
 */
export type QuoteCharacter = '"' | '\'';

/**
 * A completion's insert function, as in CodeMirror's `Completion.apply`.
 */
export type ApplyCompletion = (view: EditorView, completion: Completion, from: number, to: number) => void;

/**
 * A selection, in either form a transaction spec accepts.
 */
type SelectionSpec = EditorSelection | { anchor: number; head?: number };

/**
 * A single text insert, read from a transaction spec.
 */
type SingleInsert = {
  from: number;
  to: number;
  insert: string;
};
