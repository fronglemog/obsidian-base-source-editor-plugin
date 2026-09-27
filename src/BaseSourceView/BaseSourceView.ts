/* ========================= IMPORTS ========================= */
import {
  TextFileView
} from 'obsidian';

import type {
  IconName,
  ViewStateResult,
  WorkspaceLeaf
} from 'obsidian';

/* ========================= BasesSourceEditorPlugin ========================= */

export const VIEW_TYPE_BASES_SOURCE = 'bases-source';

export class BasesSourceView extends TextFileView {

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  override canAcceptExtension(extension: string): boolean {
    const acceptedExtension: string = 'base';
    return extension === acceptedExtension;
  }

  override getDisplayText(): string {
    const displayText: string = 'Bases source';
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
    
  }

  setViewData(data: string, clear: boolean): void {

  }

  override getState(): Record<string, unknown> {
    
  }

  override setState(state: any, result: ViewStateResult): Promise<void> {
    
  }

  clear(): void {

  }

  override onOpen(): Promise<void> {
    
  }

  override onClose(): Promise<void> {

  }
}