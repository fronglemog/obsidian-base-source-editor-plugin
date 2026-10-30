/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import type {
  App,
  Command
} from 'obsidian';

/* PLUGIN */
import {
  getGlobalCommandsForToolbar,
  getToolbarCommandIds,
  TOOLBAR_COMMAND_IDS
} from 'src/Mobile/toolbarCommands';

/* ========================= HELPERS ========================= */

/**
 * Creates stand-in commands, keyed by id, as Obsidian keeps them.
 *
 * @param ids - Ids of the commands.
 * @returns The commands.
 */
function createCommands(ids: string[]): Record<string, Command> {
  return Object.fromEntries(ids.map((id: string): [string, Command] => [id, { id, name: id }]));
}

/**
 * Creates a stand-in app with some commands, some of them editor commands.
 *
 * @param commandIds - Ids of the commands.
 * @param editorCommandIds - Ids of those that are editor commands.
 * @returns The stand-in app.
 */
function createApp(commandIds: string[], editorCommandIds: string[]): App {
  return { commands: { commands: createCommands(commandIds), editorCommands: createCommands(editorCommandIds) } } as unknown as App;
}

/* ========================= TESTS ========================= */

describe('getToolbarCommandIds', () => {
  test('"Show suggestions" with the plugin\'s id in front, then the patched editor commands', () => {
    expect(getToolbarCommandIds('base-source-editor')).toEqual(['base-source-editor:show-suggestions', ...TOOLBAR_COMMAND_IDS]);
  });
});

describe('getGlobalCommandsForToolbar', () => {
  test('leaves out editor commands, the commands under "More toolbar options", and those on the toolbar', () => {
    const app: App = createApp(['app:a', 'editor:b', 'plugin:c', 'app:d'], ['editor:b']);
    const commands: Command[] = getGlobalCommandsForToolbar(app, ['app:d'], ['plugin:c']);
    expect(commands.map((command: Command) => command.id)).toEqual(['app:a']);
  });
});
