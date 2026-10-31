/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  BasesOptions,
  BasesPropertyId,
  IconName
} from 'obsidian';

/* PLUGIN */
import type {
  KeyPosition,
  ListItemPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

import type { ViewType } from 'src/Autocompletion/viewRegistrations';

import {
  getShownDisplayName,
  isGroupableProperty,
  isOrderableProperty,
  isSortableProperty,
  toFullPropertyId,
  toShortPropertyId
} from 'src/Autocompletion/propertyIds';

import type {
  PropertyCandidate,
  PropertyType
} from 'src/Autocompletion/propertyIds';

import { getSummarySuggestions } from 'src/Autocompletion/summaries';
import type { SummarySuggestion } from 'src/Autocompletion/summaries';
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

/**
 * Keys whose value holds other keys, by the key path of their mapping, joined with `/`.
 * `filters` can also be a single formula, but Obsidian's Bases view always writes keys there: `and` with a list.
 */
const KEYS_HOLDING_KEYS: ReadonlyMap<string, readonly string[]> = new Map([
  ['', ['filters', 'formulas', 'properties', 'summaries']],
  ['views/#', ['filters', 'groupBy', 'summaries', 'columnSize']]
]);

/** Keys whose value is a list, by the key path of their mapping, joined with `/`. A filter's `and`, `or` and `not` too. */
const KEYS_HOLDING_LISTS: ReadonlyMap<string, readonly string[]> = new Map([
  ['', ['views']],
  ['views/#', ['order', 'sort', 'groupOrder']]
]);

/** Values of `direction`, in a sort item and in `groupBy`. */
const SORT_DIRECTIONS: readonly string[] = ['ASC', 'DESC'];

/**
 * Icons of the sort directions: those of the sort items in the menu of a table's column header,
 * whatever the property's type. Obsidian's sort menu has none.
 */
const DIRECTION_ICONS: Readonly<Record<string, IconName>> = { ASC: 'lucide-arrow-down-wide-narrow', DESC: 'lucide-arrow-up-narrow-wide' };

/** Grey labels of the sort directions for a text property, or a property of another type: Obsidian's default. */
const TEXT_DIRECTION_LABELS: Readonly<Record<string, string>> = { ASC: 'A → Z', DESC: 'Z → A' };

/** Grey labels of the sort directions by the type of the property being sorted, where they aren't {@link TEXT_DIRECTION_LABELS}. */
const DIRECTION_LABELS: ReadonlyMap<PropertyType, Readonly<Record<string, string>>> = new Map<PropertyType, Readonly<Record<string, string>>>([
  ['number', { ASC: '0 → 1', DESC: '1 → 0' }],
  ['date', { ASC: 'Old to new', DESC: 'New to old' }]
]);

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
 * Gets what a key's value holds, from Obsidian's schema for `.base` files: a single value, other keys, or a list.
 *
 * @remarks
 * A property id under `properties` holds its settings, such as `displayName`.
 * A view's options take a single value, apart from a `multitext` option, which holds a list.
 * A key the schema doesn't describe, such as a formula's name, counts as a single value.
 *
 * @param position - The key position, from `getKeyPosition()` or `getPropertyKeyPosition()`.
 * @param key - The key.
 * @param readViewOptions - Reads the options of a view type.
 * @returns What the key's value holds.
 */
export function getKeyValueKind(position: KeyPosition, key: string, readViewOptions: (viewType: string) => BasesOptions[]): KeyValueKind {
  const mappingKeyPath: string[] = position.mappingKeyPath;

  if (isFilterMappingPath(mappingKeyPath) === true) {
    return FILTER_KEYS.includes(key) ? 'list' : 'value';
  }
  if (mappingKeyPath.length === 1 && mappingKeyPath[0] === 'properties') {
    return 'mapping';
  }

  const path: string = mappingKeyPath.join('/');
  if (KEYS_HOLDING_LISTS.get(path)?.includes(key) === true) {
    return 'list';
  }
  if (KEYS_HOLDING_KEYS.get(path)?.includes(key) === true) {
    return 'mapping';
  }

  if (isViewPath(mappingKeyPath) === true && position.typeValue != null) {
    const option: BasesOptions | undefined = readViewOptions(position.typeValue).find((viewOption: BasesOptions): boolean => viewOption.key === key);
    if (option?.type === 'multitext') {
      return 'list';
    }
  }
  return 'value';
}

/**
 * Gets the values to suggest at a value position: a view's type, the property or direction of a sort item or `groupBy`,
 * a summary name in a view's `summaries`, or the value of a view's option.
 *
 * @remarks
 * A sort item's or `groupBy`'s property is one Obsidian's sort or group-by editor offers, in the short form Obsidian writes.
 * A sort direction's grey label depends on the type of the property beside it, as in Obsidian's sort editor;
 * its icon is the one Obsidian's table column menu gives the matching sort item.
 * A summary name depends on the type of the property it summarises, as in Obsidian's summary menu.
 * A view option's values depend on the option's type: a dropdown's choices, `true` and `false` for a toggle,
 * the default of a slider or text option, and for a property option, the properties its filter lets through,
 * in full, as Obsidian writes them. A dropdown's empty choice is suggested as `""`.
 * A view's own keys, such as `name`, get no values, whatever its type's options declare.
 *
 * @param position - The value position, from `getValuePosition()`.
 * @param sources - Where the values come from; each is only read where the position needs it.
 * @returns The values, in the order Obsidian lists them.
 */
export function getValueSuggestions(position: ValuePosition, sources: ValueSources): ValueSuggestion[] {
  const key: string | undefined = position.keyPath.at(-1);
  const mappingKeyPath: string[] = position.keyPath.slice(0, -1);

  if (isSortPath(mappingKeyPath) === true && key === 'property') {
    const isOffered: (property: PropertyCandidate) => boolean = mappingKeyPath.at(-1) === 'groupBy' ? isGroupableProperty : isSortableProperty;
    return getPropertySuggestions(sources, toShortPropertyId, isOffered);
  }

  if (isSortPath(mappingKeyPath) === true && key === 'direction') {
    return getDirectionSuggestions(position.propertyValue, sources);
  }

  if (isViewMappingPath(mappingKeyPath, 'summaries') === true && key != null) {
    return getSummaryNameSuggestions(key, sources);
  }

  if (isViewPath(mappingKeyPath) === false || key == null) {
    return [];
  }

  if (key === 'type') {
    return sources.readViewTypes().map((viewType: ViewType): ValueSuggestion => ({
      value: toYamlText(viewType.id),
      detail: viewType.name,
      icon: viewType.icon
    }));
  }

  if (VIEW_KEYS.includes(key) === true || position.typeValue == null) {
    return [];
  }

  const option: BasesOptions | undefined = sources.readViewOptions(position.typeValue).find((viewOption: BasesOptions): boolean => viewOption.key === key);
  if (option == null) {
    return [];
  }
  return getOptionValueSuggestions(option, sources);
}

/**
 * Gets the property ids to suggest at a key position where keys are property ids: under `properties`,
 * and in a view's `summaries` and `columnSize`.
 *
 * @remarks
 * Under `properties`, every property, in full: Obsidian looks display names up by the full property id.
 * In a view's `summaries` and `columnSize`, only the view's columns, as Obsidian sets summaries and widths
 * from the columns: in the short form in `summaries`, and in full in `columnSize`, as Obsidian writes them.
 * Property ids already there are left out.
 *
 * @param position - The key position, from `getPropertyKeyPosition()`.
 * @param viewOrder - The property ids in the view's `order`, from `getViewOrder()`.
 * @param sources - Where the properties and display names come from.
 * @returns The property ids, or none if the mapping's keys aren't property ids.
 */
export function getPropertyKeySuggestions(position: KeyPosition, viewOrder: string[], sources: ValueSources): ValueSuggestion[] {
  const mappingKeyPath: string[] = position.mappingKeyPath;

  if (mappingKeyPath.length === 1 && mappingKeyPath[0] === 'properties') {
    return getPropertySuggestions(sources, toFullPropertyId, isAnyProperty, position.existingKeys);
  }

  const columns: Set<string> = new Set(viewOrder.map((propertyId: string): string => toFullPropertyId(propertyId)));
  const isColumn = (property: PropertyCandidate): boolean => columns.has(property.propertyId);

  if (isViewMappingPath(mappingKeyPath, 'summaries') === true) {
    return getPropertySuggestions(sources, toShortPropertyId, isColumn, position.existingKeys);
  }
  if (isViewMappingPath(mappingKeyPath, 'columnSize') === true) {
    return getPropertySuggestions(sources, toFullPropertyId, isColumn, position.existingKeys);
  }
  return [];
}

/**
 * Gets the property ids to suggest at a list item position in a view's `order`: the view's columns.
 *
 * @remarks
 * The properties Obsidian's "Properties" menu offers, in the short form Obsidian writes. Columns already there are left out.
 *
 * @param position - The list item position, from `getListItemPosition()`.
 * @param sources - Where the properties and display names come from.
 * @returns The property ids, or none if the list isn't a view's `order`.
 */
export function getListItemSuggestions(position: ListItemPosition, sources: ValueSources): ValueSuggestion[] {
  if (position.listKeyPath.join('/') !== 'views/#/order') {
    return [];
  }
  return getPropertySuggestions(sources, toShortPropertyId, isOrderableProperty, position.existingItems);
}

/**
 * Gets property ids to suggest, in the order Obsidian's property picker lists them,
 * each with its icon and the name Obsidian shows for it.
 *
 * @remarks
 * Each property id is shown, and matched against what's typed, without the quotes it may be written with.
 *
 * @param sources - Where the properties and display names come from.
 * @param writePropertyId - Writes a property id in the form Obsidian writes it here: short or full.
 * @param isOffered - Whether a property is offered here.
 * @param usedPropertyIds - Property ids already used here, in either form, which are left out.
 * @returns The property ids, quoted if they need it.
 */
function getPropertySuggestions(
  sources: ValueSources,
  writePropertyId: (propertyId: string) => string,
  isOffered: (property: PropertyCandidate) => boolean,
  usedPropertyIds: string[] = []
): ValueSuggestion[] {
  const usedFullIds: Set<string> = new Set(usedPropertyIds.map((propertyId: string): string => toFullPropertyId(propertyId)));
  const displayNames: Record<string, string> = sources.readDisplayNames();

  return sources.readProperties()
    .filter((property: PropertyCandidate): boolean => isOffered(property) === true && usedFullIds.has(property.propertyId) === false)
    .map((property: PropertyCandidate): ValueSuggestion => {
      const propertyId: string = writePropertyId(property.propertyId);
      return {
        value: toYamlText(propertyId),
        label: propertyId,
        detail: getShownDisplayName(property.propertyId, displayNames) ?? undefined,
        icon: property.icon ?? undefined
      };
    });
}

/**
 * Returns `true` for any property: where every property is offered.
 *
 * @returns `true`.
 */
function isAnyProperty(): boolean {
  return true;
}

/**
 * Gets the values to suggest for a view option, by the option's type.
 *
 * @param option - The view option.
 * @param sources - Where a property option's properties come from.
 * @returns The values, or none for an option type without fixed values or a default.
 */
function getOptionValueSuggestions(option: BasesOptions, sources: ValueSources): ValueSuggestion[] {
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
    case 'property': {
      const filter: ((propertyId: BasesPropertyId) => boolean) | undefined = option.filter;
      return getPropertySuggestions(sources, toFullPropertyId, (property: PropertyCandidate): boolean => filter == null || filter(property.propertyId));
    }
    default: {
      return [];
    }
  }
}

