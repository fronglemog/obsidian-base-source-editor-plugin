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
        heading: 'Line length and wrapping',
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
        ]
      },
      {
        heading: 'Indentation guides',
        type: 'group',
        items: [
          {
            name: 'Indentation guides',
            desc: 'Show vertical lines indicating the relationship between YAML keys and values.',
            searchable: true,
            control: {
              key: 'indentationGuides',
              type: 'toggle'
            }
          },
          {
            name: 'Indentation guide style',
            desc: 'Set indentation guide colour and opacity.',
            searchable: true,
            type: 'page',
            items: [
              {
                name: 'Enable custom indentation guide style',
                desc: 'Use a custom indentation guide style instead of the one set by your theme.',
                searchable: true,
                control: {
                  key: 'indentationGuideCustomStyle',
                  type: 'toggle',
                  disabled: () => this.plugin.settings.indentationGuides === false
                }
              },
              {
                name: 'Indentation guide colour',
                desc: 'Colour of the indentation guides.',
                searchable: true,
                control: {
                  key: 'indentationGuideColour',
                  type: 'color',
                  defaultValue: PLUGIN_DEFAULT_SETTINGS.indentationGuideColour,
                  disabled: () => (this.plugin.settings.indentationGuides && this.plugin.settings.indentationGuideCustomStyle) === false
                }
              },
              {
                name: 'Indentation guide opacity',
                desc: 'Fine-tune the visibility of the indentation guides.',
                searchable: true,
                control: {
                  key: 'indentationGuideOpacity',
                  type: 'slider',
                  defaultValue: PLUGIN_DEFAULT_SETTINGS.indentationGuideOpacity,
                  min: 10,
                  max: 100,
                  step: 5,
                  displayFormat: (value: number): string => `${value}%`,
                  disabled: () => (this.plugin.settings.indentationGuides && this.plugin.settings.indentationGuideCustomStyle) === false
                }
              }
            ]
          },
        ]
      },
      {
        heading: 'Whitespace',
        type: 'group',
        items: [
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