/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  EditorView,
} from '@codemirror/view';

/* PLUGIN */
import { getVisibleTextBounds } from 'src/EditorExtensions/scrollMargins';
import type { TextBounds } from 'src/EditorExtensions/scrollMargins';

/* ============================================================ */

const NO_SCROLL_X_CLASS = 'mod-no-scroll-x';
// Obsidian doesn't open a sidebar if a swipe's first move comes later than this after the touch starts
const SWIPE_FIRST_MOVE_LIMIT_MS = 200;

/**
 * Lets a horizontal swipe that starts outside the editor open a sidebar, as in a Markdown view. For `touchstart` events.
 *
 * @remarks
 * Obsidian opens a sidebar on a horizontal swipe unless the touched element can scroll horizontally.
 * With line wrapping off, the editor's scroller can, so every swipe would scroll the text instead.
 * When a touch outside the text first moves sideways, soon enough for Obsidian to open a sidebar, horizontal
 * scrolling is turned off until the touch ends. Obsidian decides on that same first move, by the same rules.
 * Other touches leave the scroller unchanged: on iOS, changing its `overflow` while the text is scrolled sideways
 * stops the touch from scrolling.
 *
 * @param editor - The editor.
 * @param evt - The `touchstart` event.
 */
export function handleTouchEditorScroll(editor: EditorView, evt: TouchEvent): void {
  const startTouch: Touch | undefined = evt.touches[0];
  if (editor == null || evt.touches.length !== 1 || startTouch == null) {
    return;
  }

  const scrollerEl: HTMLElement = editor.scrollDOM;
  const canScrollHorizontally: boolean = scrollerEl.scrollWidth > scrollerEl.clientWidth;
  if (!canScrollHorizontally || isTouchInsideEditor(editor, evt)) {
    return;
  }

  const startX: number = startTouch.clientX;
  const startY: number = startTouch.clientY;
  const startTime: number = Date.now();
  const win: Window = scrollerEl.win;

  // Runs before Obsidian's `touchmove` listener on the window, which reads the scroller's `overflow-x`
  const onFirstMove = (moveEvt: TouchEvent): void => {
    scrollerEl.removeEventListener('touchmove', onFirstMove);

    // Too late for Obsidian to open a sidebar, so the touch scrolls as usual
    if (Date.now() - startTime > SWIPE_FIRST_MOVE_LIMIT_MS) {
      return;
    }

    const touch: Touch | undefined = moveEvt.touches[0];
    if (touch == null) {
      return;
    }

    // Same rule as Obsidian's swipe: the larger distance from the start decides the direction
    const isSideways: boolean = Math.abs(touch.clientX - startX) > Math.abs(touch.clientY - startY);
    if (isSideways) {
      scrollerEl.addClass(NO_SCROLL_X_CLASS);
    }
  };

  const onTouchEnd = (endEvt: TouchEvent): void => {
    if (endEvt.touches.length > 0) {
      return;
    }
    scrollerEl.removeEventListener('touchmove', onFirstMove);
    scrollerEl.removeClass(NO_SCROLL_X_CLASS);
    win.removeEventListener('touchend', onTouchEnd);
    win.removeEventListener('touchcancel', onTouchEnd);
  };

  scrollerEl.addEventListener('touchmove', onFirstMove, { passive: true });
  win.addEventListener('touchend', onTouchEnd);
  win.addEventListener('touchcancel', onTouchEnd);
}

/**
 * Returns whether a touch occurred within the editor.
 *
 * @param editor - The editor.
 * @param evt - The touch event.
 * @returns `true` if the touch was within the editor.
 */
function isTouchInsideEditor(editor: EditorView, evt: TouchEvent): boolean {
  const targetNode: Node | null = evt.targetNode;
  const lineEl: Element | null = targetNode?.instanceOf(Element) === true ? targetNode.closest('.cm-line') : null;
  if (lineEl == null || !editor.contentDOM.contains(lineEl)) {
    return false;
  }

  const textBounds: TextBounds = getVisibleTextBounds(editor);
  const touchX: number = evt.touches[0]?.clientX ?? Number.NaN;
  return touchX >= textBounds.left && touchX <= textBounds.right;
}
