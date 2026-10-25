/* ========================= IMPORTS ========================= */
/* PLUGIN */
import type { KeyPosition } from 'src/Autocompletion/cursorContext';
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
