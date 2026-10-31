/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { FileView } from 'obsidian';

import type {
  App,
  IconName,
  View
} from 'obsidian';

/* PLUGIN */
import type BasesSourceEditorPlugin from 'src/main';
import {
  VIEW_TYPE_BASES,
  VIEW_TYPE_BASES_SOURCE
} from 'src/BaseSourceView';

import { toggleSourceMode } from 'src/toggleSourceMode';

/* ========================= ViewActionsManager ========================= */

const VIEW_ACTIONS: Record<string, ViewAction> = {
  [VIEW_TYPE_BASES]: {
    icon: 'code-xml',
    title: 'Switch to source mode',
    callback: (view: FileView) => toggleSourceMode(view)
  },
  [VIEW_TYPE_BASES_SOURCE]: {
    icon: 'lucide-table',
    title: 'Switch to Bases mode',
    callback: (view: FileView) => toggleSourceMode(view)
  }
};

/**
 * Adds a header action to Bases and Base Source views that switches between them.
 */
export class ViewActionsManager {
  private plugin: BasesSourceEditorPlugin;

  // Action elements added to each view, so they are only added once and can be removed on unload
  private actionEls: WeakMap<FileView, HTMLElement> = new WeakMap();

  constructor(plugin: BasesSourceEditorPlugin) {
    this.plugin = plugin;
  }

  /**
   * Adds the actions to open views and to views opened later. They're removed when the plugin unloads.
   */
  registerActions(): void {
    const app: App = this.plugin.app;

    app.workspace.onLayoutReady(() => this.addViewActions());
    this.plugin.registerEvent(
      app.workspace.on('layout-change', () => this.addViewActions())
    );
    this.plugin.register(() => this.removeViewActions());
  }

  private addViewActions(): void {
    const app: App = this.plugin.app;

    for (const [viewType, action] of Object.entries(VIEW_ACTIONS)) {
      for (const leaf of app.workspace.getLeavesOfType(viewType)) {
        const view: View = leaf.view;

        if (!(view instanceof FileView) || this.actionEls.has(view)) {
          continue;
        }
        const actionEl = view.addAction(
          action.icon,
          action.title,
          () => action.callback(view)
        );
        this.actionEls.set(view, actionEl);
      }
    }
  }

  private removeViewActions(): void {
    const app: App = this.plugin.app;

    for (const viewType of Object.keys(VIEW_ACTIONS)) {
      for (const leaf of app.workspace.getLeavesOfType(viewType)) {
        const view: View = leaf.view;

        if (!(view instanceof FileView) || !this.actionEls.has(view)) {
          continue;
        }
        this.actionEls.get(view)?.remove();
        this.actionEls.delete(view);
      }
    }
  }
}

/**
 * A view header action.
 */
type ViewAction = {
  icon: IconName;
  title: string;
  callback: (view: FileView) => void;
};
