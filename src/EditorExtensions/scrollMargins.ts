/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  Extension
} from '@codemirror/state';

import {
  EditorView
} from '@codemirror/view';

import type {
  Rect
} from '@codemirror/view';

/* ========================= SCROLL MARGINS ========================= */

/**
 * Keeps the cursor clear of the line numbers and the side margins when the editor scrolls sideways.
 * Dragging a selection also starts scrolling at the edges of the visible text.
 *
 * @remarks
 * With line wrapping off, text scrolls under the scroller's padding, which is painted over so the margins look empty.
 * CodeMirror counts the padding as visible unless scroll margins cover it. CodeMirror keeps the largest margin given
 * for each side, so the left margin includes the line numbers, whose own margin leaves out the padding.
 */
export const textScrollMargins: Extension = EditorView.scrollMargins.of((view: EditorView): Partial<Rect> => {
  const scrollerEl: HTMLElement = view.scrollDOM;
  const scrollerLeft: number = scrollerEl.getBoundingClientRect().left;
  const textBounds: TextBounds = getVisibleTextBounds(view);

  const margins: Partial<Rect> = {
    left: textBounds.left - scrollerLeft,
    right: scrollerLeft + scrollerEl.clientWidth - textBounds.right
  };
  return margins;
});

/**
 * Gets the left and right edges of the area where the editor's text can be seen,
 * between the line numbers and the right margin.
 *
 * @param editor - The editor.
 * @returns The edges, in client coordinates.
 */
export function getVisibleTextBounds(editor: EditorView): TextBounds {
  const scrollerEl: HTMLElement = editor.scrollDOM;
  const scrollerRect: DOMRect = scrollerEl.getBoundingClientRect();
  const scrollerStyle: CSSStyleDeclaration = getComputedStyle(scrollerEl);
  const guttersEl: HTMLElement | null = scrollerEl.querySelector('.cm-gutters');

  // The column is inset from the scroller's padding by the same space on either side
  const contentContainerEl: HTMLElement | null = editor.contentDOM.parentElement;
  const columnInset: number = contentContainerEl == null ? 0 : Number.parseFloat(getComputedStyle(contentContainerEl).marginInlineStart) || 0;

  const textBounds: TextBounds = {
    left: guttersEl?.getBoundingClientRect().right ?? scrollerRect.left + Number.parseFloat(scrollerStyle.paddingLeft) + columnInset,
    right: scrollerRect.left + scrollerEl.clientWidth - Number.parseFloat(scrollerStyle.paddingRight) - columnInset
  };
  return textBounds;
}

/**
 * Left and right edges of the editor's visible text, in client coordinates.
 */
export type TextBounds = {
  left: number;
  right: number;
};
