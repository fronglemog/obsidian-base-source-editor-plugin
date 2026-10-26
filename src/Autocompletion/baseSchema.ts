/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  BasesOptions,
  IconName
} from 'obsidian';

/* PLUGIN */
import type {
  KeyPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

import type { ViewType } from 'src/Autocompletion/viewRegistrations';
import { toYamlText } from 'src/Autocompletion/yamlText';
import { isFilterMappingPath } from 'src/BaseYamlLanguage/yamlKeyPath';

/* ========================= BASE SCHEMA ========================= */

/** Keys at the top level of a Base. Obsidian still reads `display`, but only to move it into `properties`. */
const TOP_LEVEL_KEYS: readonly string[] = ['filters', 'formulas', 'properties', 'summaries', 'views', 'newItemFolder', 'newItemTemplate'];

/** Keys of a filter written as a mapping. It has exactly one of them. */
const FILTER_KEYS: readonly string[] = ['and', 'or', 'not'];

/** Keys every view has, whatever its type. */
const VIEW_KEYS: readonly string[] = ['type', 'name', 'filters', 'order', 'sort', 'groupBy', 'groupOrder', 'limit', 'summaries'];

/**
 * Keys every view must have: Obsidian won't load a Base with a view that lacks one.
 * In the order they're suggested; `type` comes first, because a view's options depend on it.
 */
const REQUIRED_VIEW_KEYS: readonly string[] = ['type', 'name'];

/**
 * Keys of a sort item, and of `groupBy`. Both are required, in this order:
 * Obsidian ignores a sort item that lacks one, and won't load a Base whose `groupBy` lacks one.
 */
const SORT_KEYS: readonly string[] = ['property', 'direction'];

/** Keys of a property's settings under `properties`. */
const PROPERTY_SETTINGS_KEYS: readonly string[] = ['displayName'];

/**
 * Keys in the schema that aren't suggested. Obsidian reads them from the file,
 * but nothing in its Bases view sets them, so they're left to be typed by hand.
 */
const UNSUGGESTED_KEYS: ReadonlySet<string> = new Set(['newItemFolder', 'newItemTemplate']);

/**
 * Keys only suggested once another key is in the mapping, each with the key it needs.
 * `groupOrder` orders a view's groups, so it does nothing without `groupBy`.
 */
const KEYS_NEEDING_KEY: ReadonlyMap<string, string> = new Map([
  ['groupOrder', 'groupBy']
]);

/** Keys some view types save without declaring them as options, by view type. */
const UNDECLARED_VIEW_KEYS: Map<string, readonly string[]> = new Map([
  ['table', ['columnSize']]
]);

/** Values of `direction`, in a sort item and in `groupBy`. */
const SORT_DIRECTIONS: readonly string[] = ['ASC', 'DESC'];

/** Values of a toggle option. */
const TOGGLE_VALUES: readonly string[] = ['true', 'false'];

/** Grey label of a suggested default value. */
const DEFAULT_DETAIL: string = 'Default';

/**
 * Gets the keys a mapping in a Base can have, from Obsidian's schema for `.base` files.
 *
 * @remarks
 * A view's options depend on its type, so they aren't included; {@link getKeySuggestions} adds them.
 *
 * @param mappingKeyPath - Key path of the mapping, from `getYamlKeyPath()`.
 * @returns The keys, or `null` if the schema doesn't name the mapping's keys:
 * keys you name yourself (`formulas`), property ids (`properties`), and lists.
 */
export function getSchemaKeys(mappingKeyPath: string[]): readonly string[] | null {
  if (mappingKeyPath.length === 0) {
    return TOP_LEVEL_KEYS;
  }
  if (isFilterMappingPath(mappingKeyPath) === true) {
    return FILTER_KEYS;
  }
  if (isViewPath(mappingKeyPath) === true) {
    return VIEW_KEYS;
  }

  if (isSortPath(mappingKeyPath) === true) {
    return SORT_KEYS;
  }
  if (mappingKeyPath[0] === 'properties' && mappingKeyPath.length === 2) {
    return PROPERTY_SETTINGS_KEYS;
  }
  return null;
}

/**
 * Gets the keys to suggest at a key position: the mapping's keys, minus those already there.
 *
 * @remarks
 * A mapping without all its required keys gets only the first one missing:
 * `type`, then `name` in a view; `property`, then `direction` in a sort item or `groupBy`.
 * After that, a view also gets its type's options, and keys its type saves without declaring them.
 * A filter has only one key, so a filter that has one gets none.
 * Keys that Obsidian's Bases view never sets aren't suggested, nor keys that need another key that isn't there yet.
 *
 * @param position - The key position, from `getKeyPosition()`.
 * @param readViewOptionKeys - Reads the option keys of a view type.
 * @returns The keys, in the schema's order, then the view's options.
 */
export function getKeySuggestions(position: KeyPosition, readViewOptionKeys: (viewType: string) => string[]): string[] {
  const schemaKeys: readonly string[] | null = getSchemaKeys(position.mappingKeyPath);
  if (schemaKeys == null) {
    return [];
  }

  if (isFilterMappingPath(position.mappingKeyPath) === true && position.existingKeys.length > 0) {
    return [];
  }

  // Required keys come first, one at a time
  const requiredKeys: readonly string[] = getRequiredKeys(position.mappingKeyPath);
  const missingRequiredKey: string | undefined = requiredKeys.find((key: string): boolean => position.existingKeys.includes(key) === false);
  if (missingRequiredKey != null) {
    return [missingRequiredKey];
  }

  const keys: string[] = [...schemaKeys];
  if (isViewPath(position.mappingKeyPath) === true && position.typeValue != null) {
    keys.push(
      ...readViewOptionKeys(position.typeValue),
      ...(UNDECLARED_VIEW_KEYS.get(position.typeValue) ?? [])
    );
  }

  const uniqueKeys: string[] = [...new Set(keys)];
  return uniqueKeys.filter((key: string): boolean => isSuggestedKey(key, position.existingKeys));
}

/**
 * Gets the values to suggest at a value position: a view's type, a sort direction, or the value of a view's option.
 *
 * @remarks
 * A view option's values depend on the option's type: a dropdown's choices, `true` and `false` for a toggle,
 * and the default of a slider or text option. A dropdown's empty choice is suggested as `""`.
 * A view's own keys, such as `name`, get no values, whatever its type's options declare.
 *
 * @param position - The value position, from `getValuePosition()`.
 * @param readViewTypes - Reads the registered view types.
 * @param readViewOptions - Reads the options of a view type.
 * @returns The values, in the order Obsidian lists them.
 */
export function getValueSuggestions(
  position: ValuePosition,
  readViewTypes: () => ViewType[],
  readViewOptions: (viewType: string) => BasesOptions[]
): ValueSuggestion[] {
  const key: string | undefined = position.keyPath.at(-1);
  const mappingKeyPath: string[] = position.keyPath.slice(0, -1);

  if (isSortPath(mappingKeyPath) === true && key === 'direction') {
    return SORT_DIRECTIONS.map((direction: string): ValueSuggestion => ({ value: direction }));
  }

  if (isViewPath(mappingKeyPath) === false || key == null) {
    return [];
  }

  if (key === 'type') {
    return readViewTypes().map((viewType: ViewType): ValueSuggestion => ({
      value: toYamlText(viewType.id),
      detail: viewType.name,
      icon: viewType.icon
    }));
  }

  if (VIEW_KEYS.includes(key) === true || position.typeValue == null) {
    return [];
  }

  const option: BasesOptions | undefined = readViewOptions(position.typeValue).find((viewOption: BasesOptions): boolean => viewOption.key === key);
  if (option == null) {
    return [];
  }
  return getOptionValueSuggestions(option);
}

/**
 * Gets the values to suggest for a view option, by the option's type.
 *
 * @param option - The view option.
 * @returns The values, or none for an option type without fixed values or a default.
 */
function getOptionValueSuggestions(option: BasesOptions): ValueSuggestion[] {
  switch (option.type) {
    case 'dropdown': {
      return Object.entries(option.options).map(([value, label]: [string, string]): ValueSuggestion => ({
        value: toYamlText(value),
        detail: label
      }));
    }
    case 'toggle': {
      return TOGGLE_VALUES.map((value: string): ValueSuggestion => ({ value }));
    }
    case 'slider': {
      return option.default == null ? [] : [{ value: String(option.default), detail: DEFAULT_DETAIL }];
    }
    case 'text': {
      return option.default == null ? [] : [{ value: toYamlText(option.default), detail: DEFAULT_DETAIL }];
    }
    default: {
      return [];
    }
  }
}

/**
 * Returns whether a key is suggested in a mapping, given the keys already there.
 *
 * @param key - The key.
 * @param existingKeys - Keys already in the mapping.
 * @returns `true` if the key isn't there yet, isn't left out of suggestions, and any key it needs is there.
 */
function isSuggestedKey(key: string, existingKeys: string[]): boolean {
  if (existingKeys.includes(key) === true || UNSUGGESTED_KEYS.has(key) === true) {
    return false;
  }

  const neededKey: string | undefined = KEYS_NEEDING_KEY.get(key);
  return neededKey == null || existingKeys.includes(neededKey) === true;
}

/**
 * Gets the keys a mapping must have, in the order they're suggested.
 *
 * @param mappingKeyPath - Key path of the mapping, from `getYamlKeyPath()`.
 * @returns The required keys, or none if the mapping has no required keys.
 */
function getRequiredKeys(mappingKeyPath: string[]): readonly string[] {
  if (isViewPath(mappingKeyPath) === true) {
    return REQUIRED_VIEW_KEYS;
  }
  if (isSortPath(mappingKeyPath) === true) {
    return SORT_KEYS;
  }
  return [];
}

/**
 * Returns whether a key path is a sort item's, or a view's `groupBy`: the mappings with `property` and `direction`.
 *
 * @param keyPath - Key path, from `getYamlKeyPath()`.
 * @returns `true` if the key path is a sort item's or a `groupBy`.
 */
function isSortPath(keyPath: string[]): boolean {
  const path: string = keyPath.join('/');
  return path === 'views/#/sort/#' || path === 'views/#/groupBy';
}

/**
 * Returns whether a key path is a view's: an item in the top-level `views`.
 *
 * @param keyPath - Key path, from `getYamlKeyPath()`.
 * @returns `true` if the key path is a view's.
 */
function isViewPath(keyPath: string[]): boolean {
  return keyPath.length === 2 && keyPath[0] === 'views' && keyPath[1] === '#';
}

/* ========================= TYPES ========================= */

/**
 * A value to suggest.
 */
export type ValueSuggestion = {
  /** The value as it's written in the file, in quotes if it needs them. */
  value: string;
  /** Grey text shown beside the value, such as the name Obsidian shows for it. */
  detail?: string;
  /** Icon shown before the value. */
  icon?: IconName;
};
