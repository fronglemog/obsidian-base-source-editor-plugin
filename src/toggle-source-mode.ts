/* ========================= IMPORTS ========================= */
import type {
  FileView
} from 'obsidian';

import type BasesSourceEditorPlugin from "src/main";
import { 
  VIEW_TYPE_BASES,
  VIEW_TYPE_BASES_SOURCE
} from 'src/BaseSourceView';

export function toggleSourceMode(plugin: BasesSourceEditorPlugin, view: FileView) {
  const viewType = view.getViewType();

  void view.leaf.setViewState({
    type: viewType === VIEW_TYPE_BASES_SOURCE ? VIEW_TYPE_BASES : VIEW_TYPE_BASES_SOURCE,
    state: {
      file: view.file?.path
    }
  });
}