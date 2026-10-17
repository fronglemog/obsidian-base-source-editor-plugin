/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  EditorView,
} from '@codemirror/view';


const NO_SCROLL_X_CLASS = 'mod-no-scroll-x';

// Obsidian opens a sidebar on a horizontal swipe, unless the touched element can scroll horizontally.
// With line wrapping off, the scroller can, so every swipe would scroll the text. Like in a markdown view,
// swipes that start outside of the text should open a sidebar, so horizontal scrolling is disabled for them.
/**
 * 
 * @param evt -
 * @returns 
 */
export function handleTouchEditorScroll(editor: EditorView, evt: TouchEvent): void {
  if (editor == null || evt.touches.length !== 1) {
    return;
  }

  const scrollerEl: HTMLElement = editor.scrollDOM;
  const canScrollHorizontally: boolean = scrollerEl.scrollWidth > scrollerEl.clientWidth;
  if (!canScrollHorizontally || isOnText(editor, evt)) {
    return;
  }

  scrollerEl.addClass(NO_SCROLL_X_CLASS);

  const win: Window = scrollerEl.win;
  const onTouchEnd = (endEvt: TouchEvent): void => {
    if (endEvt.touches.length > 0) {
      return;
    }
    scrollerEl.removeClass(NO_SCROLL_X_CLASS);
    win.removeEventListener('touchend', onTouchEnd);
    win.removeEventListener('touchcancel', onTouchEnd);
  };
  win.addEventListener('touchend', onTouchEnd);
  win.addEventListener('touchcancel', onTouchEnd);
}

/**
 * 
 * @param editor -
 * @param evt -
 * @returns 
 */
function isOnText(editor: EditorView, evt: TouchEvent): boolean {
  const targetNode: Node | null = evt.targetNode;
  const lineEl: Element | null = targetNode?.instanceOf(Element) === true ? targetNode.closest('.cm-line') : null;
  if (lineEl == null || !editor.contentDOM.contains(lineEl)) {
    return false;
  }

  const scrollerEl: HTMLElement = editor.scrollDOM;
  const scrollerRect: DOMRect = scrollerEl.getBoundingClientRect();
  const scrollerStyle: CSSStyleDeclaration = getComputedStyle(scrollerEl);
  const guttersEl: HTMLElement | null = scrollerEl.querySelector('.cm-gutters');
  
  // The column is inset from the scroller's padding by the same space on either side
  const contentContainerEl: HTMLElement | null = editor.contentDOM.parentElement;
  const columnInset: number = contentContainerEl == null ? 0 : Number.parseFloat(getComputedStyle(contentContainerEl).marginInlineStart) || 0;

  const textLeft: number = guttersEl?.getBoundingClientRect().right ?? scrollerRect.left + Number.parseFloat(scrollerStyle.paddingLeft) + columnInset;
  const textRight: number = scrollerRect.left + scrollerEl.clientWidth - Number.parseFloat(scrollerStyle.paddingRight) - columnInset;
  const touchX: number = evt.touches[0]?.clientX ?? Number.NaN;
  return touchX >= textLeft && touchX <= textRight;
}