/**
 * Gets the sort directions, each with the grey label Obsidian's sort editor gives it for the property's type,
 * and its icon.
 *
 * @param propertyId - The property being sorted, or `null` if there's none yet.
 * @param sources - Where the property's type comes from.
 * @returns `ASC` and `DESC`, with their labels and icons.
 */
function getDirectionSuggestions(propertyId: string | null, sources: ValueSources): ValueSuggestion[] {
  const propertyType: PropertyType = propertyId == null ? 'other' : sources.readPropertyType(propertyId);
  const labels: Readonly<Record<string, string>> = DIRECTION_LABELS.get(propertyType) ?? TEXT_DIRECTION_LABELS;

  return SORT_DIRECTIONS.map((direction: string): ValueSuggestion => ({
    value: direction,
    detail: labels[direction],
    icon: DIRECTION_ICONS[direction]
  }));
}

/**
 * Gets the summary names for a property in a view's `summaries`, as Obsidian's summary menu lists them.
 *
 * @remarks
 * Each name is shown, and matched against what's typed, without the quotes it may be written with,
 * as in Obsidian's summary menu.
 * The grey label is the summary's formula. Obsidian shows the summary's result on the view's data instead,
 * which the editor can't work out. The icon is the result's, as in Obsidian.
 *
 * @param propertyId - The property being summarised: the key in the view's `summaries`.
 * @param sources - Where the property's type, the custom summaries and the result icons come from.
 * @returns The summary names, quoted if they need it.
 */
