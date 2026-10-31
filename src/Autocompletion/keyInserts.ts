/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import {
  getIndentUnit,
  indentString
} from '@codemirror/language';

import type { EditorState } from '@codemirror/state';

/* PLUGIN */
import type { KeyValueKind } from 'src/Autocompletion/baseSchema';
import type { AutocompleteKeyInsert } from 'src/Settings/PluginSettings';

/* ========================= KEY INSERTS ========================= */

/**
 * Gets the text inserted for a key picked from the suggestions, by the "When picking a key, insert" setting.
 *
 * @remarks
 * - Key and next line: the key, plus what its value needs. A single value gets `: `.
 *   Other keys get `:` and a new line, indented one level deeper than the key; a list gets the same, plus `- `.
 *   Obsidian saves a Base with lists indented the same way: `views:`, then `  - type: table`.
 * - Key only: the key, plus `: `.
 *
 * @param state - The editor state, for its indent unit.
 * @param key - The key, as it's written in the file.
 * @param keyFrom - Where the key starts, for its column.
 * @param kind - What the key's value holds.
 * @param keyInsert - The setting's value. An unknown value counts as "Key and next line".
 * @returns The text to insert in place of the key being typed.
 */
export function getKeyInsertText(state: EditorState, key: string, keyFrom: number, kind: KeyValueKind, keyInsert: AutocompleteKeyInsert): string {
  if (keyInsert === 'keyOnly' || kind === 'value') {
    return `${key}: `;
  }

  const keyColumn: number = keyFrom - state.doc.lineAt(keyFrom).from;
  const childIndent: string = indentString(state, keyColumn + getIndentUnit(state));
  return kind === 'list' ? `${key}:\n${childIndent}- ` : `${key}:\n${childIndent}`;
}

/* ========================= TYPES ========================= */

/**
 * The settings for keys picked from the suggestions.
 */
export type KeyInsertSettings = {
  /** The "When picking a key, insert" setting. */
  keyInsert: AutocompleteKeyInsert;
  /** The "Suggest what comes after a key" setting: whether the suggestions open by themselves after a key is picked. */
  suggestAfterKey: boolean;
};

/**
 * Reads the settings for keys picked from the suggestions, when a key is picked, so a changed setting applies at once.
 */
export type ReadKeyInsertSettings = () => KeyInsertSettings;
