/* ========================= IMPORTS ========================= */
import {
  Platform,
  TextFileView
} from 'obsidian';

import type {
  IconName,
  WorkspaceLeaf
} from 'obsidian';

import {
  Compartment,
  EditorState,
  RangeSet,
  Transaction
} from '@codemirror/state';

import type {
  Extension,
  Range
} from '@codemirror/state';

import {
  Decoration,
  EditorView,
  GutterMarker,
  gutterLineClass,
  keymap,
  lineNumbers,
  ViewPlugin
} from '@codemirror/view';

import type {
  DecorationSet,
  ViewUpdate
} from '@codemirror/view';

import {
  history,
  historyKeymap,
  defaultKeymap,
  indentWithTab
} from '@codemirror/commands';

import { 
  indentUnit
} from '@codemirror/language';

import type BasesSourceEditorPlugin from 'src/main';

/* ========================= BasesSourceEditorPlugin ========================= */

export const VIEW_TYPE_BASES = 'bases';
export const VIEW_TYPE_BASES_SOURCE = 'bases-source';
const YAML_INDENT = '  ';
const NO_SCROLL_X_CLASS = 'mod-no-scroll-x';

// Same as the markdown editor: lines with a cursor, and their gutter elements, get the 'cm-active' class
// (CodeMirror's own highlightActiveLine() and highlightActiveLineGutter() use 'cm-activeLine' and 'cm-activeLineGutter' instead, which themes don't target)
const activeLineDecoration: Decoration = Decoration.line({ class: 'cm-active' });

function getActiveLineDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  let lastLineFrom: number = -1;

  for (const range of view.state.selection.ranges) {
    const lineFrom: number = view.lineBlockAt(range.head).from;
    if (lineFrom > lastLineFrom) {
      decorations.push(activeLineDecoration.range(lineFrom));
      lastLineFrom = lineFrom;
    }
  }

  return Decoration.set(decorations);
}

const activeLine: Extension = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = getActiveLineDecorations(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet) {
      this.decorations = getActiveLineDecorations(update.view);
    }
  }
}, {
  decorations: (plugin) => plugin.decorations
});

class ActiveLineGutterMarker extends GutterMarker {
  override elementClass: string = 'cm-active';
}

const activeLineGutterMarker: GutterMarker = new ActiveLineGutterMarker();

const activeLineGutter: Extension = gutterLineClass.compute(['selection'], (state) => {
  const markers: Range<GutterMarker>[] = [];
  let lastLineFrom: number = -1;

  for (const range of state.selection.ranges) {
    const lineFrom: number = state.doc.lineAt(range.head).from;
    if (lineFrom > lastLineFrom) {
      markers.push(activeLineGutterMarker.range(lineFrom));
      lastLineFrom = lineFrom;
    }
  }

  return RangeSet.of(markers);
});

export class BaseSourceView extends TextFileView {

  private plugin: BasesSourceEditorPlugin;
  private editor: EditorView | null = null
  private lineWrapCompartment: Compartment = new Compartment();

  constructor(plugin: BasesSourceEditorPlugin, leaf: WorkspaceLeaf) {
    super(leaf);

    this.plugin = plugin;
  }

  override canAcceptExtension(extension: string): boolean {
    const acceptedExtension: string = 'base';
    return extension === acceptedExtension;
  }

  override getDisplayText(): string {
    const displayText: string = this.file?.basename ?? 'Bases source';
    return displayText;
  }

  getViewType(): string {
    return VIEW_TYPE_BASES_SOURCE;
  }

  override getIcon (): IconName {
    const iconName: string = 'code-xml';
    return iconName;
  }

  getViewData(): string {
    const viewData: string = this.editor?.state.doc.toString() ?? this.data;
    return viewData;
  }

  setViewData(data: string, clear: boolean): void {
    this.data = data;
    
    if (this.editor == null) {
      return;
    }

    // Clear is set, meaning a new file has been opened
    if (clear) {
      this.editor.setState(this.createEditorState(data));
      return;
    }

    const currentEditorData = this.editor.state.doc.toString();
    const incomingEditorData = this.editor.state.toText(data).toString();

    // Don't update the editor's data if the new data is the same as the current data
    if (currentEditorData === incomingEditorData) {
      return;
    }

    // Only replace the section of the current editor data that differs from the incoming data.
    // This ensures scroll position and undo history outside of the changed section is preserved.
    let start: number = 0;
    const maxStart: number = Math.min(currentEditorData.length, incomingEditorData.length);
    while (start < maxStart && currentEditorData[start] === incomingEditorData[start]) {
      start++;
    }

    let endCurrent: number = currentEditorData.length;
    let endIncoming: number = incomingEditorData.length;
    while (
      endCurrent > start &&
      endIncoming > start &&
      currentEditorData[endCurrent - 1] === incomingEditorData[endIncoming - 1]
    ) {
      endCurrent--;
      endIncoming--;
    }

    this.editor.dispatch({
      changes: {
        from: start,
        to: endCurrent,
        insert: incomingEditorData.slice(start, endIncoming)
      },
      annotations: [
        Transaction.addToHistory.of(false),
        Transaction.remote.of(true)
      ]
    });
  }

