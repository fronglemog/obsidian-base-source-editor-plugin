/* ========================= IMPORTS ========================= */
import {
  TextFileView
} from 'obsidian';

import type {
  IconName,
  WorkspaceLeaf
} from 'obsidian';

import {
  EditorState,
  Transaction
} from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers
} from '@codemirror/view';

import {
  history,
  historyKeymap,
  defaultKeymap
} from '@codemirror/commands';

/* ========================= BasesSourceEditorPlugin ========================= */

export const VIEW_TYPE_BASES = 'bases';
export const VIEW_TYPE_BASES_SOURCE = 'bases-source';

export class BasesSourceView extends TextFileView {

  private editor: EditorView | null = null

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
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

    this.editor.dispatch({
      changes: {
        from: 0,
        to: this.editor.state.doc.length,
        insert: data
      },
      annotations: [
        Transaction.addToHistory.of(false),
        Transaction.remote.of(true)
      ]
    })

  }

  clear(): void {
    this.editor?.setState(this.createEditorState(''));
  }

  override async onOpen(): Promise<void> {
    this.editor = new EditorView({
      state: this.createEditorState(this.data ?? ''),
      parent: this.contentEl
    });
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
        keymap.of([...defaultKeymap, ...historyKeymap]),
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
}