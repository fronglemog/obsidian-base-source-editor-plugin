/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type { App } from 'obsidian';

/* PLUGIN */
import type { NoteProperty } from 'src/Autocompletion/propertyIds';
import { logError } from 'src/Util/logError';

import type {
  PropertyInfo,
  PropertyWidget
} from 'src/obsidian-types';

/* ========================= VAULT PROPERTIES ========================= */

const UNAVAILABLE_MESSAGE: string = 'note properties are left out of property suggestions. Couldn\'t read the vault\'s properties.';

/** The type of a note's aliases, which Obsidian's group-by editor doesn't offer. */
const ALIASES_TYPE: string = 'aliases';

/** Failures already logged since the plugin loaded, so each is logged once, not on every key press. */
const loggedFailures: Set<string> = new Set();

/**
 * Gets the vault's note properties, each with the icon of its type, as Obsidian's property picker lists them.
 *
 * @remarks
 * Uses undocumented API: if it fails, the reason is logged once, and there are no note properties.
 *
 * @param app - The app.
 * @returns The note properties, in the order Obsidian keeps them.
 */
export function getNoteProperties(app: App): NoteProperty[] {
  // Accessing undocumented API... keep this guard.
  try {
    const properties: PropertyInfo[] = Object.values(app.metadataTypeManager.getAllProperties());

    return properties.map((property: PropertyInfo): NoteProperty => {
      const widget: PropertyWidget = app.metadataTypeManager.getTypeInfo(property.name).expected;
      return { name: property.name, icon: widget.icon, isAliases: widget.type === ALIASES_TYPE };
    });
  } catch (error: unknown) {
    if (loggedFailures.has(UNAVAILABLE_MESSAGE) === false) {
      loggedFailures.add(UNAVAILABLE_MESSAGE);
      logError(UNAVAILABLE_MESSAGE, error);
    }
    return [];
  }
}
