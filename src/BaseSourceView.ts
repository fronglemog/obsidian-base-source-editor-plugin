/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
  Platform,
  TextFileView
} from 'obsidian';

import type {
  App,
  IconName,
  Menu,
  MenuItem,
  Scope,
  WorkspaceLeaf
} from 'obsidian';

/* CODEMIRROR */
import {
  Compartment,
  EditorState,
  Transaction
} from '@codemirror/state';

import type {
  ChangeSpec,
  Extension
} from '@codemirror/state';

import {
  EditorView,
  keymap,
  lineNumbers
} from '@codemirror/view';

import type {
  Command as CMEditorCommand,
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

/* PLUGIN */
import type BasesSourceEditorPlugin from 'src/main';
import { yamlSyntaxHighlighting } from 'src/BaseYamlLanguage/yamlSyntaxHighlighting';

import {
  BaseSourceSearchBar,
  searchHighlightField
} from 'src/BaseSourceSearchBar';

import { activeLineHighlight } from 'src/EditorExtensions/activeLine';
import { getIndentationGuidesExtensions } from 'src/EditorExtensions/indentationGuides';
import { getLineWrapExtensions } from 'src/EditorExtensions/lineWrap';
import { getRenderWhitespaceExtensions } from 'src/EditorExtensions/renderWhitespace';
import {
  getAutocompleteExtensions,
  isAutocompleteEnabled
} from 'src/EditorExtensions/autocompleteExtension';

import { getDocumentChange } from 'src/getDocumentChange';
import { handleTouchEditorScroll } from 'src/Mobile/handleTouchEditorScroll';

/* ========================= BaseSourceView ========================= */

export const VIEW_TYPE_BASES = 'bases';
export const VIEW_TYPE_BASES_SOURCE = 'bases-source';
const YAML_INDENT = '  ';

export class BaseSourceView extends TextFileView {
  private plugin: BasesSourceEditorPlugin;

  private editor: EditorView | null = null;
  private lineWrapCompartment: Compartment = new Compartment();
  private indentationGuidesCompartment: Compartment = new Compartment();
  private renderWhitespaceCompartment: Compartment = new Compartment();
  private remeasureCompartment: Compartment = new Compartment();
  private searchBar: BaseSourceSearchBar | null = null;
  private autocompleteCompartment: Compartment = new Compartment();
  private hasAutocomplete: boolean = false;

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
   * Sets the editor's content from the file.
   *
   * @remarks
   * When the file changes outside the editor, only the changed part is replaced,
   * as a remote change that isn't added to the undo history.
   *
   * @param data - File contents.
   * @param clear - Whether a different file was opened, which resets the editor state and its history.
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
    const docChange: ChangeSpec | null = getDocumentChange(currentEditorData, incomingEditorData);

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

  clear(): void {
    this.editor?.setState(this.createEditorState(''));
  }

  override async onOpen(): Promise<void> {
    const app: App = this.plugin.app;

    this.editor = new EditorView({
      state: this.createEditorState(this.data ?? ''),
      parent: this.contentEl
    });

    this.registerEvent(
      app.workspace.on('css-change', () => this.remeasureLayout())
    );

    this.wrapEditorContent(this.editor);
    this.updateBottomPadding();
    this.updateReadableLineWidth();
    this.updateLineWrap();
    this.updateIndentationGuideColour();
    this.updateWhitespaceOpacity();
    this.updateFontSize();

    // While open, the search bar's key bindings take over the view's scope
    this.searchBar = new BaseSourceSearchBar(this.plugin, this.editor, this.contentEl, (scope: Scope | null) => this.applyScope(scope));

    if (Platform.isMobile) {
      const editor: EditorView = this.editor;
      this.registerDomEvent(
        editor.scrollDOM,
        'touchstart',
        (evt) => handleTouchEditorScroll(editor, evt),
        { passive: true }
      );
    }
  }

  /**
   * Replaces the view's scope on Obsidian's keymap, as the Markdown view does for its search.
   *
   * @remarks
   * Setting `this.scope` alone isn't enough: Obsidian doesn't push a view's scope when the view becomes active.
   *
   * @param scope - Scope to push, or `null` to pop the current one.
   */
  private applyScope(scope: Scope | null): void {
    const app: App = this.plugin.app;

    if (scope === this.scope) {
      return;
    }

    if (this.scope != null) {
      app.keymap.popScope(this.scope);
    }
    if (scope != null) {
      app.keymap.pushScope(scope);
    }
    this.scope = scope;
  }

  /**
   * Wraps the editor's content and gutters in the same layout elements as Obsidian's Markdown editor,
   * so Obsidian's editor styles and themes apply.
   *
   * @param editor - The editor.
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

  override onResize(): void {
    super.onResize();
    this.updateBottomPadding();
  }

  /**
   * Returns whether the editor has focus.
   *
   * @returns `true` if the editor has focus.
   */
  hasEditorFocus(): boolean {
    const hasEditorFocus: boolean = this.editor?.hasFocus ?? false;
    return hasEditorFocus;
  }

  /**
   * Runs a CodeMirror command on the editor.
   *
   * @param command - Command to run.
   */
  runEditorCommand(command: CMEditorCommand): void {
    if (this.editor == null) {
      return;
    }
    command(this.editor);
  }

  /**
   * Adds space below the document, so the last line can scroll up to the middle of the view.
   * On mobile, the keyboard's height is included.
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

  override async onClose(): Promise<void> {
    this.applyScope(null);
    this.searchBar = null;

    await super.onClose();
    this.editor?.destroy();
    this.editor = null;

    this.plugin.mobileToolbar?.requestUpdate();
  }

  /**
   * Creates the editor state for a document, with all of the editor's extensions.
   *
   * @param doc - Document text.
   * @returns The editor state.
   */
  private createEditorState(doc: string): EditorState {
    const editorState: EditorState = EditorState.create({
      doc: doc,
      extensions: [
        this.plugin.baseYamlLanguage.getLanguageSupport(),
        yamlSyntaxHighlighting,
        bracketMatching(),
        closeBrackets(),
        this.autocompleteCompartment.of(this.getAutocompleteExtensionsForSettings()),
        lineNumbers(),
        activeLineHighlight,
        history(),
        indentUnit.of(YAML_INDENT),
        this.lineWrapCompartment.of(getLineWrapExtensions(this.plugin.settings.lineWrap)),
        this.indentationGuidesCompartment.of(getIndentationGuidesExtensions(this.plugin.settings.indentationGuides)),
        this.renderWhitespaceCompartment.of(getRenderWhitespaceExtensions(this.plugin.settings.renderWhitespace)),
        this.remeasureCompartment.of([]),
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
   * Requests a save when an editor update changes the document.
   * Remote changes, made by {@link BaseSourceView.setViewData}, are ignored, because they come from the file.
   *
   * @param update - Editor update.
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
   * Applies the "Custom font size" and "Font size" settings.
   */
  updateFontSize(): void {
    const isCustomFontSize: boolean = this.plugin.settings.fontCustomSize;
    const fontSize: number = this.plugin.settings.fontSize;

    this.contentEl.toggleClass('bse-custom-font-size', isCustomFontSize);
    this.contentEl.setCssProps({
      '--bse-font-size': `${fontSize}px`
    });
    this.remeasureLayout();
  }

  /**
   * Makes the editor re-measure its layout after a CSS change it can't detect, such as a new font size.
   *
   * @remarks
   * Reconfiguring a theme forces CodeMirror to re-measure, so an empty theme is swapped in.
   */
  private remeasureLayout(): void {
    this.editor?.dispatch({
      effects: this.remeasureCompartment.reconfigure(EditorView.theme({}))
    });
  }

  /**
   * Applies the "Line wrapping" setting.
   */
  updateLineWrap(): void {
    const shouldLineWrap: boolean = this.plugin.settings.lineWrap;
    this.contentEl.toggleClass('bse-line-wrap', shouldLineWrap);

    this.editor?.dispatch({
      effects: this.lineWrapCompartment.reconfigure(getLineWrapExtensions(shouldLineWrap))
    });
  }

  /**
   * Applies the "Readable line length" setting, which limits the text to `--file-line-width`.
   */
  updateReadableLineWidth(): void {
    const isReadableLineWidth: boolean = this.plugin.settings.readableLineLength;
    this.contentEl.toggleClass('is-readable-line-width', isReadableLineWidth);
  }

  /**
   * Applies the indentation guide settings.
   */
  updateIndentationGuides(): void {
    this.editor?.dispatch({
      effects: this.indentationGuidesCompartment.reconfigure(getIndentationGuidesExtensions(this.plugin.settings.indentationGuides))
    });
    this.updateIndentationGuideColour();
  }

  /**
   * Applies the custom indentation guide colour and opacity, when "Enable custom indentation guide style" is on.
   */
  private updateIndentationGuideColour(): void {
    const isCustomStyle: boolean = this.plugin.settings.indentationGuideCustomStyle;
    const colour: string = this.plugin.settings.indentationGuideColour;
    const opacity: number = this.plugin.settings.indentationGuideOpacity;

    this.contentEl.toggleClass('bse-custom-indentation-guide-style', isCustomStyle);
    this.contentEl.setCssProps({
      '--bse-indentation-guide-colour': colour,
      '--bse-indentation-guide-opacity': `${opacity}%`
    });
  }

  /**
   * Applies the whitespace rendering settings.
   */
  updateRenderWhitespace(): void {
    this.editor?.dispatch({
      effects: this.renderWhitespaceCompartment.reconfigure(getRenderWhitespaceExtensions(this.plugin.settings.renderWhitespace))
    });
    this.updateWhitespaceOpacity();
  }

  /**
   * Applies the "Whitespace opacity" setting.
   *
   * @remarks
   * The CSS variable is set inline on the view, so it takes priority over values set in CSS snippets.
   */
  private updateWhitespaceOpacity(): void {
    const whitespaceOpacity: number = this.plugin.settings.whitespaceOpacity;
    this.contentEl.setCssProps({
      '--bse-whitespace-opacity': `${whitespaceOpacity}%`
    });
  }

  /**
   * Applies the "Autocomplete" setting.
   *
   * @remarks
   * Only reconfigures when autocomplete is turned on or off: every settings change calls this,
   * and reconfiguring would close an open popup.
   */
  updateAutocomplete(): void {
    if (isAutocompleteEnabled(this.plugin.settings) === this.hasAutocomplete) {
      return;
    }

    this.editor?.dispatch({
      effects: this.autocompleteCompartment.reconfigure(this.getAutocompleteExtensionsForSettings())
    });
  }

  /**
   * Gets the autocomplete extensions for the current settings, and records whether autocomplete is on.
   *
   * @returns The extensions, or none if autocomplete is off.
   */
  private getAutocompleteExtensionsForSettings(): Extension[] {
    this.hasAutocomplete = isAutocompleteEnabled(this.plugin.settings);
    return this.hasAutocomplete ? getAutocompleteExtensions(this.plugin) : [];
  }

  /**
   * Adds "Find..." and "Replace..." to the view's menu.
   *
   * @param menu - The menu.
   * @param source - What opened the menu.
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
   *
   * @remarks
   * Obsidian's "Search current file" command calls this on any active view that has a `showSearch` method.
   *
   * @param replace - Whether to show the replace row.
   */
  showSearch(replace: boolean = false): void {
    this.searchBar?.show(replace);
  }
}
