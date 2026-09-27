/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
	Plugin,
} from 'obsidian';
import type {
	WorkspaceLeaf,
} from 'obsidian';

/* BASES SOURCE EDITOR */
import type { PluginSettings } from 'src/Settings/PluginSettings';
import { 
  VIEW_TYPE_BASES_SOURCE,
  BasesSourceView
} from 'src/BaseSourceView/BaseSourceView';

/* ========================= BasesSourceEditorPlugin ========================= */
export default class BasesSourceEditorPlugin extends Plugin {
	settings!: PluginSettings;

  /* Load plugin */
  override async onload(): Promise<void> {
    /* Register view */
    this.registerView(
      VIEW_TYPE_BASES_SOURCE,
      (leaf: WorkspaceLeaf) => new BasesSourceView(leaf)
    )
  }

  /* Unload plugin */
  override onunload(): void {
    
  }
}