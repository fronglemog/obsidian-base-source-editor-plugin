/* ========================= IMPORTS ========================= */
import {
  Platform,
  PluginSettingTab
} from 'obsidian';

import type {
  App,
  Command,
  SettingDefinition,
  SettingDefinitionItem
} from 'obsidian';

import type BasesSourceEditorPlugin from 'src/main';
import { getPluginSettingPath, PLUGIN_DEFAULT_SETTINGS, setPluginSettingPath } from 'src/Settings/PluginSettings';
import type { PluginSettingPath } from 'src/Settings/PluginSettings';
import { commandSuggester } from 'src/CommandSuggester';

import {
  getMobileToolbarCommands,
  getGlobalCommandsForToolbar,
  TOOLBAR_SUPPORTED_COMMAND_IDS
} from 'src/Mobile/toolbarCommands';

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
        heading: 'Font size',
        type: 'group',
        items: [
          {
            name: 'Custom font size',
            desc: 'Set font size for the Base Source editor independently of Obsidian\'s core settings.',
            searchable: true,
            control: {
              key: 'fontCustomSize',
              type: 'toggle'
            }
          },
          {
            name: 'Font size',
            desc: 'Font size for the Base Source editor.',
            searchable: true,
            control: {
              key: 'fontSize',
              type: 'slider',
              defaultValue: PLUGIN_DEFAULT_SETTINGS.fontSize,
              min: 10,
              max: 30,
              step: 1,
              displayFormat: (value: number): string => `${value}px`,
              disabled: () => this.plugin.settings.fontCustomSize === false
            }
          }
        ]
      },
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
            ],
            visible: () => this.plugin.settings.indentationGuides
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
      },
      {
        heading: 'Mobile',
        type: 'group',
        visible: Platform.isMobile,
        items: [
          {
            name: 'Configure mobile toolbar',
            desc: 'Manage toolbar options',
            searchable: true,
            type: 'page',
            items: this.getMobileToolbarSettingsItems()
          },
        ]
      }
    ]

    return settingsDefinitions;
  }

  /**
   * Builds the items of the "Configure mobile toolbar" page.
   *
   * @returns The page's items.
   */
  private getMobileToolbarSettingsItems(): SettingDefinitionItem<PluginSettingPath>[] {
    const app: App = this.plugin.app;

    const toolbarCommands: Command[] = getMobileToolbarCommands(app, this.plugin.settings.mobileToolbarCommands);
    const toolbarCommandIds: string[] = toolbarCommands.map((command: Command): string => command.id);

    const availableCommandIdsToAdd: string[] = TOOLBAR_SUPPORTED_COMMAND_IDS.filter((commandId: string): boolean => !toolbarCommandIds.includes(commandId));
    const availableCommandsToAdd: Command[] = getMobileToolbarCommands(app, availableCommandIdsToAdd);

    const settingsItems: SettingDefinitionItem<PluginSettingPath>[] = [
      {
        heading: 'Manage toolbar options',
        type: 'list',
        emptyState: 'No commands found.',
        items: toolbarCommands.map((command: Command): SettingDefinition<PluginSettingPath> => ({
          name: command.name,
          icon: command.icon ?? 'question-mark-glyph',
          searchable: false
        })),
        addItem: {
          name: 'Add a command...',
          action: () => {
            void this.addCommandFromSuggester(toolbarCommandIds);
          }
        },
        onReorder: (oldIndex, newIndex) => {
          const [movedCommandId] = toolbarCommandIds.splice(oldIndex, 1);
          toolbarCommandIds.splice(newIndex, 0, movedCommandId as string);
          this.plugin.settings.mobileToolbarCommands = toolbarCommandIds;
          void this.plugin.saveSettings();
        },
        onDelete: (index) => {
          toolbarCommandIds.splice(index, 1);
          this.plugin.settings.mobileToolbarCommands = toolbarCommandIds;
          void this.plugin.saveSettings();
          this.update();
        },
      },
      {
        heading: 'More toolbar options',
        type: 'list',
        visible: availableCommandsToAdd.length > 0,
        items: availableCommandsToAdd.map((command: Command): SettingDefinition<PluginSettingPath> => ({
          name: command.name,
          icon: command.icon ?? 'question-mark-glyph',
          searchable: false,
          action: () => {
            void this.addMobileToolbarCommand(toolbarCommandIds, command.id);
          }
        }))
      }
    ];
    return settingsItems;
  }

  /**
   * Opens the command suggester and adds the chosen command to the end of the mobile toolbar.
   *
   * @param toolbarCommandIds - IDs of the commands currently on the toolbar. Edited in place.
   */
  private async addCommandFromSuggester(toolbarCommandIds: string[]): Promise<void> {
    const globalCommands: Command[] = getGlobalCommandsForToolbar(this.plugin.app, toolbarCommandIds);
    const command: Command | null = await commandSuggester(this.plugin, globalCommands);

    if (command == null) {
      return;
    }
    await this.addMobileToolbarCommand(toolbarCommandIds, command.id);
  }

  /**
   * Adds a command to the end of the mobile toolbar.
   *
   * @param toolbarCommandIds - IDs of the commands currently on the toolbar. Edited in place.
   * @param commandId - ID of the command to add.
   */
  private async addMobileToolbarCommand(toolbarCommandIds: string[], commandId: string): Promise<void> {
    if (toolbarCommandIds.includes(commandId)) {
      return;
    }
    toolbarCommandIds.push(commandId);
    this.plugin.settings.mobileToolbarCommands = toolbarCommandIds;
    await this.plugin.saveSettings();
    this.update();
  }
}