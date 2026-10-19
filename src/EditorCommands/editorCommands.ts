/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type { SelectionRange } from '@codemirror/state';

import type {
  Command as CMEditorCommand,
  EditorView
} from '@codemirror/view';

/* ========================= EDITOR COMMANDS ========================= */
// CodeMirror versions of Obsidian editor commands that CodeMirror doesn't provide.

/**
 * Closes the on-screen keyboard if the editor has focus, or focuses the editor to open it.
 * Like Obsidian, also clears the selection, so iOS doesn't keep showing the caret and handles.
 *
 * @param view - Editor to toggle.
 * @returns Always true, as the command always applies.
 */
export const toggleKeyboard: CMEditorCommand = (view: EditorView): boolean => {
  if (!view.hasFocus) {
    view.focus();
    return true;
  }

  view.contentDOM.blur();
  view.dom.ownerDocument.getSelection()?.removeAllRanges();
  return true;
};

/**
 * Copies the selected text to the clipboard.
 *
 * @param view - Editor to copy from.
 * @returns Always true, as the command always applies.
 */
export const copySelection: CMEditorCommand = (view: EditorView): boolean => {
  void navigator.clipboard.writeText(getSelectedText(view));
  return true;
};

/**
 * Copies the selected text to the clipboard, then deletes it.
 * Like Obsidian, only deletes once the text is on the clipboard.
 *
 * @param view - Editor to cut from.
 * @returns Always true, as the command always applies.
 */
export const cutSelection: CMEditorCommand = (view: EditorView): boolean => {
  void navigator.clipboard.writeText(getSelectedText(view)).then(() => {
    view.dispatch(view.state.replaceSelection(''), {
      userEvent: 'delete.cut',
      scrollIntoView: true
    });
  });
  return true;
};

/**
 * Replaces the selection with the text on the clipboard.
 *
 * @param view - Editor to paste into.
 * @returns Always true, as the command always applies.
 */
export const pasteClipboard: CMEditorCommand = (view: EditorView): boolean => {
  void navigator.clipboard.readText().then((text: string) => {
    view.dispatch(view.state.replaceSelection(text), {
      userEvent: 'input.paste',
      scrollIntoView: true
    });
  });
  return true;
};

/* ========================= HELPERS ========================= */

/**
 * Gets the text of the editor's selection.
 *
 * @param view - The editor.
 * @returns The selected text, or an empty string if nothing is selected.
 */
function getSelectedText(view: EditorView): string {
  const selection: SelectionRange = view.state.selection.main;
  const selectedText: string = view.state.sliceDoc(selection.from, selection.to);
  return selectedText;
}