  clear(): void {
    this.editor?.setState(this.createEditorState(''));
  }

  override async onOpen(): Promise<void> {
    this.editor = new EditorView({
      state: this.createEditorState(this.data ?? ''),
      parent: this.contentEl
    });

    this.wrapEditorContent(this.editor);
    this.updateBottomPadding();

    if (Platform.isMobile) {
      this.registerDomEvent(this.editor.scrollDOM, 'touchstart', (evt) => this.onScrollerTouchStart(evt), { passive: true });
    }
  }

  // Obsidian opens a sidebar on a horizontal swipe, unless the touched element can scroll horizontally.
  // With line wrapping off, the scroller can, so every swipe would scroll the text. Like in a markdown view,
  // swipes that start outside of the text should open a sidebar, so horizontal scrolling is disabled for them.
  private onScrollerTouchStart(evt: TouchEvent): void {
    const editor: EditorView | null = this.editor;
    if (editor == null || evt.touches.length !== 1) {
      return;
    }

    const scrollerEl: HTMLElement = editor.scrollDOM;
    const canScrollHorizontally: boolean = scrollerEl.scrollWidth > scrollerEl.clientWidth;
    if (!canScrollHorizontally || this.isOnText(editor, evt)) {
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

  // Lines that are scrolled sideways sit underneath the gutter and the side margins, so the touched element alone isn't enough
  private isOnText(editor: EditorView, evt: TouchEvent): boolean {
    const targetNode: Node | null = evt.targetNode;
    const lineEl: Element | null = targetNode?.instanceOf(Element) === true ? targetNode.closest('.cm-line') : null;
    if (lineEl == null || !editor.contentDOM.contains(lineEl)) {
      return false;
    }

    const scrollerEl: HTMLElement = editor.scrollDOM;
    const scrollerRect: DOMRect = scrollerEl.getBoundingClientRect();
    const scrollerStyle: CSSStyleDeclaration = getComputedStyle(scrollerEl);
    const guttersEl: HTMLElement | null = scrollerEl.querySelector('.cm-gutters');

    const textLeft: number = guttersEl?.getBoundingClientRect().right ?? scrollerRect.left + Number.parseFloat(scrollerStyle.paddingLeft);
    const textRight: number = scrollerRect.left + scrollerEl.clientWidth - Number.parseFloat(scrollerStyle.paddingRight);
    const touchX: number = evt.touches[0]?.clientX ?? Number.NaN;

    return touchX >= textLeft && touchX <= textRight;
  }

  override onResize(): void {
    super.onResize();
    this.updateBottomPadding();
  }

  // Mirrors the markdown editor, which lets the last line scroll up to the middle of the view
  // (on mobile, this also keeps the last line clear of the floating navbar and the keyboard)
  private updateBottomPadding(): void {
    if (this.editor == null || this.containerEl.offsetParent == null) {
      return;
    }

    let height: number = this.containerEl.clientHeight;
    if (Platform.isMobile) {
      const keyboardHeight: number = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height')) || 0;
      height += keyboardHeight;
    }

    this.editor.contentDOM.setCssStyles({ paddingBottom: `${Math.round(height / 2)}px` });
  }

  private wrapEditorContent(editor: EditorView) {
    const contentContainerEl: HTMLElement = editor.scrollDOM.createDiv('cm-sizer').createDiv('cm-contentContainer');
    const guttersEl: HTMLElement | null = editor.scrollDOM.querySelector('.cm-gutters');
    if (guttersEl != null) {
      contentContainerEl.appendChild(guttersEl);
    }
    contentContainerEl.appendChild(editor.contentDOM);
  }

  override async onClose(): Promise<void> {
    await super.onClose();
    this.editor?.destroy();
    this.editor = null;
  }

  private createEditorState(doc: string): EditorState {
    const state = EditorState.create({
      doc: doc,
      extensions: [
        lineNumbers(),
        activeLineGutter,
        activeLine,
        history(),
        indentUnit.of(YAML_INDENT),
        this.lineWrapCompartment.of(this.getLineWrapExtensions()),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          const hasLocalChange = update.transactions.some((tx) => tx.docChanged && (tx.annotation(Transaction.remote) !== true));
          if (hasLocalChange) {
            this.requestSave();
          }
        })
      ]
    });

    return state;
  }

  updateLineWrap(): void {
    this.editor?.dispatch({
      effects: this.lineWrapCompartment.reconfigure(this.getLineWrapExtensions())
    });
  }

  private getLineWrapExtensions(): Extension {
    const lineWrapEnabled: boolean = this.plugin.settings.lineWrapEnabled;

    if (lineWrapEnabled === false) {
      return [];
    }

    const extensions: Extension = [
      EditorView.lineWrapping
    ];

    return extensions;
  }
}