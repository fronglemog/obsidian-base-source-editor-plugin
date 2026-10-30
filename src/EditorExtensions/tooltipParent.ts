/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type { Extension } from '@codemirror/state';
import { tooltips } from '@codemirror/view';

/* ========================= TOOLTIP PARENT ========================= */

/**
 * Gets the extension that draws the editor's popups in a window's `<body>`, as Obsidian's Bases formula editors do.
 *
 * @remarks
 * By default, CodeMirror draws popups inside the editor, and the pane around the editor cuts off anything past its edges.
 * Drawn in `<body>`, the suggestions, their info panel and the function hint can reach past the pane.
 * A popout window has its own `<body>`, so the extension is created again when the editor moves to another window.
 *
 * @param doc - Document of the window the editor is in.
 * @returns The extension.
 */
export function getTooltipParentExtensions(doc: Document): Extension {
  return tooltips({ parent: doc.body });
}
