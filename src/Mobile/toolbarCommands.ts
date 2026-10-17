/* ========================= IMPORTS ========================= */
import type {
  App,
  Command
} from 'obsidian';

/* ========================= TOOLBAR COMMANDS ========================= */

/**
 * Commands offered under "More toolbar options" in the mobile toolbar settings, in this order.
 * Only includes `editor:*` commands that have been patched by this plugin.
 */
export const TOOLBAR_SUPPORTED_COMMAND_IDS: readonly string[] = [
  'command-palette:open',
  'base-source-editor:toggle-source-mode',
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
 * Looks up commands by ID, keeping their order.
 * Skips IDs of commands that cannot be found.
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
 * Commands offered by the "Add a command..." picker in the mobile toolbar settings.
 *
 * @param app - Obsidian app.
 * @param toolbarCommandIds - IDs of commands already on the toolbar, which are left out.
 * @returns The commands to offer.
 */
export function getGlobalCommandsForToolbar(app: App, toolbarCommandIds: readonly string[]): Command[] {
  const commands: Command[] = Object.values(app.commands.commands);

  const globalCommands: Command[] = commands.filter((command: Command): boolean => {
    const isEditorCommand: boolean = app.commands.editorCommands[command.id] != null;
    const isSupportedCommand: boolean = TOOLBAR_SUPPORTED_COMMAND_IDS.includes(command.id);
    const isOnToolbar: boolean = toolbarCommandIds.includes(command.id);

    return !isEditorCommand && !isSupportedCommand && !isOnToolbar;
  });
  return globalCommands;
}
