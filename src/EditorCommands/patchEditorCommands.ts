/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  App,
  Command
} from 'obsidian';

/* CODEMIRROR */
import {
  cursorCharLeft,
  cursorCharRight,
  cursorDocEnd,
  cursorDocStart,
  cursorLineDown,
  cursorLineUp,
  deleteLine,
  indentLess,
  indentMore,
  moveLineDown,
  moveLineUp,
  redo,
  undo
} from '@codemirror/commands';

/* PLUGIN */
import type BasesSourceEditorPlugin from 'src/main';
import { BaseSourceView } from 'src/BaseSourceView';

import {
  copySelection,
  cutSelection,
  pasteClipboard,
  toggleKeyboard
} from 'src/EditorCommands/editorCommands';

/* ========================= PATCHED COMMANDS ========================= */

/**
 * Obsidian commands that also work in a Base Source view, and what each does there.
 * Most are editor commands, which only work in markdown editors, so they're patched to run
 * the matching CodeMirror command instead. They keep Obsidian's names, icons and hotkeys.
 * Commands that don't exist on this platform, such as Copy on desktop, are skipped.
 */
const PATCHED_COMMANDS: Record<string, (view: BaseSourceView) => void> = {
  'editor:open-search-replace': (view) => view.showSearch(true),
  'editor:toggle-keyboard': (view) => view.runEditorCommand(toggleKeyboard),

  /* History */
  'editor:undo': (view) => view.runEditorCommand(undo),
  'editor:redo': (view) => view.runEditorCommand(redo),

  /* Clipboard: mobile app only */
  'editor:copy': (view) => view.runEditorCommand(copySelection),
  'editor:cut': (view) => view.runEditorCommand(cutSelection),
  'editor:paste': (view) => view.runEditorCommand(pasteClipboard),

  /* Line editing */
  'editor:indent-list': (view) => view.runEditorCommand(indentMore),
  'editor:unindent-list': (view) => view.runEditorCommand(indentLess),
  'editor:swap-line-up': (view) => view.runEditorCommand(moveLineUp),
  'editor:swap-line-down': (view) => view.runEditorCommand(moveLineDown),
  'editor:delete-paragraph': (view) => view.runEditorCommand(deleteLine),

  /* Cursor movement */
  'editor:move-caret-up': (view) => view.runEditorCommand(cursorLineUp),
  'editor:move-caret-down': (view) => view.runEditorCommand(cursorLineDown),
  'editor:move-caret-left': (view) => view.runEditorCommand(cursorCharLeft),
  'editor:move-caret-right': (view) => view.runEditorCommand(cursorCharRight),
  'editor:go-start': (view) => view.runEditorCommand(cursorDocStart),
  'editor:go-end': (view) => view.runEditorCommand(cursorDocEnd)
};

/**
 * Patches every command in {@link PATCHED_COMMANDS}. The originals are restored when the plugin unloads.
 *
 * @param plugin - Plugin that owns the patches.
 */
export function patchEditorCommands(plugin: BasesSourceEditorPlugin): void {
  for (const [commandId, runInBaseSourceView] of Object.entries(PATCHED_COMMANDS)) {
    patchCommand(plugin, commandId, runInBaseSourceView);
  }
}

/**
 * Makes an Obsidian command run `runInBaseSourceView` while a Base Source view is active.
 * Anywhere else, the command works as before.
 *
 * @param plugin - Plugin that owns the patch.
 * @param commandId - ID of the command to patch.
 * @param runInBaseSourceView - What the command does in a Base Source view.
 */
function patchCommand(
  plugin: BasesSourceEditorPlugin,
  commandId: string,
  runInBaseSourceView: (view: BaseSourceView) => void
): void {
  const app: App = plugin.app;
  const command: Command | undefined = app.commands.findCommand(commandId);
  const originalCheckCallback: Command['checkCallback'] = command?.checkCallback;

  // Accessing undocumented API... keep this guard.
  if (command == null || originalCheckCallback == null) {
    return;
  }

  const patchedCheckCallback = (checking: boolean) => {
    const view: BaseSourceView | null = app.workspace.getActiveViewOfType(BaseSourceView);
    if (view == null) {
      return originalCheckCallback(checking);
    }
    if (!checking) {
      runInBaseSourceView(view);
    }
    return true;
  };

  command.checkCallback = patchedCheckCallback;
  plugin.register(() => {
    if (command.checkCallback === patchedCheckCallback) {
      command.checkCallback = originalCheckCallback;
    }
  });
}
