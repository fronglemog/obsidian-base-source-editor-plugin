/* ========================= IMPORTS ========================= */
import {
  ButtonComponent,
  Keymap,
  Scope,
  setIcon,
  setTooltip,
  TextComponent
} from 'obsidian';

import type {
  IconName,
  KeymapContext
} from 'obsidian';

import {
  SearchCursor
} from '@codemirror/search';

import {
  EditorSelection,
  StateEffect,
  StateField
} from '@codemirror/state';

import type {
  ChangeSpec,
  StateEffectType
} from '@codemirror/state';

import {
  Decoration,
  EditorView
} from '@codemirror/view';

import type {
  DecorationSet
} from '@codemirror/view';

import type BasesSourceEditorPlugin from 'src/main';

/* ========================= BaseSourceSearchBar ========================= */

interface SearchMatch {
  from: number;
  to: number;
}

const setSearchHighlights: StateEffectType<SearchMatch[]> = StateEffect.define<SearchMatch[]>();
const searchMatchDecoration: Decoration = Decoration.mark({ class: 'obsidian-search-match-highlight' });

export const searchHighlightField: StateField<DecorationSet> = StateField.define<DecorationSet>({
  create: (): DecorationSet => Decoration.none,

  update(highlights: DecorationSet, tx): DecorationSet {
    let updatedHighlights: DecorationSet = highlights.map(tx.changes);

    for (const effect of tx.effects) {
      if (effect.is(setSearchHighlights)) {
        const ranges = effect.value.map((match: SearchMatch) => searchMatchDecoration.range(match.from, match.to));
        updatedHighlights = Decoration.set(ranges, true);
      }
    }

    return updatedHighlights;
  },

  provide: (field) => EditorView.decorations.from(field)
});

export class BaseSourceSearchBar {
  private plugin: BasesSourceEditorPlugin;

  readonly scope: Scope;
  
  private editor: EditorView;
  private parentEl: HTMLElement;
  private applyScope: (scope: Scope | null) => void;

  private containerEl: HTMLElement;
  private searchInputEl: HTMLInputElement;
  private countEl: HTMLElement;
  private replaceInputEl: HTMLInputElement;
  private caseSensitiveButtonEl: HTMLButtonElement;

  private isActive: boolean = false;
  private isReplace: boolean = false;
  private caseSensitive: boolean = false;
  private currentMatch: SearchMatch | null = null;

  // Where next/previous searches start: the selection when the query was typed, then the current match
  private searchFrom: number = 0;
  private searchTo: number = 0;

