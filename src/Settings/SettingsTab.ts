/* ========================= IMPORTS ========================= */
import { PluginSettingTab, type SettingDefinitionItem } from 'obsidian';

import type BasesSourceEditorPlugin from 'src/main';
import { getPluginSettingPath, PLUGIN_DEFAULT_SETTINGS, setPluginSettingPath } from 'src/Settings/PluginSettings';
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
            name: 'Line wrapping',
            desc: 'Enable line wrapping. ',
            searchable: true,
            control: {
              key: 'lineWrap',
              type: 'toggle'
            }
          },
          {
            name: 'Readable line length',
            desc: 'Limit maximum line length, based on Obsidian\'s CSS variable \'--file-line-width\'.',
            searchable: true,
            control: {
              key: 'readableLineLength',
              type: 'toggle'
            }
          },
          {
            name: 'Indentation guides',
            desc: 'Show vertical lines indicating the relationship between YAML keys.',
            searchable: true,
            control: {
              key: 'indentationGuides',
              type: 'toggle'
            }
          },
          {
            name: 'Render whitespace characters',
            desc: 'Show spaces as dots and tabs as arrows.',
            searchable: true,
            control: {
              key: 'renderWhitespace',
              type: 'toggle'
            }
          },
          {
            name: 'Whitespace opacity',
            desc: 'Fine-tune the visibility of whitespace characters.',
            searchable: true,
            control: {
              key: 'whitespaceOpacity',
              type: 'slider',
              defaultValue: PLUGIN_DEFAULT_SETTINGS.whitespaceOpacity,
              min: 10,
              max: 100,
              step: 10,
              displayFormat: (value: number): string => `${value}%`,
              disabled: () => this.plugin.settings.renderWhitespace === false
            }
          }
        ]
      }
    ]

    return settingsDefinitions;
  }
}