/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  EditorView
} from '@codemirror/view';

/* PLUGIN */
import { logError } from 'src/Util/logError';

import type {
  EditorInputState,
  EditorMouseSelection
} from 'src/obsidian-types';

/* ========================= MOUSE SELECTION SCROLL ========================= */

const UNAVAILABLE_MESSAGE: string = `dragging a selection past the edge of the editor won't scroll it sideways.`;

let hasLoggedUnavailable: boolean = false;

/**
 * Makes a mouse selection scroll the editor sideways when the pointer is dragged past the edge of the text.
 * For `mousedown` events on the editor's content.
 *
 * @remarks
 * CodeMirror scrolls the first parent of the content that is larger inside than its own box. With line wrapping off,
 * that's `.cm-sizer`, which can't scroll, so the editor's scroller is put in its place. When CodeMirror finds nothing,
 * it's left that way, as in a Markdown note. Uses CodeMirror's undocumented input state, and must run after
 * CodeMirror's own `mousedown` listener, which creates the mouse selection.
 *
 * @param editor - The editor.
 */
export function fixMouseSelectionScroll(editor: EditorView): void {
  // Accessing undocumented API... keep this guard.
  const inputState: EditorInputState | undefined = editor.inputState;
  if (inputState == null || !('mouseSelection' in inputState)) {
    logUnavailable(`The editor has no inputState.mouseSelection.`);
    return;
  }

  // Not a left-button press, so no mouse selection started
  const mouseSelection: EditorMouseSelection | null = inputState.mouseSelection;
  if (mouseSelection == null) {
    return;
  }

  // Accessing undocumented API... keep this guard.
  if (mouseSelection.scrollParents == null) {
    logUnavailable(`The mouse selection has no scrollParents.`);
    return;
  }

  // Nothing is wider than the editor, as with line wrapping on, or CodeMirror already picked the scroller
  const scrollTarget: HTMLElement | null = mouseSelection.scrollParents.x;
  if (scrollTarget == null || scrollTarget === editor.scrollDOM) {
    return;
  }

  mouseSelection.scrollParents.x = editor.scrollDOM;
}

/**
 * Logs, once, that a mouse selection's sideways scroll target can't be changed.
 *
 * @param reason - What was missing.
 */
function logUnavailable(reason: string): void {
  if (hasLoggedUnavailable) {
    return;
  }

  hasLoggedUnavailable = true;
  logError(`${UNAVAILABLE_MESSAGE} ${reason}`);
}
