/* ========================= IMPORTS ========================= */
import { FuzzySuggestModal } from 'obsidian';

import type {
  Command,
  FuzzyMatch
} from 'obsidian';

import type BasesSourceEditorPlugin from 'src/main';

/* ========================= CommandSuggestModal ========================= */

class CommandSuggester extends FuzzySuggestModal<Command> {
  private plugin: BasesSourceEditorPlugin;

  private commands: Command[];

  private submitted: boolean = false;
  private resolve!: (command: Command) => void;
  private reject!: (reason?: Error) => void;

  constructor(plugin: BasesSourceEditorPlugin, commands: Command[]) {
    super(plugin.app);

    this.plugin = plugin;

    this.commands = commands;
    this.setPlaceholder('Select a command...');
  }

  async openAndGetCommand(resolve: (command: Command) => void, reject: (reason?: Error) => void): Promise<void> {
    this.resolve = resolve;
    this.reject = reject;
    this.open();
  }

  getItems(): Command[] {
    return this.commands;
  }

  getItemText(command: Command): string {
    return command.name;
  }

  override onClose(): void {
    super.onClose();
    if (!this.submitted) {
      this.reject(new Error('Command suggester cancelled.'));
    }
  }

  override selectSuggestion(value: FuzzyMatch<Command>, evt: MouseEvent | KeyboardEvent): void {
    this.submitted = true;
    this.close();
    this.onChooseSuggestion(value, evt);
  }

  onChooseItem(command: Command): void {
    this.resolve(command);
  }
}

/**
 * Opens a {@link CommandSuggester} and waits for the user to pick a command.
 *
 * @param plugin - Plugin opening the modal.
 * @param commands - Commands to choose from.
 * @returns The chosen command, or null if the modal was closed without choosing.
 */
export async function commandSuggester(plugin: BasesSourceEditorPlugin, commands: Command[]): Promise<Command | null> {
  const suggester: CommandSuggester = new CommandSuggester(plugin, commands);

  const promise: Promise<Command> = new Promise(
    (
      resolve: (command: Command) => void,
      reject: (reason?: Error) => void
    ) => suggester.openAndGetCommand(resolve, reject)
  );

  try {
    const suggestResult: Awaited<Command> = await promise;
    return suggestResult;
  } catch (error: unknown) {
    return null;
  }
}
