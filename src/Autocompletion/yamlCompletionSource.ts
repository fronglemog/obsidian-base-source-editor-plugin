/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  App,
  BasesOptions
} from 'obsidian';

/* CODEMIRROR */
import {
  insertCompletionText,
  pickedCompletion
} from '@codemirror/autocomplete';

import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource
} from '@codemirror/autocomplete';

import { syntaxTree } from '@codemirror/language';
import type { EditorView } from '@codemirror/view';
import type { Tree } from '@lezer/common';

/* PLUGIN */
import {
  getKeySuggestions,
  getValueSuggestions
} from 'src/Autocompletion/baseSchema';

import type { ValueSuggestion } from 'src/Autocompletion/baseSchema';

import {
  getKeyPosition,
  getValuePosition
} from 'src/Autocompletion/cursorContext';

import type {
  KeyPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

import {
  getViewOptionKeys,
  getViewOptions,
  getViewTypes
} from 'src/Autocompletion/viewRegistrations';

import type { ViewType } from 'src/Autocompletion/viewRegistrations';

/* ============================================================ */

/** Text a key suggestion stays valid for while typing, so CodeMirror filters it instead of asking again. */
const KEY_TEXT: RegExp = /^[A-Za-z]*$/;

/** Text a value suggestion stays valid for while typing: a word or a number. */
const VALUE_TEXT: RegExp = /^[\w.-]*$/;

/**
 * How far key suggestions move up among suggestions that match as well, from -99 to 99.
 * Under `filters:` and in a filter list, `and`, `or` and `not` share the popup with formula suggestions,
 * and come first.
 */
const KEY_BOOST: number = 99;

/** Digits in a value suggestion's sort text, which keeps the values in the order Obsidian lists them. */
const SORT_TEXT_DIGITS: number = 4;

/**
 * Creates the completion source for the keys and values of a Base's YAML: `views`, `type`, a view's options,
 * the view types after `type:`, and so on.
 *
 * @remarks
 * At a key position, it suggests the keys the mapping can have that aren't there yet. A picked key is inserted with `: `;
 * when renaming an existing key, only its name is replaced. On an empty line or a `- `, it only suggests on Ctrl+Space,
 * so indenting a new line doesn't open the popup.
 *
 * At a value position, it suggests the values the key takes, in the order Obsidian lists them.
 * The suggestions are filtered by the text before the cursor, and a picked value replaces the whole value.
 * At an empty value, it only suggests on Ctrl+Space, so typing the space after a `:` doesn't open the popup.
 *
 * @param app - The app, for the view types and their options.
 * @returns The completion source.
 */
export function createYamlCompletionSource(app: App): CompletionSource {
  const completionSource: CompletionSource = (context: CompletionContext): CompletionResult | null => {
    const tree: Tree = syntaxTree(context.state);
    return getKeyCompletions(app, context, tree) ?? getValueCompletions(app, context, tree);
  };

  return completionSource;
}

/**
 * Gets the key suggestions at the position being completed.
 *
 * @param app - The app, for the view types' options.
 * @param context - The completion context.
 * @param tree - Syntax tree of the document.
 * @returns The key suggestions, or `null` if the position isn't a key position or there's nothing to suggest.
 */
function getKeyCompletions(app: App, context: CompletionContext, tree: Tree): CompletionResult | null {
  const position: KeyPosition | null = getKeyPosition(tree, context.state.doc, context.pos);
  if (position == null) {
    return null;
  }

  // While typing, only once part of a key is typed
  if (context.explicit === false && context.pos === position.from) {
    return null;
  }

  const keys: string[] = getKeySuggestions(position, (viewType: string): string[] => getViewOptionKeys(app, viewType));
  if (keys.length === 0) {
    return null;
  }

  const options: Completion[] = keys.map((key: string): Completion => ({
    label: key,
    apply: position.isRename === true ? key : `${key}: `,
    boost: KEY_BOOST
  }));

  return {
    from: position.from,
    to: position.to,
    options,
    validFor: KEY_TEXT
  };
}

/**
 * Gets the value suggestions at the position being completed.
 *
 * @param app - The app, for the view types and their options.
 * @param context - The completion context.
 * @param tree - Syntax tree of the document.
 * @returns The value suggestions, or `null` if the position isn't a value position or there's nothing to suggest.
 */
function getValueCompletions(app: App, context: CompletionContext, tree: Tree): CompletionResult | null {
  const position: ValuePosition | null = getValuePosition(tree, context.state.doc, context.pos);
  if (position == null) {
    return null;
  }

  // While typing, only once part of a value is typed
  if (context.explicit === false && context.pos === position.from) {
    return null;
  }

  const values: ValueSuggestion[] = getValueSuggestions(
    position,
    (): ViewType[] => getViewTypes(app),
    (viewType: string): BasesOptions[] => getViewOptions(app, viewType)
  );
  if (values.length === 0) {
    return null;
  }

  const options: Completion[] = values.map((value: ValueSuggestion, index: number): Completion => ({
    label: value.value,
    detail: value.detail,
    type: value.icon,
    sortText: String(index).padStart(SORT_TEXT_DIGITS, '0'),
    apply: applyValue
  }));

  // Ends at the cursor, so the suggestions are filtered by the text before it
  return {
    from: position.from,
    to: context.pos,
    options,
    validFor: VALUE_TEXT
  };
}

/**
 * Inserts a picked value suggestion, replacing the whole value, not only the part before the cursor.
 *
 * @remarks
 * The suggestions end at the cursor, so the rest of the value is found again when one is picked:
 * the document may have changed since the suggestions were made.
 *
 * @param view - The editor view.
 * @param completion - The picked suggestion.
 * @param from - Start of the value.
 * @param to - The cursor's position.
 */
function applyValue(view: EditorView, completion: Completion, from: number, to: number): void {
  const position: ValuePosition | null = getValuePosition(syntaxTree(view.state), view.state.doc, to);
  const valueEnd: number = Math.max(to, position?.to ?? to);

  view.dispatch({
    ...insertCompletionText(view.state, completion.label, from, valueEnd),
    annotations: pickedCompletion.of(completion)
  });
}
