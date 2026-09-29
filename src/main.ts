/* ========================= IMPORTS ========================= */
import {
  FileView,
	Plugin,
} from 'obsidian';
import type {
  App,
  Command,
	WorkspaceLeaf,
} from 'obsidian';

import { PLUGIN_DEFAULT_SETTINGS } from 'src/Settings/PluginSettings';
import type { PluginSettings } from 'src/Settings/PluginSettings';
import { BasesSourceEditorPluginSettingsTab } from 'src/Settings/SettingsTab';
import { 
  VIEW_TYPE_BASES_SOURCE,
  BaseSourceView
} from 'src/BaseSourceView';
import { ViewActionsManager } from 'src/ViewActionsManager';
import { toggleSourceMode } from 'src/toggleSourceMode';
import { BaseYamlLanguage } from 'src/BaseYamlLanguage/BaseYamlLanguage';

/* ========================= BasesSourceEditorPlugin ========================= */
export default class BasesSourceEditorPlugin extends Plugin {
	declare settings: PluginSettings;

  baseYamlLanguage!: BaseYamlLanguage;

  /* Load plugin */
  override async onload(): Promise<void> {
    /* Load plugin settings */
    await this.loadSettings();

    /* Register settings tab */
    this.addSettingTab(new BasesSourceEditorPluginSettingsTab(this));

    /* Register Base YAML language support */
    this.baseYamlLanguage = new BaseYamlLanguage();

    /* Register view */
    this.registerView(
      VIEW_TYPE_BASES_SOURCE,
      (leaf: WorkspaceLeaf) => new BaseSourceView(this, leaf)
    );

    /* Register commands */
    this.registerPluginCommands();
    this.extendSearchReplaceCommand();

    /* Register view header actions */
    const viewActionsManager = new ViewActionsManager(this);
    viewActionsManager.registerActions();
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
  registerPluginCommands(): void {
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
          toggleSourceMode(activeView);
        }
        return true;
      }
    });
  }

  /**
   * 
   */
  updateBaseSourceViews(): void {
    const app: App = this.app;

    for (const leaf of app.workspace.getLeavesOfType(VIEW_TYPE_BASES_SOURCE)) {
      if (leaf.view instanceof BaseSourceView) {
        leaf.view.updateLineWrap();
        leaf.view.updateReadableLineWidth();
        leaf.view.updateRenderWhitespace();
      }
    }
  }

  /**
   * Patches Obsidian's built-in 'Search & replace in current file' command to support Base Source Editor views.
   */
  private extendSearchReplaceCommand(): void {
    const command: Command | undefined = this.app.commands.findCommand('editor:open-search-replace');
    const originalCheckCallback: Command['checkCallback'] = command?.checkCallback;

    // Accessing undocumented API... keep this guard.
    if (command == null || originalCheckCallback == null) {
      return;
    }

    const extendedCheckCallback = (checking: boolean) => {
      const view: BaseSourceView | null = this.app.workspace.getActiveViewOfType(BaseSourceView);

      if (view == null) {
        return originalCheckCallback(checking);
      }

      if (!checking) {
        view.showSearch(true);
      }
      return true;
    };

    command.checkCallback = extendedCheckCallback;

    this.register(() => {
      if (command.checkCallback === extendedCheckCallback) {
        command.checkCallback = originalCheckCallback;
      }
    });
  }
}