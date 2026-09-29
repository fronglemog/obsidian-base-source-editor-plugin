/* ========================= IMPORTS ========================= */
import type { Component } from 'obsidian';

import type { LanguageSupport as EditorLanguageSupport } from '@codemirror/language';

/* ========================= OBSIDIAN TYPES ========================= */

declare module 'obsidian' {
  interface App {
    /**
     * Manages global hotkeys.
     *
     * @tutorial Can be used for manually invoking a command, or finding which hotkey is assigned to a specific key input.
     * @remark This should not be used for adding hotkeys to your custom commands, this can easily be done via the official API.
     * @unofficial
     */
    hotkeyManager: HotkeyManager;
  }
  interface QueryController extends Component {
    /**
     * The mock context used to evaluate identifiers and resolve widget types.
     *
     * @unofficial
     */
    mockContext: BasesMockContext;

    /**
     * Gets the editor language support used for the query editor.
     *
     * @returns The editor language support.
     * @unofficial
     */
    getEditorLanguageSupport(): EditorLanguageSupport;
  }
}

/**
 * Bases view controller mock context.
 *
 * @public
 * @unofficial
 */
export interface BasesMockContext {}

/**
 * Manager for keyboard shortcut registration, storage, and triggering.
 *
 * @public
 * @unofficial
 */
export interface HotkeyManager {
  /**
   * Reference to the {@link obsidian#App}.
   */
  app: App;
  /**
   * Whether hotkeys have been baked (checks completed).
   */
  baked: boolean;
  /**
   * Assigned hotkeys.
   */
  bakedHotkeys: KeymapInfo[];
  /**
   * Array of hotkey index to command ID.
   */
  bakedIds: string[];
  /**
   * Custom (non-Obsidian default) hotkeys, one to many mapping of command ID to assigned hotkey.
   */
  customKeys: HotkeyManagerCustomKeysRecord;
  /**
   * Default hotkeys, one to many mapping of command ID to assigned hotkey.
   */
  defaultKeys: HotkeyManagerDefaultKeysRecord;
  /**
   * Debounced handler for hotkey config file changes on disk.
   */
  onConfigFileChange: Debouncer<[], Promise<void>>;
  /**
   * Add a hotkey to the default hotkeys.
   *
   * @param command - {@link obsidian#Command} ID to add hotkey to.
   * @param keys - Hotkeys to add.
   */
  addDefaultHotkeys(command: string, keys: KeymapInfo[]): void;
  /**
   * Bake hotkeys (create mapping of pressed key to command ID).
   */
  bake(): void;
  /**
   * Constructor.
   *
   * To get the constructor instance, use {@link getHotkeyManagerConstructor} from `obsidian-typings/implementations`.
   *
   * @param app - The app.
   * @returns The new instance.
   * @deprecated - Added only for typing purposes.
   */
  constructor__?(app: App): this;
  /**
   * Get hotkey associated with command ID.
   *
   * @param command - {@link obsidian#Command} ID to get hotkey for.
   * @returns The default hotkeys for the command.
   */
  getDefaultHotkeys(command: string): KeymapInfo[];
  /**
   * Get hotkey associated with command ID.
   *
   * @param command - {@link obsidian#Command} ID to get hotkey for.
   * @returns The hotkeys for the command.
   */
  getHotkeys(command: string): KeymapInfo[];
  /**
   * Load hotkeys from storage.
   */
  load(): void;
  /**
   * Handle raw file system change events for the hotkey config.
   *
   * @param e - The file system change event.
   */
  onRaw(e: unknown): void;
  /**
   * Trigger a command by keyboard event.
   *
   * @param event - Keyboard event to trigger command with.
   * @param keypress - Pressed key information.
   * @returns Whether a command was triggered.
   */
  onTrigger(event: KeyboardEvent, keypress: KeymapInfo): boolean;
  /**
   * Pretty-print hotkey of a command.
   *
   * @param commandId - {@link obsidian#Command} ID to print hotkey for.
   * @returns The formatted hotkey string.
   */
  printHotkeyForCommand(commandId: string): string;
  /**
   * Register event listeners for hotkey config file changes.
   */
  registerListeners(): void;
  /**
   * Remove a hotkey from the default hotkeys.
   *
   * @param command - {@link obsidian#Command} ID to remove hotkey from.
   */
  removeDefaultHotkeys(command: string): void;
  /**
   * Remove a hotkey from the custom hotkeys.
   *
   * @param command - {@link obsidian#Command} ID to remove hotkey from.
   */
  removeHotkeys(command: string): void;
  /**
   * Save custom hotkeys to storage.
   */
  save(): void;
  /**
   * Add a hotkey to the custom hotkeys (overrides default hotkeys).
   *
   * @param command - {@link obsidian#Command} ID to add hotkey to.
   * @param keys - Hotkeys to add.
   */
  setHotkeys(command: string, keys: KeymapInfo[]): void;
}
