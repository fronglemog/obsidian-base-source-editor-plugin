/* ========================= IMPORTS ========================= */
import {
  Platform,
  TextFileView
} from 'obsidian';

import type {
  IconName,
  Menu,
  MenuItem,
  Scope,
  WorkspaceLeaf
} from 'obsidian';

import {
  Compartment,
  EditorState,
  RangeSet,
  Transaction
} from '@codemirror/state';

import type {
  ChangeSpec,
  Extension,
  Range
} from '@codemirror/state';

import {
  Decoration,
  EditorView,
  GutterMarker,
  gutterLineClass,
  highlightWhitespace,
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
  bracketMatching,
  indentUnit
} from '@codemirror/language';

import {
  closeBrackets,
  closeBracketsKeymap
} from '@codemirror/autocomplete';

import {
  yamlSyntaxHighlighting
} from 'src/BaseYamlLanguage/yamlSyntaxHighlighting';

import {
  BaseSourceSearchBar,
  searchHighlightField
} from 'src/BaseSourceSearchBar';

import type BasesSourceEditorPlugin from 'src/main';


/* ========================= BaseSourceView ========================= */

export const VIEW_TYPE_BASES = 'bases';
export const VIEW_TYPE_BASES_SOURCE = 'bases-source';
const YAML_INDENT = '  ';

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
  private renderWhitespaceCompartment: Compartment = new Compartment();
  private searchBar: BaseSourceSearchBar | null = null;

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

  override getIcon(): IconName {
    const iconName: string = 'code-xml';
    return iconName;
  }

  getViewData(): string {
    const viewData: string = this.editor?.state.doc.toString() ?? this.data;
    return viewData;
  }

  /**
   * Updates the view after file contents change.
   * Handles content changes while preserving undo history.
   *
   * @param data - File contents.
   * @param clear - Whether to reset editor state history.
   */
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

    const currentEditorData: string = this.editor.state.doc.toString();
    const incomingEditorData: string = this.editor.state.toText(data).toString();
    const docChange: ChangeSpec | null = this.getDocumentChange(currentEditorData, incomingEditorData);

    if (docChange == null) {
      return;
    }

    this.editor.dispatch({
      changes: docChange,
      annotations: [
        Transaction.addToHistory.of(false),
        Transaction.remote.of(true)
      ]
    });
  }

  /**
   * Finds a single replacement that transforms the current text into
   * the incoming text, excluding their shared prefix and suffix.
   *
   * @param currentData - The Base Source editor's current document data.
   * @param incomingData - Replacement data, with normalised line endings.
   * @returns The change to apply to the document, or null if `currentData` is the same as `incomingData`.
   */
  private getDocumentChange(currentData: string, incomingData: string): ChangeSpec | null {
    if (currentData === incomingData) {
      return null;
    }

    let changeStart: number = 0;

    const sharedLength: number = Math.min(
      currentData.length,
      incomingData.length
    );

    while (
      changeStart < sharedLength &&
      currentData[changeStart] === incomingData[changeStart]
    ) {
      changeStart++;
    }

    let currentChangeEnd: number = currentData.length;
    let incomingChangeEnd: number = incomingData.length;

    while (
      currentChangeEnd > changeStart &&
      incomingChangeEnd > changeStart &&
      currentData[currentChangeEnd - 1] === incomingData[incomingChangeEnd - 1]
    ) {
      currentChangeEnd--;
      incomingChangeEnd--;
    }

    const replacementData: string = incomingData.slice(changeStart, incomingChangeEnd);

    const documentChange: ChangeSpec = {
      from: changeStart,
      to: currentChangeEnd,
      insert: replacementData
    };

    return documentChange;
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
    this.updateReadableLineWidth();

    // While open, the search bar's key bindings take over the view's scope
    this.searchBar = new BaseSourceSearchBar(this.plugin, this.editor, this.contentEl, (scope: Scope | null) => this.applyScope(scope));

    if (Platform.isMobile) {
      this.registerDomEvent(this.editor.scrollDOM, 'touchstart', (evt) => this.onScrollerTouchStart(evt), { passive: true });
    }
  }

  /**
   * Makes a scope handle key presses, like the markdown view does for its search.
   * Only setting `this.scope` isn't enough, because Obsidian doesn't push a view's scope when it becomes active.
   *
   * @param scope - Scope to push, or null to pop the current one.
   */
  private applyScope(scope: Scope | null): void {
    if (scope === this.scope) {
      return;
    }

    if (this.scope != null) {
      this.app.keymap.popScope(this.scope);
    }
    if (scope != null) {
      this.app.keymap.pushScope(scope);
    }
    this.scope = scope;
  }

  /**
   * Wraps the editor content and gutter in Obsidian's editor layout elements.
   * Uses the class names expected by Obsidian's editor styles and themes.
   *
   * @param editor - Editor whose content should be wrapped.
   */
  private wrapEditorContent(editor: EditorView): void {
    const scrollerEl: HTMLElement = editor.scrollDOM;
    const sizerEl: HTMLElement = scrollerEl.createDiv('cm-sizer');
    const contentContainerEl: HTMLElement = sizerEl.createDiv('cm-contentContainer');
    const guttersEl: HTMLElement | null = scrollerEl.querySelector('.cm-gutters');

    if (guttersEl != null) {
      contentContainerEl.appendChild(guttersEl);
    }

    contentContainerEl.appendChild(editor.contentDOM);
  }

  // Obsidian opens a sidebar on a horizontal swipe, unless the touched element can scroll horizontally.
  // With line wrapping off, the scroller can, so every swipe would scroll the text. Like in a markdown view,
  // swipes that start outside of the text should open a sidebar, so horizontal scrolling is disabled for them.
  /**
   * 
   * @param evt -
   * @returns 
   */
  private onScrollerTouchStart(evt: TouchEvent): void {
    const NO_SCROLL_X_CLASS = 'mod-no-scroll-x';

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

  /**
   * 
   * @param editor -
   * @param evt -
   * @returns 
   */
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
    // The column is inset from the scroller's padding by the same space on either side
    const contentContainerEl: HTMLElement | null = editor.contentDOM.parentElement;
    const columnInset: number = contentContainerEl == null ? 0 : Number.parseFloat(getComputedStyle(contentContainerEl).marginInlineStart) || 0;

    const textLeft: number = guttersEl?.getBoundingClientRect().right ?? scrollerRect.left + Number.parseFloat(scrollerStyle.paddingLeft) + columnInset;
    const textRight: number = scrollerRect.left + scrollerEl.clientWidth - Number.parseFloat(scrollerStyle.paddingRight) - columnInset;
    const touchX: number = evt.touches[0]?.clientX ?? Number.NaN;

    return touchX >= textLeft && touchX <= textRight;
  }

  override onResize(): void {
    super.onResize();
    this.updateBottomPadding();
  }

  /**
   * Adds space below the document so the last line can scroll towards the middle of the view.
   * Accounts for height of the keyboard on mobile.
   */
  private updateBottomPadding(): void {
    if (this.editor == null || this.containerEl.offsetParent == null) {
      return;
    }

    let viewHeight: number = this.containerEl.clientHeight;
    if (Platform.isMobile) {
      const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
      const keyboardHeightValue: string = documentStyle.getPropertyValue('--keyboard-height');

      const keyboardHeight: number = Number.parseFloat(keyboardHeightValue) || 0;
      viewHeight += keyboardHeight;
    }

    const bottomPadding: number = Math.round(viewHeight / 2);

    this.editor.contentDOM.setCssStyles({
      paddingBottom: `${bottomPadding}px`
    });
  }

  /**
   * 
   */
  override async onClose(): Promise<void> {
    this.applyScope(null);
    this.searchBar = null;

    await super.onClose();
    this.editor?.destroy();
    this.editor = null;
  }

  /**
   * 
   * @param doc -
   * @returns 
   */
  private createEditorState(doc: string): EditorState {
    const editorState: EditorState = EditorState.create({
      doc: doc,
      extensions: [
        this.plugin.baseYamlLanguage.getLanguageSupport(),
        yamlSyntaxHighlighting,
        bracketMatching(),
        closeBrackets(),
        lineNumbers(),
        activeLineGutter,
        activeLine,
        history(),
        indentUnit.of(YAML_INDENT),
        this.lineWrapCompartment.of(this.getLineWrapExtensions()),
        this.renderWhitespaceCompartment.of(this.getRenderWhitespaceExtensions()),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab
        ]),
        searchHighlightField,
        EditorView.updateListener.of((update: ViewUpdate) => this.onEditorUpdate(update))
      ]
    });

    return editorState;
  }

  /**
   * Requests a save when an editor update contains a local document change.
   * Transactions marked as remote are ignored to avoid saving changes
   * made outside of the Base Source editor.
   *
   * @param update - Editor update to inspect.
   */
  private onEditorUpdate(update: ViewUpdate): void {
    const hasLocalChange: boolean = update.transactions.some((tx: Transaction): boolean => {
      const documentChanged: boolean = tx.docChanged;
      const isRemoteChange: boolean = tx.annotation(Transaction.remote) === true;

      const isLocalChange: boolean = (documentChanged === true) && (isRemoteChange === false);
      return isLocalChange;
    });

    if (hasLocalChange === true) {
      this.requestSave();
    }
  }

  /**
   * Limits the text to `--file-line-width` when the plugin's "Readable line length" setting is on.
   */
  updateReadableLineWidth(): void {
    const isReadableLineWidth: boolean = this.plugin.settings.readableLineLength;
    this.contentEl.toggleClass('is-readable-line-width', isReadableLineWidth);
  }

  /**
   * 
   * @returns 
   */
  private getLineWrapExtensions(): Extension {
    const lineWrapEnabled: boolean = this.plugin.settings.lineWrap;

    if (lineWrapEnabled === false) {
      return [];
    }

    const extensions: Extension = [
      EditorView.lineWrapping
    ];

    return extensions;
  }

  /**
   * 
   */
  updateLineWrap(): void {
    this.editor?.dispatch({
      effects: this.lineWrapCompartment.reconfigure(this.getLineWrapExtensions())
    });
  }

  /**
   *
   * @returns 
   */
  private getRenderWhitespaceExtensions(): Extension {
    const renderWhitespaceEnabled: boolean = this.plugin.settings.renderWhitespace;

    if (renderWhitespaceEnabled === false) {
      return [];
    }

    const extensions: Extension = [
      highlightWhitespace()
    ];

    return extensions;
  }

  /**
   * 
   */
  updateRenderWhitespace(): void {
    this.editor?.dispatch({
      effects: this.renderWhitespaceCompartment.reconfigure(this.getRenderWhitespaceExtensions())
    });
  }

  /**
   * Adds actions to the Base Source Editor pane menu.
   * 
   * @param menu -
   * @param source -
   */
  override onPaneMenu(menu: Menu, source: string): void {
    super.onPaneMenu(menu, source);

    menu.addItem((item: MenuItem) => {
      item.setSection('find');
      item.setTitle('Find...');
      item.setIcon('lucide-file-search');
      item.onClick(() => this.showSearch(false));
    });

    menu.addItem((item: MenuItem) => {
      item.setSection('find');
      item.setTitle('Replace...');
      item.setIcon('lucide-file-search');
      item.onClick(() => this.showSearch(true));
    });
  }

  /**
   * Opens the search bar. 
   * Obsidian's "Search current file" command calls this on any active view that has a `showSearch` method.
   *
   * @param replace - Whether to show the replace row.
   */
  showSearch(replace: boolean = false): void {
    this.searchBar?.show(replace);
  }
}