  constructor(plugin: BasesSourceEditorPlugin, editor: EditorView, parentEl: HTMLElement, applyScope: (scope: Scope | null) => void) {
    this.plugin = plugin;

    this.editor = editor;
    this.parentEl = parentEl;
    this.applyScope = applyScope;
    this.scope = new Scope(this.plugin.app.scope);

    // Classes are the same as native search for Markdown editors
    this.containerEl = createDiv();
    this.containerEl.addClass('document-search-container');

    // Find
    const searchRowEl: HTMLElement = this.containerEl.createDiv();
    searchRowEl.addClass('document-search');

    const searchInputContainerEl: HTMLElement = searchRowEl.createDiv();
    searchInputContainerEl.addClasses(['search-input-container', 'document-search-input']);

    const searchInput: TextComponent = new TextComponent(searchInputContainerEl);
    searchInput.setPlaceholder('Find...');
    searchInput.onChange(() => this.onSearchInput());
    this.searchInputEl = searchInput.inputEl;

    this.countEl = searchInputContainerEl.createDiv();
    this.countEl.addClass('document-search-count');

    const searchButtonsEl: HTMLElement = searchRowEl.createDiv();
    searchButtonsEl.addClass('document-search-buttons');

    this.createButton(searchButtonsEl, 'lucide-arrow-up', 'Previous\nShift + F3', () => this.findPrevious());
    this.createButton(searchButtonsEl, 'lucide-arrow-down', 'Next\nF3', () => this.findNext());
    // Replaces the native "Find all" button. Same icon and label as the PDF viewer's match case toggle
    const caseSensitiveButton: ButtonComponent = this.createButton(searchButtonsEl, 'uppercase-lowercase-a', 'Match case', () => this.toggleCaseSensitive());
    this.caseSensitiveButtonEl = caseSensitiveButton.buttonEl;
    this.caseSensitiveButtonEl.setAttr('aria-pressed', 'false');

    const closeButtonEl: HTMLElement = searchRowEl.createDiv();
    closeButtonEl.addClasses(['clickable-icon', 'document-search-close-button']);
    setIcon(closeButtonEl, 'lucide-x');
    setTooltip(closeButtonEl, 'Exit search', { placement: 'top' });
    closeButtonEl.addEventListener('click', (evt: MouseEvent) => {
      evt.preventDefault();
      this.hide();
    });

    // Replace - shown by .mod-replace-mode
    const replaceRowEl: HTMLElement = this.containerEl.createDiv();
    replaceRowEl.addClass('document-replace');

    const replaceInput: TextComponent = new TextComponent(replaceRowEl);
    replaceInput.setPlaceholder('Replace...');
    replaceInput.inputEl.addClass('document-replace-input');
    this.replaceInputEl = replaceInput.inputEl;

    const replaceButtonsEl: HTMLElement = replaceRowEl.createDiv();
    replaceButtonsEl.addClass('document-replace-buttons');
    
    this.createButton(replaceButtonsEl, 'lucide-replace', 'Replace\nEnter', () => this.replaceCurrentMatch());
    this.createButton(replaceButtonsEl, 'lucide-replace-all', 'Replace all\nCtrl + Alt + Enter', () => this.replaceAll());

    // Null modifiers and key match every key press, like Obsidian's own scope for hotkeys
    this.scope.register(null, null, (evt: KeyboardEvent, ctx: KeymapContext) => this.handleKeyDown(evt, ctx));
  }

  /**
   * Opens the search bar above the editor, pre-filled with the selected text.
   *
   * @param replace - Whether to show the replace row.
   */
  show(replace: boolean): void {
    this.isActive = true;
    this.isReplace = replace;
    this.containerEl.toggleClass('mod-replace-mode', replace);
    this.parentEl.prepend(this.containerEl);

    const selection = this.editor.state.selection.main;
    if (!selection.empty) {
      this.searchInputEl.value = this.editor.state.sliceDoc(selection.from, selection.to);
    }

    this.searchInputEl.focus();
    this.searchInputEl.select();
    this.applyScope(this.scope);
    this.onSearchInput();
  }

  /**
   * 
   * @returns 
   */
  hide(): void {
    if (!this.isActive) {
      return;
    }
    this.isActive = false;

    // Like the markdown editor, closing from the inputs leaves the current match selected
    if (this.currentMatch != null && this.isInputFocused()) {
      this.editor.dispatch({ selection: EditorSelection.range(this.currentMatch.from, this.currentMatch.to) });
    }

    this.editor.dispatch({ effects: setSearchHighlights.of([]) });
    this.currentMatch = null;
    this.searchInputEl.removeClass('mod-no-match');

    this.containerEl.detach();
    this.searchInputEl.value = '';
    this.applyScope(null);
    this.editor.focus();
  }

  /* ========================= Keys ========================= */

