/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
	Plugin,
} from 'obsidian';

/* BASES SOURCE EDITOR */
import type { PluginSettings } from 'src/Settings/PluginSettings';

/* ========================= BasesSourceEditorPlugin ========================= */
export default class BasesSourceEditorPlugin extends Plugin {
	settings!: PluginSettings;

  /* Load plugin */
  override async onload(): Promise<void> {
    
  }

  /* Unload plugin */
  override onunload(): void {
    
  }
}