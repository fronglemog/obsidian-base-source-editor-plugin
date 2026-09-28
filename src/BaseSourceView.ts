/* ========================= IMPORTS ========================= */
import {
  TextFileView
} from 'obsidian';

import type {
  IconName,
  WorkspaceLeaf
} from 'obsidian';

import {
  Compartment,
  EditorState,
  Transaction
} from '@codemirror/state';

import type { Extension } from '@codemirror/state';

import {
  EditorView,
  keymap,
  lineNumbers
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