  /**
   * Handles key presses while the search bar is open.
   *
   * @param evt - Key press event.
   * @param ctx - The pressed key. `vkey` is used because `key` is lowercase for letters.
   * @returns false if the key was handled, or undefined to pass it on to Obsidian's hotkeys.
   */
  private handleKeyDown(evt: KeyboardEvent, ctx: KeymapContext): false | undefined {
    // Handle instances where IME (input method editor) is composing - for non-English languages.
    if (evt.isComposing) {
      return undefined;
    }

    // Names of the held modifier keys. 'Mod' is Cmd on macOS and Ctrl elsewhere
    const modifierNames: string[] = [];
    if (Keymap.isModifier(evt, 'Mod')) {
      modifierNames.push('Mod');
    }
    if (evt.altKey) {
      modifierNames.push('Alt');
    }
    if (evt.shiftKey) {
      modifierNames.push('Shift');
    }

    const modifiers: string = modifierNames.join('+');

    // Use `vkey` instead of `key` - Otherwise, held modifier keys will affect the letter casing
    const key: string = ctx.vkey;

    const inputFocused: boolean = this.isInputFocused();

    // Next match: F3 or Mod + G
    if ((modifiers === '' && key === 'F3') || (modifiers === 'Mod' && key === 'G')) {
      this.findNext();
      return false;
    }

    // Previous match: Shift + F3 or Mod + Shift + G
    if ((modifiers === 'Shift' && key === 'F3') || (modifiers === 'Mod+Shift' && key === 'G')) {
      this.findPrevious();
      return false;
    }

    // Close: Escape
    if (modifiers === '' && key === 'Escape') {
      this.hide();
      return false;
    }

    // Enter keys only act while typing in the search bar, so they still reach the editor otherwise

    // Next match or replace: Enter
    if (modifiers === '' && key === 'Enter' && inputFocused) {
      // Like the markdown editor, Enter replaces only from a non-empty replace input
      if (this.replaceInputEl.isActiveElement() && this.replaceInputEl.value !== '') {
        this.replaceCurrentMatch();
      }
      else {
        this.findNext();
      }
      return false;
    }

    // Previous match: Shift + Enter
    if (modifiers === 'Shift' && key === 'Enter' && inputFocused) {
      this.findPrevious();
      return false;
    }

    // Replace all: Mod + Alt + Enter, from the replace input
    if (modifiers === 'Mod+Alt' && key === 'Enter' && this.isReplace && this.replaceInputEl.isActiveElement()) {
      this.replaceAll();
      return false;
    }

    // Switch between the two inputs: Tab or Shift + Tab
    if ((modifiers === '' || modifiers === 'Shift') && key === 'Tab' && this.isReplace && inputFocused) {
      if (this.searchInputEl.isActiveElement()) {
        this.replaceInputEl.focus();
      }
      else {
        this.searchInputEl.focus();
      }
      return false;
    }

    // Not a search bar key, so let Obsidian's hotkeys handle it
    return undefined;
  }

  private isInputFocused(): boolean {
    return this.searchInputEl.isActiveElement() || this.replaceInputEl.isActiveElement();
  }

  /* ========================= Find ========================= */

  /**
   * 
   */
  private onSearchInput(): void {
    const selection = this.editor.state.selection.main;
    this.searchFrom = selection.from;
    this.searchTo = selection.to;

    this.findNext();

    const query: string = this.searchInputEl.value;
    this.searchInputEl.toggleClass('mod-no-match', query !== '' && this.currentMatch == null);
  }

  /**
   * 
   */
  private findNext(): void {
    const matches: SearchMatch[] = this.getMatches();
    const match: SearchMatch | null = matches.find((m: SearchMatch) => m.from >= this.searchTo) ?? matches[0] ?? null;
    this.setCurrentMatch(match, matches);
  }

  /**
   * 
   */
  private findPrevious(): void {
    const matches: SearchMatch[] = this.getMatches();
    const match: SearchMatch | null = matches.findLast((m: SearchMatch) => m.to <= this.searchFrom) ?? matches.at(-1) ?? null;
    this.setCurrentMatch(match, matches);
  }

  /**
   * 
   * @returns 
   */
  private getMatches(): SearchMatch[] {
    const query: string = this.searchInputEl.value;
    if (query === '') {
      return [];
    }

    const doc = this.editor.state.doc;
    const normalize: ((text: string) => string) | undefined = this.caseSensitive ? undefined : (text: string) => text.toLowerCase();
    const cursor: SearchCursor = new SearchCursor(doc, query, 0, doc.length, normalize);

    const matches: SearchMatch[] = [];
    while (!cursor.next().done) {
      matches.push({ from: cursor.value.from, to: cursor.value.to });
    }
    return matches;
  }

