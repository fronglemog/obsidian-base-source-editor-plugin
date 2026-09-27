/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
	Plugin,
} from 'obsidian';
import type {
	WorkspaceLeaf,
} from 'obsidian';

/* BASES SOURCE EDITOR */
import { PLUGIN_DEFAULT_SETTINGS } from 'src/Settings/PluginSettings';
import type { PluginSettings } from 'src/Settings/PluginSettings';
import { 
  VIEW_TYPE_BASES_SOURCE,
  BasesSourceView
} from 'src/BaseSourceView/BaseSourceView';

/* ========================= BasesSourceEditorPlugin ========================= */
export default class BasesSourceEditorPlugin extends Plugin {
	declare settings: PluginSettings;

  /* Load plugin */
  override async onload(): Promise<void> {
    /* Register view */
    this.registerView(
      VIEW_TYPE_BASES_SOURCE,
      (leaf: WorkspaceLeaf) => new BasesSourceView(leaf)
    );

    /* Load plugin settings */
    await this.loadSettings();
  }

  /* Unload plugin */
  override onunload(): void {
    
  }

  /* Load settings */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      PLUGIN_DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  /* Save settings */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}