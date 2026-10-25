/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { NullValue } from 'obsidian';

import type {
  App,
  BasesAllOptions,
  BasesPropertyId,
  BasesSortConfig,
  BasesViewConfig,
  BasesViewRegistration,
  Value
} from 'obsidian';

/* PLUGIN */
import type { BasesPluginInstance } from 'src/obsidian-types';
import { logError } from 'src/Util/logError';

/* ========================= VIEW REGISTRATIONS ========================= */

const UNAVAILABLE_MESSAGE: string = 'view options are left out of key suggestions.';

/** Failures already logged since the plugin loaded, so each is logged once, not on every key press. */
const loggedFailures: Set<string> = new Set();

/**
 * A view config with nothing set, passed to a view type's `options()`.
 * Obsidian's own view types don't read it; other plugins' might.
 */
const EMPTY_VIEW_CONFIG: BasesViewConfig = {
  name: '',
  get: (): unknown => undefined,
  getAsPropertyId: (): BasesPropertyId | null => null,
  getEvaluatedFormula: (): Value => NullValue.value,
  set: (): void => {},
  getOrder: (): BasesPropertyId[] => [],
  getSort: (): BasesSortConfig[] => [],
  getDisplayName: (propertyId: BasesPropertyId): string => propertyId
};

/**
 * Gets the keys of a view type's options, from the view types registered with Obsidian's Bases plugin.
 *
 * @remarks
 * Includes the view types other plugins register. Options inside a group are included, because they're stored on the view directly.
 * Uses undocumented API: if it fails, the reason is logged once, and the view type has no option keys.
 *
 * @param app - The app.
 * @param viewType - The view's type, such as `table`.
 * @returns The option keys, or none if the view type is unknown or has no options.
 */
export function getViewOptionKeys(app: App, viewType: string): string[] {
  // Accessing undocumented API... keep this guard.
  try {
    const basesPlugin: BasesPluginInstance | null = app.internalPlugins.getEnabledPluginById('bases');

    // The Bases core plugin is turned off: a user setting, not a failure, so nothing is logged
    if (basesPlugin == null) {
      return [];
    }

    if (typeof basesPlugin.getRegistration !== 'function') {
      logFailureOnce('The Bases plugin has no getRegistration().');
      return [];
    }

    const registration: BasesViewRegistration | null = basesPlugin.getRegistration(viewType);
    if (registration?.options == null) {
      return [];
    }
    return getOptionKeys(registration.options(EMPTY_VIEW_CONFIG));
  } catch (error: unknown) {
    logFailureOnce(`Couldn't read the options of the '${viewType}' view type.`, error);
    return [];
  }
}

/**
 * Gets the keys of view options, including those inside groups.
 *
 * @param options - The options, from a view type's `options()`.
 * @returns The keys.
 */
function getOptionKeys(options: BasesAllOptions[]): string[] {
  const keys: string[] = [];

  for (const option of options) {
    if (option.type === 'group') {
      keys.push(...getOptionKeys(option.items));
    }
    else {
      keys.push(option.key);
    }
  }
  return keys;
}

/**
 * Logs a failure, unless the same failure was logged since the plugin loaded.
 *
 * @param failure - What failed.
 * @param error - The error, if there was one.
 */
function logFailureOnce(failure: string, error?: unknown): void {
  if (loggedFailures.has(failure) === true) {
    return;
  }
  loggedFailures.add(failure);

  logError(`${UNAVAILABLE_MESSAGE} ${failure}`, error);
}
