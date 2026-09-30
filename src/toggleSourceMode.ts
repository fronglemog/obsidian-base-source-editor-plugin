/* ========================= IMPORTS ========================= */
import type {
  FileView,
  TFile
} from 'obsidian';

import { 
  VIEW_TYPE_BASES,
  VIEW_TYPE_BASES_SOURCE
} from 'src/BaseSourceView';

/* ======================================================= */

/**
 * 
 * @param view - 
 * @returns 
 */
export function toggleSourceMode(view: FileView) {
  const viewType: string = view.getViewType();

  const file: TFile | null = view.file;
  if (file == null) {
    return;
  }

  void view.leaf.setViewState({
    type: viewType === VIEW_TYPE_BASES_SOURCE ? VIEW_TYPE_BASES : VIEW_TYPE_BASES_SOURCE,
    state: {
      file: file.path
    }
  });
}