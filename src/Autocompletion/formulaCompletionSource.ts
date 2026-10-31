/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { Platform } from 'obsidian';

/* CODEMIRROR */
import type {
  CompletionContext,
  CompletionResult,
  CompletionSource
} from '@codemirror/autocomplete';

import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/* PLUGIN */
import type { FormulaContext } from 'src/Autocompletion/FormulaContext';

import {
  getQuoteAt,
  getQuotedResult
} from 'src/Autocompletion/quotedInserts';

import type { QuoteCharacter } from 'src/Autocompletion/quotedInserts';

import {
  getEmptyValueKeyPath,
  getYamlKeyPath,
  isFilterGroupPath,
  isFiltersValuePath,
  isFormulaPath
} from 'src/BaseYamlLanguage/yamlKeyPath';

import type { ReadDocumentText } from 'src/BaseYamlLanguage/yamlKeyPath';
import type { BasesFormulaLanguageSupport } from 'src/obsidian-types';
import { logError } from 'src/Util/logError';

/* ============================================================ */

/**
 * Creates the completion source for positions inside formulas, backed by Obsidian's own formula autocomplete.
 *
 * @remarks
 * Before each request, it updates `formulaContext` with the formulas in the document,
 * and selects the summary context if the position is in a summary formula.
 * Inside a quoted YAML string, the completions' inserts are escaped for the quotes.
 * It offers nothing where a formula is the value of a `filters` key itself, which Obsidian's interface never writes.
 *
 * @param languageSupport - Obsidian's formula language support, created with `formulaContext.context`.
 * @param formulaContext - Context that `languageSupport` reads identifiers from.
 * @returns The completion source.
 */
export function createFormulaCompletionSource(languageSupport: BasesFormulaLanguageSupport, formulaContext: FormulaContext): CompletionSource {
  // Log a failed phone workaround once per editor, not on every key press
  let hasCheckedIfPhone: boolean = false;

  const reportPhoneCheckUnchangeable = (error: unknown): void => {
    if (hasCheckedIfPhone === true) {
      return;
    }
    hasCheckedIfPhone = true;

    logError('formula suggestions are not available. Obsidian\'s Platform.isPhone couldn\'t be forced to \'false\'.', error);
  };

  const completionSource: CompletionSource = (context: CompletionContext): CompletionResult | null | Promise<never> => {
    // Obsidian's own interface never writes a formula as the value of `filters`, only a group
    const readDocumentText: ReadDocumentText = (from: number, to: number): string => context.state.sliceDoc(from, to);
    const keyPath: string[] | null = getYamlKeyPath(syntaxTree(context.state).resolve(context.pos, -1), readDocumentText);
    if (keyPath != null && isFiltersValuePath(keyPath) === true) {
      return null;
    }

    // Accessing undocumented API... keep this guard.
    // `update()` creates the mock context, and `autocomplete()` is Obsidian's own source.
    try {
      formulaContext.update(context.state);
      formulaContext.selectContextAt(context.state, context.pos);

      // Obsidian's `autocomplete()` returns nothing on phones. This source only exists on a phone
      // when the "Autocomplete" setting is "Enabled (all devices)", so the phone check is always turned off.
      const result: CompletionResult | null = setIsPhoneFalseAndCall(Platform, (): CompletionResult | null => languageSupport.autocomplete(context), reportPhoneCheckUnchangeable);

      return adaptToQuotes(result, context.state, context.pos);
    } catch (error: unknown) {
      // A rejected promise makes CodeMirror close the popup and log the error.
      // A thrown error would stop CodeMirror asking this source until the cursor moves.
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return completionSource;
}

/**
 * Creates the completion source for an empty formula value, such as `Title: `.
 *
 * @remarks
 * Offers what Obsidian's formula editor shows at an empty formula: everything a formula can start with.
 * Before each request, it updates `formulaContext` and selects the summary context in a summary formula.
 * Inside a quoted YAML string, the completions' inserts are escaped for the quotes.
 *
 * @param languageSupport - Obsidian's formula language support, created with `formulaContext.context`.
 * @param formulaContext - Context that `languageSupport` reads identifiers from.
 * @returns The completion source.
 */
export function createEmptyFormulaCompletionSource(languageSupport: BasesFormulaLanguageSupport, formulaContext: FormulaContext): CompletionSource {
  const completionSource: CompletionSource = (context: CompletionContext): CompletionResult | null | Promise<never> => {
    // Only on Ctrl+Space: typing a space after a key shouldn't open every suggestion
    if (context.explicit === false) {
      return null;
    }

    const readDocumentText: ReadDocumentText = (from: number, to: number): string => context.state.sliceDoc(from, to);
    const keyPath: string[] | null = getEmptyValueKeyPath(syntaxTree(context.state), context.pos, readDocumentText);

    if (keyPath == null || isFormulaPath(keyPath) === false || isFilterGroupPath(keyPath) === true || isFiltersValuePath(keyPath) === true) {
      return null;
    }

    // Accessing undocumented API... keep this guard.
    // `update()` creates the mock context, and `expressionCompletions()` is Obsidian's own list.
    try {
      formulaContext.update(context.state);
      formulaContext.selectContextAt(context.state, context.pos);

      const result: CompletionResult = {
        from: context.pos,
        options: languageSupport.expressionCompletions()
      };

      return adaptToQuotes(result, context.state, context.pos);
    } catch (error: unknown) {
      // A rejected promise makes CodeMirror close the popup and log the error.
      // A thrown error would stop CodeMirror asking this source until the cursor moves.
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return completionSource;
}

/**
 * Escapes a completion result's inserts if the cursor is inside a quoted YAML string.
 *
 * @param result - Completion result from Obsidian's formula autocomplete.
 * @param state - Editor state.
 * @param pos - Cursor position.
 * @returns The completion result, wrapped in quotes if the cursor is inside quotes.
 */
function adaptToQuotes(result: CompletionResult | null, state: EditorState, pos: number): CompletionResult | null {
  if (result == null) {
    return null;
  }

  const readDocumentText: ReadDocumentText = (from: number, to: number): string => state.sliceDoc(from, to);
  const quote: QuoteCharacter | null = getQuoteAt(syntaxTree(state), pos, readDocumentText);

  if (quote == null) {
    return result;
  }
  return getQuotedResult(result, quote);
}

/**
 * Runs `fn()` with `platform.isPhone` set to `false`, then restores it to `true`, even if `fn()` throws.
 *
 * @remarks
 * Obsidian's formula `autocomplete()` returns `null` if `Platform.isPhone` returns `true`.
 *
 * @param platform - The {@link Platform} object.
 * @param fn - Synchronous function to call.
 * @param onSetIsPhoneFalseError - Called with the error if {@link Platform.isPhone} can't be overwritten to `false`. `fn()` is still called.
 * @returns What `fn()` returns.
 */
export function setIsPhoneFalseAndCall<T>(platform: typeof Platform, fn: () => T, onSetIsPhoneFalseError: (error: unknown) => void): T {
  if (platform.isPhone === false) {
    return fn();
  }

  try {
    platform.isPhone = false;
  } catch (error: unknown) {
    // Read-only: assigning throws, because modules run in strict mode
    onSetIsPhoneFalseError(error);
    return fn();
  }

  // A setter that ignores the value doesn't throw, so check the value changed
  if (platform.isPhone !== false) {
    onSetIsPhoneFalseError(new Error('Setting isPhone to false had no effect.'));
    return fn();
  }

  try {
    return fn();
  } finally {
    platform.isPhone = true;
  }
}