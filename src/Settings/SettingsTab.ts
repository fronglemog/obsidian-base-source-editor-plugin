/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
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

/* PLUGIN */
import type BasesSourceEditorPlugin from 'src/main';
import {
  getPluginSettingPath,
  PLUGIN_DEFAULT_SETTINGS,
  setPluginSettingPath
} from 'src/Settings/PluginSettings';
import type {
  AutocompleteAcceptKey,
  AutocompleteDevices,
  AutocompleteKeyInsert,
  PluginSettingPath
} from 'src/Settings/PluginSettings';

import { commandSuggester } from 'src/Mobile/CommandSuggester';

import {
  getMobileToolbarCommands,
  getGlobalCommandsForToolbar,
  getToolbarCommandIds
} from 'src/Mobile/toolbarCommands';

/* ========================= BasesSourceEditorPluginSettingsTab ========================= */

export class BasesSourceEditorPluginSettingsTab extends PluginSettingTab {
  private plugin: BasesSourceEditorPlugin;

  constructor(plugin: BasesSourceEditorPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  override getControlValue(key: string): unknown {
    return getPluginSettingPath(this.plugin.settings, key);
  }
  
  override async setControlValue(key: string, value: unknown): Promise<void> {
    setPluginSettingPath(this.plugin.settings, key, value);
    await this.plugin.saveSettings();
    this.plugin.updateBaseSourceViews();
  }

  override getSettingDefinitions(): SettingDefinitionItem<PluginSettingPath>[] {
    return [
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
      },
      {
        heading: 'Autocompletion',
        type: 'group',
        items: [
          {
            name: 'Autocompletion',
            desc: 'Show suggestions for keys and values, formulas, and function hints.',
            searchable: true,
            control: {
              key: 'autocompletion',
              type: 'dropdown',
              options: {
                off: 'Off',
                desktopAndTablet: 'Enabled (desktop/tablet)',
                allDevices: 'Enabled (all devices)'
              } satisfies Record<AutocompleteDevices, string>
            }
          },
          {
            name: 'Autocompletion behaviour',
            desc: '',
            searchable: true,
            type: 'page',
            visible: () => this.plugin.settings.autocompletion !== 'off',
            items: [
              {
                name: 'Accept suggestions using',
                desc: 'Which key to press to insert the current suggestion.',
                searchable: true,
                control: {
                  key: 'autocompletionAcceptKey',
                  type: 'dropdown',
                  options: {
                    enter: 'Enter',
                    tab: 'Tab',
                    tabAndEnter: 'Tab and Enter'
                  } satisfies Record<AutocompleteAcceptKey, string>
                }
              },
              {
                name: 'When picking a key, insert',
                desc: 'Insert the selected key with or without jumping to the next line.',
                searchable: true,
                control: {
                  key: 'autocompletionKeyInsert',
                  type: 'dropdown',
                  options: {
                    keyAndNextLine: 'Key and next line',
                    keyOnly: 'Key only'
                  } satisfies Record<AutocompleteKeyInsert, string>
                }
              },
              {
                name: 'Offer suggestions after inserting a key',
                desc: 'After inserting a key, show suggestions for the next item or value.',
                searchable: true,
                control: {
                  key: 'autocompletionSuggestAfterKeyInsertion',
                  type: 'toggle'
                }
              }
            ]
          },
        ]
      },
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
            visible: () => this.plugin.settings.fontCustomSize === true,
            control: {
              key: 'fontSize',
              type: 'slider',
              defaultValue: PLUGIN_DEFAULT_SETTINGS.fontSize,
              min: 10,
              max: 30,
              step: 1,
              displayFormat: (value: number): string => `${value}px`
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
            name: 'Indentation guide appearance',
            desc: '',
            searchable: true,
            type: 'page',
            visible: () => this.plugin.settings.indentationGuides,
            items: [
              {
                name: 'Enable custom indentation guide style',
                desc: 'Use a custom indentation guide style instead of the one set by your theme.',
                searchable: true,
                control: {
                  key: 'indentationGuideCustomStyle',
                  type: 'toggle'
                }
              },
              {
                name: 'Indentation guide colour',
                desc: 'Colour of the indentation guides.',
                searchable: true,
                control: {
                  key: 'indentationGuideColour',
                  type: 'color',
                  defaultValue: PLUGIN_DEFAULT_SETTINGS.indentationGuideColour
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
                  displayFormat: (value: number): string => `${value}%`
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
            visible: () => this.plugin.settings.renderWhitespace === true,
            control: {
              key: 'whitespaceOpacity',
              type: 'slider',
              defaultValue: PLUGIN_DEFAULT_SETTINGS.whitespaceOpacity,
              min: 10,
              max: 100,
              step: 10,
              displayFormat: (value: number): string => `${value}%`
            }
          }
        ]
      }
    ];
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

    const availableCommandIdsToAdd: string[] = getToolbarCommandIds(this.plugin.manifest.id).filter((commandId: string): boolean => !toolbarCommandIds.includes(commandId));
    const availableCommandsToAdd: Command[] = getMobileToolbarCommands(app, availableCommandIdsToAdd);

    return [
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
  }

  /**
   * Opens the command suggester and adds the chosen command to the end of the mobile toolbar.
   *
   * @param toolbarCommandIds - IDs of the commands currently on the toolbar. Edited in place.
   */
  private async addCommandFromSuggester(toolbarCommandIds: string[]): Promise<void> {
    const globalCommands: Command[] = getGlobalCommandsForToolbar(this.plugin.app, toolbarCommandIds, getToolbarCommandIds(this.plugin.manifest.id));
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