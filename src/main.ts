/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
  FileView,
	Plugin,
} from 'obsidian';
import type {
  App,
  TFile,
	WorkspaceLeaf,
} from 'obsidian';

/* BASES SOURCE EDITOR */
import { PLUGIN_DEFAULT_SETTINGS } from 'src/Settings/PluginSettings';
import type { PluginSettings } from 'src/Settings/PluginSettings';
import { 
  VIEW_TYPE_BASES,
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

    /* Register commands */
    this.registerCommands();
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

  /* Register commands */
  registerCommands(): void {
    /* Bases: Toggle source mode */
    this.addCommand({
      id: 'toggle-source-mode',
      name: 'Toggle source mode',
      checkCallback: (checking: boolean): boolean => {
        const app: App = this.app;

        const activeView: FileView | null = app.workspace.getActiveViewOfType(FileView);
        
        if (activeView == null || activeView.file?.extension !== 'base') {
          return false;
        }

        if (!checking) {
          const activeViewType: string = activeView.getViewType();

          void activeView.leaf.setViewState({
            type: activeViewType === VIEW_TYPE_BASES_SOURCE ? 'bases' : VIEW_TYPE_BASES_SOURCE,
            state: {
              file: activeView.file.path
            }
          });
        }
        return true;
      }
    });
  }
}