/* ========================= IMPORTS ========================= */
import {
  TextFileView
} from 'obsidian';

import type {
  IconName,
  WorkspaceLeaf
} from 'obsidian';

import { EditorState } from '@codemirror/state';
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
    if (this.editor == null) {
      return;
    }

    this.data = data;

    if (clear) {
      this.editor.setState(this.createEditorState(data));
    }
    else {
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: data
        }
      })
    }
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
          if (update.docChanged) {
            this.requestSave();
          }
        })
      ]
    });

    return state;
  }
}