function getSummaryNameSuggestions(propertyId: string, sources: ValueSources): ValueSuggestion[] {
  const summaries: SummarySuggestion[] = getSummarySuggestions(sources.readPropertyType(propertyId), sources.readCustomSummaries());

  return summaries.map((summary: SummarySuggestion): ValueSuggestion => ({
    value: toYamlText(summary.name),
    label: summary.name,
    detail: summary.formula,
    icon: sources.readSummaryIcon(propertyId, summary.formula)
  }));
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

/**
 * Returns whether a key path is a mapping under a key of a view, such as `summaries`: property ids to summary names.
 *
 * @param keyPath - Key path, from `getYamlKeyPath()`.
 * @param key - The view's key, such as `summaries` or `columnSize`.
 * @returns `true` if the key path is that key's, in a view.
 */
function isViewMappingPath(keyPath: string[], key: string): boolean {
  return keyPath.length === 3 && isViewPath(keyPath.slice(0, 2)) === true && keyPath[2] === key;
}

/* ========================= TYPES ========================= */

/**
 * What a key's value holds: a single value, other keys, or a list.
 */
export type KeyValueKind = 'value' | 'mapping' | 'list';

/**
 * A value to suggest.
 */
export type ValueSuggestion = {
  /** The value as it's written in the file, in quotes if it needs them. */
  value: string;
  /**
   * Text shown in the popup, and matched against what's typed, if it isn't `value`:
   * for example a summary name without the quotes it's written with.
   */
  label?: string;
  /** Grey text shown beside the value, such as the name Obsidian shows for it. */
  detail?: string;
  /** Icon shown before the value. */
  icon?: IconName;
};

/**
 * Where value suggestions come from: Obsidian and the file. Each is only read where a value position needs it.
 */
export type ValueSources = {
  /** Reads the registered view types. */
  readViewTypes: () => ViewType[];
  /** Reads the options of a view type. */
  readViewOptions: (viewType: string) => BasesOptions[];
  /** Reads a property's type, from its property id. */
  readPropertyType: (propertyId: string) => PropertyType;
  /** Reads the custom summaries from the top-level `summaries`: each name, with its formula. */
  readCustomSummaries: () => Record<string, string>;
  /** Reads the icon of a summary's result, from the property id and the summary's formula. */
  readSummaryIcon: (propertyId: string, formula: string) => IconName;
  /** Reads the properties a Base can name, in full, in the order Obsidian's property picker lists them. */
  readProperties: () => PropertyCandidate[];
  /**
   * Reads the names Obsidian shows for properties, by property id: its own for the file properties,
   * replaced by the display names set under the Base's `properties`.
   */
  readDisplayNames: () => Record<string, string>;
};
