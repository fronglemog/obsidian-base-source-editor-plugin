/* ========================= IMPORTS ========================= */
import type { App, Command, Component, Debouncer, IconName, KeymapInfo } from 'obsidian';

import type { LanguageSupport as EditorLanguageSupport } from '@codemirror/language';

/* ========================= OBSIDIAN TYPES ========================= */
// Credit for undocumented Obsidian API typings: https://github.com/obsidian-typings/obsidian-typings

declare module 'obsidian' {
  interface App {
    /**
     * Contains all registered commands.
     *
     * @tutorial Can be used to manually invoke the functionality of a specific command.
     * @unofficial
     */
    commands: Commands;
    /**
     * References to important DOM elements of the application.
     *
     * @unofficial
     */
    dom: ObsidianDOM;
    /**
     * Navigation bar for mobile devices, or `null` on desktop.
     *
     * @unofficial
     */
    mobileNavbar: MobileNavbar | null;
    /**
     * Toolbar for mobile devices, or `null` on desktop.
     *
     * @unofficial
     */
    mobileToolbar: MobileToolbar | null;
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
  interface SettingDefinitionBase {
    /**
     * Icon shown before the setting's name, as in Obsidian's mobile toolbar settings.
     *
     * @unofficial
     */
    icon?: IconName;
  }
}

declare global {
  /**
   * Events fired on `window` by Obsidian's mobile apps, as the on-screen keyboard opens and closes.
   * When they fire, Obsidian has already set `--keyboard-height` to the new height.
   *
   * @unofficial
   */
  interface WindowEventMap {
    keyboardWillShow: Event;
    keyboardWillHide: KeyboardWillHideEvent;
    /** Android only: the app entered or left split-screen. */
    multiWindowModeChanged: Event;
  }
}

/**
 * @unofficial
 */
export interface KeyboardWillHideEvent extends Event {
  /**
   * Whether a physical keyboard is connected. The on-screen keyboard hides when one is used,
   * but the user can still type.
   */
  hasPhysicalKeyboard?: boolean;
}

/**
 * Core DOM elements of the Obsidian application layout.
 *
 * @public
 * @unofficial
 */
export interface ObsidianDOM {
  /**
   * Root element of the application.
   */
  appContainerEl: HTMLElement;
}

/**
 * Navigation bar component for the mobile interface.
 *
 * @public
 * @unofficial
 */
export interface MobileNavbar {
  /**
   * Shows the navbar, unless Obsidian's own toolbar or the on-screen keyboard is visible.
   */
  show(): void;
  hide(): void;
}

/**
 * Toolbar component displayed above the keyboard on mobile.
 *
 * @public
 * @unofficial
 */
export interface MobileToolbar {
  /**
   * Whether the toolbar is shown.
   */
  isVisible: boolean;
  /**
   * Android only: whether the app is in split-screen.
   */
  isMultiWindowMode: boolean;
}

/**
 * Bases view controller mock context.
 *
 * @public
 * @unofficial
 */
export type BasesMockContext = object;

/**
 * @todo Documentation incomplete.
 * @public
 * @unofficial
 */
export interface Commands {
  /**
   * Reference to App.
   */
  app: App;
  /**
   * Commands *without* editor callback, will always be available in the command palette.
   *
   * @example `app:open-vault` or `app:reload`.
   */
  commands: CommandsCommandsRecord;
  /**
   * Commands *with* editor callback, will only be available when editor is active and callback returns.
   * true.
   *
   * @example `editor:fold-all` or `command-palette:open`.
   */
  editorCommands: CommandsEditorCommandsRecord;
  /**
   * Add a command to the command registry.
   *
   * @param command - Command to add.
   */
  addCommand(command: Command): void;
  /**
   * Execute a command by reference.
   *
   * @param command - Command to execute.
   */
  executeCommand(command: Command, event?: Event): boolean;
  /**
   * Execute a command by ID.
   *
   * @param commandId - ID of command to execute.
   */
  executeCommandById(commandId: string, event?: Event): boolean;
  /**
   * Find a command by ID.
   *
   * @param commandId - ID of command to find.
   */
  findCommand(commandId: string): Command | undefined;
  /**
   * Lists **all** commands, both with and without editor callback.
   */
  listCommands(): Command[];
  /**
   * Remove a command from the command registry.
   *
   * @param commandId - ID of command to remove.
   */
  removeCommand(commandId: string): void;
}

/**
 * Record mapping command IDs to {@link obsidian#Command} objects without editor callbacks.
 *
 * @public
 * @unofficial
 */
export type CommandsCommandsRecord = Record<string, Command>;

/**
 * Record mapping command IDs to {@link obsidian#Command} objects with editor callbacks.
 *
 * @public
 * @unofficial
 */
export type CommandsEditorCommandsRecord = Record<string, Command>;

/**
 * Record mapping command IDs to their user-customized hotkey bindings.
 *
 * @public
 * @unofficial
 */
export type HotkeyManagerCustomKeysRecord = Record<string, KeymapInfo[]>;

/**
 * Record mapping command IDs to their default hotkey bindings.
 *
 * @public
 * @unofficial
 */
export type HotkeyManagerDefaultKeysRecord = Record<string, KeymapInfo[]>;

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
