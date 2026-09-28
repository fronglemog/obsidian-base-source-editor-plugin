/* ========================= IMPORTS ========================= */
import { PluginSettingTab, type SettingDefinitionItem } from 'obsidian';

import type BasesSourceEditorPlugin from 'src/main';
import { getPluginSettingPath, setPluginSettingPath } from 'src/Settings/PluginSettings';
import type { PluginSettingPath } from 'src/Settings/PluginSettings';

/* ========================= BasesSourceEditorPluginTab ========================= */

export class BasesSourceEditorPluginSettingsTab extends PluginSettingTab {

  private plugin: BasesSourceEditorPlugin;

  constructor(plugin: BasesSourceEditorPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  override getControlValue(key: string): unknown {
    const pluginSettingPath = getPluginSettingPath(this.plugin.settings, key);
    return pluginSettingPath
  }
  
  override async setControlValue(key: string, value: unknown): Promise<void> {
    setPluginSettingPath(this.plugin.settings, key, value);
    await this.plugin.saveSettings();

    this.plugin.updateBaseSourceViews();
  }

  override getSettingDefinitions (): SettingDefinitionItem<PluginSettingPath>[] {
    const settingsDefinitions: SettingDefinitionItem<PluginSettingPath>[] = [
      {
        heading: 'Editor settings',
        type: 'group',
        items: [
          {
            name: 'Enable line wrapping',
            desc: '',
            searchable: true,
            control: {
              key: 'lineWrapEnabled',
              type: 'toggle'
            }
          }
        ]
      }
    ]

    return settingsDefinitions;
  }
}