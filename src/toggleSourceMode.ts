/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  FileView,
  TFile
} from 'obsidian';

/* PLUGIN */
import {
  VIEW_TYPE_BASES,
  VIEW_TYPE_BASES_SOURCE
} from 'src/BaseSourceView';

/* ============================================================ */

/**
 * Switches a `.base` file between the Bases view and the Base Source view.
 *
 * @param view - A Bases or Base Source view.
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
