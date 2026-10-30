/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  App,
  Command
} from 'obsidian';

/* PLUGIN */
import { SHOW_SUGGESTIONS_COMMAND_ID } from 'src/EditorCommands/showSuggestions';

/* ========================= TOOLBAR COMMANDS ========================= */

/**
 * Obsidian's `editor:*` commands offered under "More toolbar options" in the mobile toolbar settings, in this order.
 * Only includes commands that have been patched by this plugin. The plugin's own commands come before them: {@link getToolbarCommandIds}.
 */
export const TOOLBAR_COMMAND_IDS: readonly string[] = [
  'editor:undo',
  'editor:redo',
  'editor:copy',
  'editor:cut',
  'editor:paste',
  'editor:indent-list',
  'editor:unindent-list',
  'editor:swap-line-up',
  'editor:swap-line-down',
  'editor:delete-paragraph',
  'editor:move-caret-up',
  'editor:move-caret-down',
  'editor:move-caret-left',
  'editor:move-caret-right',
  'editor:go-start',
  'editor:go-end',
  'editor:open-search',
  'editor:open-search-replace',
  'editor:toggle-keyboard'
];

/**
 * Gets the commands offered under "More toolbar options" in the mobile toolbar settings, in this order:
 * the plugin's own commands, then the patched editor commands ({@link TOOLBAR_COMMAND_IDS}).
 *
 * @param pluginId - The plugin's id, from its manifest, which Obsidian puts in front of its command ids.
 * @returns The full command ids.
 */
export function getToolbarCommandIds(pluginId: string): string[] {
  return [`${pluginId}:${SHOW_SUGGESTIONS_COMMAND_ID}`, ...TOOLBAR_COMMAND_IDS];
}

/**
 * Gets commands by ID, in the same order. IDs of commands that can't be found are skipped.
 *
 * @param app - Obsidian app.
 * @param commandIds - Command IDs to look up.
 * @returns The commands that were found.
 */
export function getMobileToolbarCommands(app: App, commandIds: readonly string[]): Command[] {
  const commandsForToolbar: Command[] = [];

  for (const commandId of commandIds) {
    const command: Command | undefined = app.commands.findCommand(commandId);
    if (command != null) {
      commandsForToolbar.push(command);
    }
  }
  return commandsForToolbar;
}

/**
 * Gets the commands offered by the "Add a command..." picker in the mobile toolbar settings.
 *
 * @param app - Obsidian app.
 * @param toolbarCommandIds - IDs of commands already on the toolbar, which are left out.
 * @param offeredCommandIds - IDs of commands offered under "More toolbar options", which are left out.
 * @returns The commands to offer.
 */
export function getGlobalCommandsForToolbar(app: App, toolbarCommandIds: readonly string[], offeredCommandIds: readonly string[]): Command[] {
  const commands: Command[] = Object.values(app.commands.commands);

  const globalCommands: Command[] = commands.filter((command: Command): boolean => {
    const isEditorCommand: boolean = app.commands.editorCommands[command.id] != null;
    const isOfferedCommand: boolean = offeredCommandIds.includes(command.id);
    const isOnToolbar: boolean = toolbarCommandIds.includes(command.id);

    return !isEditorCommand && !isOfferedCommand && !isOnToolbar;
  });
  return globalCommands;
}
