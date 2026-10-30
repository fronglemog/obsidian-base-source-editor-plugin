/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import { startCompletion } from '@codemirror/autocomplete';

import type {
  Command as CMEditorCommand,
  EditorView
} from '@codemirror/view';

/* ========================= SHOW SUGGESTIONS ========================= */

/** Id of the "Show suggestions" command, without the plugin's id that Obsidian puts in front of it. */
export const SHOW_SUGGESTIONS_COMMAND_ID: string = 'show-suggestions';

/**
 * Opens the suggestions at the cursor, as Ctrl+Space does.
 *
 * @remarks
 * Focuses the editor first if it doesn't have focus. Run from the command palette, the palette still has focus,
 * and CodeMirror closes the suggestions when the editor doesn't have focus.
 * From a hotkey or a mobile toolbar button, the editor already has focus, and isn't focused again:
 * on iOS, focusing it again just after a tap in the editor makes iOS show its edit menu (Paste, Select, …).
 *
 * @param view - The editor.
 * @returns `true` if the suggestions were started, `false` if the editor has no autocomplete.
 */
export const showSuggestions: CMEditorCommand = (view: EditorView): boolean => {
  if (view.hasFocus === false) {
    view.focus();
  }
  return startCompletion(view);
};
