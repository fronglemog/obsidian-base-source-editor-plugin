/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  App,
  BasesOptions,
  BasesPropertyId,
  IconName
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
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Tree } from '@lezer/common';

/* PLUGIN */
import {
  getKeySuggestions,
  getListItemSuggestions,
  getPropertyKeySuggestions,
  getValueSuggestions
} from 'src/Autocompletion/baseSchema';

import type {
  ValueSources,
  ValueSuggestion
} from 'src/Autocompletion/baseSchema';

import {
  getKeyPosition,
  getListItemPosition,
  getPropertyKeyPosition,
  getValuePosition,
  getViewOrder
} from 'src/Autocompletion/cursorContext';

import type {
  KeyPosition,
  ListItemPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

import {
  getViewOptionKeys,
  getViewOptions,
  getViewTypes
} from 'src/Autocompletion/viewRegistrations';

import type { ViewType } from 'src/Autocompletion/viewRegistrations';
import { getPropertyCandidates } from 'src/Autocompletion/propertyIds';

import type {
  PropertyCandidate,
  PropertyType,
  ReadPropertyIcon,
  ReadPropertyType
} from 'src/Autocompletion/propertyIds';

import { getFilePropertyNames } from 'src/Autocompletion/filePropertyNames';
import type { ReadSummaryIcon } from 'src/Autocompletion/summaries';
import { getNoteProperties } from 'src/Autocompletion/vaultProperties';

import {
  getFormulasFromBaseYaml,
  getPropertyDisplayNamesFromBaseYaml,
  getSummariesFromBaseYaml
} from 'src/BaseYamlLanguage/getFormulasFromBaseYaml';

import type { ReadDocumentText } from 'src/BaseYamlLanguage/yamlKeyPath';

/* ============================================================ */

/** Text a key suggestion stays valid for while typing, so CodeMirror filters it instead of asking again. */
const KEY_TEXT: RegExp = /^[A-Za-z]*$/;

/** Text a value suggestion stays valid for while typing: a word or a number. */
const VALUE_TEXT: RegExp = /^[\w.-]*$/;

/** Text a property id suggestion stays valid for while typing: a property id can hold spaces, dots and dashes. */
const PROPERTY_ID_TEXT: RegExp = /^[^#:'"]*$/;

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
 * the view types after `type:`, property ids, and so on.
 *
 * @remarks
 * At a key position, it suggests the keys the mapping can have that aren't there yet. A picked key is inserted with `: `;
 * when renaming an existing key, only its name is replaced. On an empty line or a `- `, it only suggests on Ctrl+Space,
 * so indenting a new line doesn't open the popup.
 *
 * Where a key or a list item is a property id (under `properties`, in a view's `summaries`, `columnSize` and `order`),
 * it suggests property ids, in the form Obsidian writes there; a key is inserted with `: `.
 *
 * At a value position, it suggests the values the key takes, in the order Obsidian lists them.
 * The suggestions are filtered by the text before the cursor, and a picked value replaces the whole value.
 * A value shown without quotes, such as a summary name, is still inserted with them if it needs them.
 * At an empty value, it only suggests on Ctrl+Space, so typing the space after a `:` doesn't open the popup.
 *
 * @param app - The app, for the view types, their options and the vault's properties.
 * @param readPropertyType - Reads a property's type, for summary names and sort direction labels.
 * @param readSummaryIcon - Reads the icon of a summary's result, for summary names.
 * @param readPropertyIcon - Reads the icon of a property's value, for file properties.
 * @returns The completion source.
 */
export function createYamlCompletionSource(
  app: App,
  readPropertyType: ReadPropertyType,
  readSummaryIcon: ReadSummaryIcon,
  readPropertyIcon: ReadPropertyIcon
): CompletionSource {
  const completionSource: CompletionSource = (context: CompletionContext): CompletionResult | null => {
    const tree: Tree = syntaxTree(context.state);
    const readDocumentText: ReadDocumentText = (from: number, to: number): string => context.state.sliceDoc(from, to);
    const state: EditorState = context.state;

    const sources: ValueSources = {
      readViewTypes: (): ViewType[] => getViewTypes(app),
      readViewOptions: (viewType: string): BasesOptions[] => getViewOptions(app, viewType),
      readPropertyType: (propertyId: string): PropertyType => readPropertyType(state, propertyId),
      readCustomSummaries: (): Record<string, string> => getSummariesFromBaseYaml(tree, readDocumentText),
      readSummaryIcon: (propertyId: string, formula: string): IconName => readSummaryIcon(state, propertyId, formula),
      readProperties: (): PropertyCandidate[] => getPropertyCandidates(
        getNoteProperties(app),
        Object.keys(getFormulasFromBaseYaml(tree, readDocumentText)),
        (propertyId: BasesPropertyId): IconName | null => readPropertyIcon(state, propertyId)
      ),
      readDisplayNames: (): Record<string, string> => ({ ...getFilePropertyNames(), ...getPropertyDisplayNamesFromBaseYaml(tree, readDocumentText) })
    };

    return getKeyCompletions(app, context, tree) ?? getPropertyIdCompletions(context, tree, sources) ?? getValueCompletions(context, tree, sources);
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
 * Gets the property id suggestions at the position being completed: a key under `properties`,
 * or in a view's `summaries` or `columnSize`, or an item in a view's `order`.
 *
 * @param context - The completion context.
 * @param tree - Syntax tree of the document.
 * @param sources - Where the properties and display names come from.
 * @returns The property id suggestions, or `null` if the position takes no property id or there's nothing to suggest.
 */
function getPropertyIdCompletions(context: CompletionContext, tree: Tree, sources: ValueSources): CompletionResult | null {
  const keyPosition: KeyPosition | null = getPropertyKeyPosition(tree, context.state.doc, context.pos);
  if (keyPosition != null) {
    const keys: ValueSuggestion[] = getPropertyKeySuggestions(keyPosition, getViewOrder(tree, context.state.doc, context.pos), sources);
    return createPropertyIdResult(context, keyPosition, keys, ': ');
  }

  const itemPosition: ListItemPosition | null = getListItemPosition(tree, context.state.doc, context.pos);
  if (itemPosition != null) {
    return createPropertyIdResult(context, itemPosition, getListItemSuggestions(itemPosition, sources), '');
  }
  return null;
}

/**
 * Creates the completion result for property id suggestions.
 *
 * @param context - The completion context.
 * @param range - Where the property id is typed: from its start to the end of the line, which a pick replaces.
 * @param suggestions - The property ids.
 * @param suffix - Text inserted after a picked property id, such as a key's `: `.
 * @returns The completion result, or `null` if there's nothing to suggest yet.
 */
function createPropertyIdResult(context: CompletionContext, range: { from: number; to: number }, suggestions: ValueSuggestion[], suffix: string): CompletionResult | null {
  // While typing, only once part of a property id is typed
  if (suggestions.length === 0 || (context.explicit === false && context.pos === range.from)) {
    return null;
  }

  // CodeMirror matches what's typed against the label, so the label is the property id without quotes
  const options: Completion[] = suggestions.map((suggestion: ValueSuggestion, index: number): Completion => ({
    label: suggestion.label ?? suggestion.value,
    detail: suggestion.detail,
    type: suggestion.icon,
    sortText: String(index).padStart(SORT_TEXT_DIGITS, '0'),
    apply: `${suggestion.value}${suffix}`
  }));

  return {
    from: range.from,
    to: range.to,
    options,
    validFor: PROPERTY_ID_TEXT
  };
}

/**
 * Gets the value suggestions at the position being completed.
 *
 * @param context - The completion context.
 * @param tree - Syntax tree of the document.
 * @param sources - Where the values come from: Obsidian and the file.
 * @returns The value suggestions, or `null` if the position isn't a value position or there's nothing to suggest.
 */
function getValueCompletions(context: CompletionContext, tree: Tree, sources: ValueSources): CompletionResult | null {
  const position: ValuePosition | null = getValuePosition(tree, context.state.doc, context.pos);
  if (position == null) {
    return null;
  }

  // While typing, only once part of a value is typed
  if (context.explicit === false && context.pos === position.from) {
    return null;
  }

  const values: ValueSuggestion[] = getValueSuggestions(position, sources);
  if (values.length === 0) {
    return null;
  }

  // CodeMirror matches what's typed against the label, so the label is the text shown, not always the text inserted
  const options: Completion[] = values.map((value: ValueSuggestion, index: number): Completion => ({
    label: value.label ?? value.value,
    detail: value.detail,
    type: value.icon,
    sortText: String(index).padStart(SORT_TEXT_DIGITS, '0'),
    apply: (view: EditorView, completion: Completion, from: number, to: number): void => applyValue(view, value.value, completion, from, to)
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
 * @param text - The value as it's written in the file, which may differ from the suggestion's label.
 * @param completion - The picked suggestion.
 * @param from - Start of the value.
 * @param to - The cursor's position.
 */
function applyValue(view: EditorView, text: string, completion: Completion, from: number, to: number): void {
  const position: ValuePosition | null = getValuePosition(syntaxTree(view.state), view.state.doc, to);
  const valueEnd: number = Math.max(to, position?.to ?? to);

  view.dispatch({
    ...insertCompletionText(view.state, text, from, valueEnd),
    annotations: pickedCompletion.of(completion)
  });
}