  /**
   * 
   * @param match -
   * @param matches -
   */
  private setCurrentMatch(match: SearchMatch | null, matches: SearchMatch[]): void {
    this.currentMatch = match;
    if (match != null) {
      this.searchFrom = match.from;
      this.searchTo = match.to;
    }

    this.highlight(match == null ? [] : [match]);
    this.updateCount(match, matches);
  }

  /**
   * 
   * @param matches -
   */
  private highlight(matches: SearchMatch[]): void {
    const effects: StateEffect<unknown>[] = [setSearchHighlights.of(matches)];

    const firstMatch: SearchMatch | undefined = matches[0];
    if (firstMatch != null) {
      effects.push(EditorView.scrollIntoView(EditorSelection.range(firstMatch.from, firstMatch.to), { y: 'center' }));
    }

    this.editor.dispatch({ effects });
  }

  private updateCount(match: SearchMatch | null, matches: SearchMatch[]): void {
    const index: number = match == null ? 0 : matches.findIndex((m: SearchMatch) => m.from === match.from) + 1;
    const total: number = match == null ? 0 : matches.length;

    this.countEl.toggle(this.searchInputEl.value !== '');
    this.countEl.setText(`${index} / ${total}`);
  }

  /* ========================= Replace ========================= */

  /**
   * 
   * @returns 
   */
  private replaceCurrentMatch(): void {
    const match: SearchMatch | null = this.currentMatch;
    if (match == null) {
      return;
    }

    // The document may have been edited since the match was found
    const matchedText: string = this.editor.state.sliceDoc(match.from, match.to);
    if (!this.matchesQuery(matchedText)) {
      this.findNext();
      return;
    }

    const replacement: string = this.replaceInputEl.value;
    this.editor.dispatch({
      changes: { from: match.from, to: match.to, insert: replacement },
      userEvent: 'input.replace'
    });

    // Continue after the inserted text, so a replacement that contains the query isn't matched again
    this.searchTo = match.from + replacement.length;
    this.findNext();
  }

  /**
   * 
   * @returns 
   */
  private replaceAll(): void {
    const replacement: string = this.replaceInputEl.value;
    const changes: ChangeSpec[] = this.getMatches().map((m: SearchMatch) => ({ from: m.from, to: m.to, insert: replacement }));
    if (changes.length === 0) {
      return;
    }

    this.editor.dispatch({ changes, userEvent: 'input.replace.all' });
    this.setCurrentMatch(null, []);
  }

  /**
   * 
   * @param text -
   * @returns 
   */
  private matchesQuery(text: string): boolean {
    const query: string = this.searchInputEl.value;

    if (this.caseSensitive) {
      return text === query;
    }
    return text.toLowerCase() === query.toLowerCase();
  }

  /**
   * 
   * @param parentEl -
   * @param icon -
   * @param tooltip -
   * @param onClick -
   * @returns 
   */
  private createButton(parentEl: HTMLElement, icon: IconName, tooltip: string, onClick: () => void): ButtonComponent {
    const button: ButtonComponent = new ButtonComponent(parentEl);
    button.setIcon(icon);
    button.setTooltip(tooltip, { placement: 'top' });
    button.setClass('clickable-icon');
    button.setClass('document-search-button');
    button.onClick(onClick);

    // Keep focus in the input when a button is clicked
    button.buttonEl.addEventListener('mousedown', (evt: MouseEvent) => evt.preventDefault());

    return button;
  }

  /**
   * 
   */
  private toggleCaseSensitive(): void {
    this.caseSensitive = !this.caseSensitive;
    this.caseSensitiveButtonEl.toggleClass('is-active', this.caseSensitive);
    this.caseSensitiveButtonEl.setAttr('aria-pressed', String(this.caseSensitive));

    // Re-run the search with the new setting
    this.onSearchInput();
  }

}
