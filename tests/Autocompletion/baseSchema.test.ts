/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import type {
  BasesOptions,
  IconName
} from 'obsidian';

/* PLUGIN */
import {
  getKeySuggestions,
  getListItemSuggestions,
  getPropertyKeySuggestions,
  getSchemaKeys,
  getValueSuggestions
} from 'src/Autocompletion/baseSchema';

import type {
  ValueSources,
  ValueSuggestion
} from 'src/Autocompletion/baseSchema';

import type {
  KeyPosition,
  ListItemPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

import type { ViewType } from 'src/Autocompletion/viewRegistrations';
import type {
  PropertyCandidate,
  PropertyType
} from 'src/Autocompletion/propertyIds';

/* ========================= TEST DATA ========================= */

/** Types of the properties the stand-in reader knows. */
const PROPERTY_TYPES: Record<string, PropertyType> = {
  'price': 'number',
  'file.ctime': 'date',
  'done': 'checkbox'
};

/* ========================= HELPERS ========================= */

/**
 * Creates a key position for a mapping, as the cursor context would give it.
 *
 * @param mappingKeyPath - Key path of the mapping.
 * @param existingKeys - Keys already in the mapping.
 * @param typeValue - The mapping's `type` value.
 * @returns The key position.
 */
function createKeyPosition(mappingKeyPath: string[], existingKeys: string[] = [], typeValue: string | null = null): KeyPosition {
  return {
    mappingKeyPath,
    from: 0,
    to: 0,
    isRename: false,
    existingKeys,
    typeValue
  };
}

/**
 * Stands in for the view options read from Obsidian: `rowHeight` for a table, `cardSize` for cards.
 *
 * @param viewType - The view's type.
 * @returns The view type's option keys.
 */
function readViewOptionKeys(viewType: string): string[] {
  if (viewType === 'table') {
    return ['rowHeight'];
  }
  if (viewType === 'cards') {
    return ['cardSize'];
  }
  return [];
}

/**
 * Creates a value position, as the cursor context would give it.
 *
 * @param keyPath - Key path of the value.
 * @param typeValue - The mapping's `type` value.
 * @param propertyValue - The mapping's `property` value.
 * @returns The value position.
 */
function createValuePosition(keyPath: string[], typeValue: string | null = null, propertyValue: string | null = null): ValuePosition {
  return {
    keyPath,
    from: 0,
    to: 0,
    typeValue,
    propertyValue
  };
}

/**
 * Stands in for the view types read from Obsidian.
 *
 * @returns Two view types.
 */
function readViewTypes(): ViewType[] {
  return [
    { id: 'table', name: 'Table', icon: 'lucide-table' },
    { id: 'cards', name: 'Cards', icon: 'lucide-layout-grid' }
  ];
}

/**
 * Stands in for the view options read from Obsidian: one of each type that has values to suggest, and one that hasn't.
 *
 * @param viewType - The view's type.
 * @returns The view type's options.
 */
function readViewOptions(viewType: string): BasesOptions[] {
  if (viewType !== 'table') {
    return [];
  }
  return [
    { key: 'rowHeight', type: 'dropdown', displayName: 'Row height', options: { '': 'Short', medium: 'Medium' } },
    { key: 'indentProperties', type: 'toggle', displayName: 'Indent properties', default: false },
    { key: 'cardSize', type: 'slider', displayName: 'Card size', default: 200 },
    { key: 'separator', type: 'text', displayName: 'Property separator', default: ', ' },
    { key: 'caption', type: 'text', displayName: 'Caption' },
    { key: 'image', type: 'property', displayName: 'Image property', filter: (propertyId: string): boolean => propertyId === 'file.file' || propertyId.startsWith('file.') === false },
    { key: 'name', type: 'text', displayName: 'Name', default: 'Untitled' }
  ];
}

/**
 * Stands in for the property types read from Obsidian.
 *
 * @param propertyId - The property id.
 * @returns The property's type from {@link PROPERTY_TYPES}, or `'other'`.
 */
function readPropertyType(propertyId: string): PropertyType {
  return PROPERTY_TYPES[propertyId] ?? 'other';
}

/**
 * Stands in for the custom summaries read from the file.
 *
 * @returns One custom summary, with a name that needs quotes.
 */
function readCustomSummaries(): Record<string, string> {
  return { 'Top: 2': 'values.slice(0, 2)' };
}

/**
 * Stands in for the summary result icons read from Obsidian.
 *
 * @param _propertyId - The property being summarised.
 * @param formula - The summary's formula.
 * @returns The list icon for a formula that slices the values, the number icon for any other.
 */
function readSummaryIcon(_propertyId: string, formula: string): IconName {
  return formula.startsWith('values.slice(') ? 'lucide-list' : 'lucide-binary';
}

/**
 * Stands in for the properties read from Obsidian and the file: some file properties, a formula,
 * an aliases property, and a note property whose name needs quotes.
 *
 * @returns The properties, in the order Obsidian's property picker lists them.
 */
function readProperties(): PropertyCandidate[] {
  return [
    { propertyId: 'file.file', icon: 'lucide-file', isAliases: false },
    { propertyId: 'file.name', icon: 'lucide-text', isAliases: false },
    { propertyId: 'file.ctime', icon: 'lucide-clock', isAliases: false },
    { propertyId: 'file.backlinks', icon: 'lucide-list', isAliases: false },
    { propertyId: 'formula.Film', icon: 'lucide-square-function', isAliases: false },
    { propertyId: 'note.aliases', icon: 'lucide-forward', isAliases: true },
    { propertyId: 'note.film - year', icon: 'lucide-binary', isAliases: false },
    { propertyId: 'note.File: name', icon: 'lucide-text', isAliases: false }
  ];
}

/**
 * Stands in for the names Obsidian shows: its own for two file properties, one replaced by the file's display name,
 * and a note property's display name.
 *
 * @returns The names, by full property id.
 */
function readDisplayNames(): Record<string, string> {
  return { 'file.ctime': 'created time', 'file.name': 'File', 'note.film - year': 'Year' };
}

/** The stand-ins for Obsidian and the file. */
const SOURCES: ValueSources = {
  readViewTypes,
  readViewOptions,
  readPropertyType,
  readCustomSummaries,
  readSummaryIcon,
  readProperties,
  readDisplayNames
};

/**
 * Gets the labels of suggestions, which are the property ids as written, without quotes.
 *
 * @param suggestions - The suggestions.
 * @returns Their labels.
 */
function getLabels(suggestions: ValueSuggestion[]): (string | undefined)[] {
  return suggestions.map((suggestion: ValueSuggestion): string | undefined => suggestion.label);
}

/**
 * Gets the value suggestions at a value position, with the stand-ins for Obsidian.
 *
 * @param keyPath - Key path of the value.
 * @param typeValue - The mapping's `type` value.
 * @param propertyValue - The mapping's `property` value.
 * @returns The value suggestions.
 */
function getValueSuggestionsAt(keyPath: string[], typeValue: string | null = null, propertyValue: string | null = null): ValueSuggestion[] {
  return getValueSuggestions(createValuePosition(keyPath, typeValue, propertyValue), SOURCES);
}

/* ========================= TESTS ========================= */

describe('getSchemaKeys', () => {
  test('the top level', () => {
    expect(getSchemaKeys([])).toEqual(['filters', 'formulas', 'properties', 'summaries', 'views', 'newItemFolder', 'newItemTemplate']);
  });

  test('a filter written as a mapping', () => {
    expect(getSchemaKeys(['filters'])).toEqual(['and', 'or', 'not']);
    expect(getSchemaKeys(['views', '#', 'filters'])).toEqual(['and', 'or', 'not']);
    expect(getSchemaKeys(['filters', 'or', '#'])).toEqual(['and', 'or', 'not']);
  });

  test('a view, a sort item, groupBy and a property\'s settings', () => {
    expect(getSchemaKeys(['views', '#'])).toEqual(['type', 'name', 'filters', 'order', 'sort', 'groupBy', 'groupOrder', 'limit', 'summaries']);
    expect(getSchemaKeys(['views', '#', 'sort', '#'])).toEqual(['property', 'direction']);
    expect(getSchemaKeys(['views', '#', 'groupBy'])).toEqual(['property', 'direction']);
    expect(getSchemaKeys(['properties', 'note.status'])).toEqual(['displayName']);
  });

  test('nothing for names you choose, property ids and lists', () => {
    expect(getSchemaKeys(['formulas'])).toBeNull();
    expect(getSchemaKeys(['summaries'])).toBeNull();
    expect(getSchemaKeys(['views', '#', 'summaries'])).toBeNull();
    expect(getSchemaKeys(['properties'])).toBeNull();
    expect(getSchemaKeys(['views'])).toBeNull();
    expect(getSchemaKeys(['filters', 'and'])).toBeNull();
    expect(getSchemaKeys(['views', '#', 'sort'])).toBeNull();
  });
});

describe('getKeySuggestions', () => {
  test('leaves out the keys already in the mapping', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#'], ['type', 'name', 'filters', 'order']), readViewOptionKeys)).toEqual(['sort', 'groupBy', 'limit', 'summaries']);
  });

  test('leaves out keys Obsidian\'s Bases view never sets', () => {
    expect(getKeySuggestions(createKeyPosition([], ['filters', 'views']), readViewOptionKeys)).toEqual(['formulas', 'properties', 'summaries']);
  });

  test('adds a view\'s options, and a table\'s undeclared keys', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#'], ['type', 'name'], 'table'), readViewOptionKeys)).toEqual(['filters', 'order', 'sort', 'groupBy', 'limit', 'summaries', 'rowHeight', 'columnSize']);
    expect(getKeySuggestions(createKeyPosition(['views', '#'], ['type', 'name'], 'cards'), readViewOptionKeys)).toEqual(['filters', 'order', 'sort', 'groupBy', 'limit', 'summaries', 'cardSize']);
  });

  test('no view options outside a view', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#', 'groupBy'], ['property'], 'table'), readViewOptionKeys)).toEqual(['direction']);
  });

  test('a sort item or groupBy offers property, then direction', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#', 'sort', '#']), readViewOptionKeys)).toEqual(['property']);
    expect(getKeySuggestions(createKeyPosition(['views', '#', 'sort', '#'], ['property']), readViewOptionKeys)).toEqual(['direction']);
    expect(getKeySuggestions(createKeyPosition(['views', '#', 'sort', '#'], ['property', 'direction']), readViewOptionKeys)).toEqual([]);
    expect(getKeySuggestions(createKeyPosition(['views', '#', 'groupBy']), readViewOptionKeys)).toEqual(['property']);
  });

  test('a view without its type offers only type', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#']), readViewOptionKeys)).toEqual(['type']);
    expect(getKeySuggestions(createKeyPosition(['views', '#'], ['name']), readViewOptionKeys)).toEqual(['type']);
  });

  test('a view with its type but no name offers only name', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#'], ['type'], 'table'), readViewOptionKeys)).toEqual(['name']);
  });

  test('offers groupOrder only once the view has a groupBy', () => {
    expect(getKeySuggestions(createKeyPosition(['views', '#'], ['type', 'name', 'groupBy']), readViewOptionKeys)).toEqual(['filters', 'order', 'sort', 'groupOrder', 'limit', 'summaries']);
  });

  test('a filter offers nothing once it has a key', () => {
    expect(getKeySuggestions(createKeyPosition(['filters']), readViewOptionKeys)).toEqual(['and', 'or', 'not']);
    expect(getKeySuggestions(createKeyPosition(['filters'], ['and']), readViewOptionKeys)).toEqual([]);
  });

  test('nothing for mappings the schema doesn\'t describe', () => {
    expect(getKeySuggestions(createKeyPosition(['formulas'], ['Title']), readViewOptionKeys)).toEqual([]);
  });
});

describe('getValueSuggestions', () => {
  test('a view\'s type: the view types, with their names and icons', () => {
    expect(getValueSuggestionsAt(['views', '#', 'type'])).toEqual([
      { value: 'table', detail: 'Table', icon: 'lucide-table' },
      { value: 'cards', detail: 'Cards', icon: 'lucide-layout-grid' }
    ]);
  });

  test('a direction in a sort item or groupBy, labelled by the property\'s type, with Obsidian\'s sort icons', () => {
    const sortDirection: string[] = ['views', '#', 'sort', '#', 'direction'];
    const groupDirection: string[] = ['views', '#', 'groupBy', 'direction'];
    const ascIcon: string = 'lucide-arrow-down-wide-narrow';
    const descIcon: string = 'lucide-arrow-up-narrow-wide';
    const textLabels: object[] = [{ value: 'ASC', detail: 'A → Z', icon: ascIcon }, { value: 'DESC', detail: 'Z → A', icon: descIcon }];

    expect(getValueSuggestionsAt(sortDirection, null, 'price')).toEqual([{ value: 'ASC', detail: '0 → 1', icon: ascIcon }, { value: 'DESC', detail: '1 → 0', icon: descIcon }]);
    expect(getValueSuggestionsAt(groupDirection, null, 'file.ctime')).toEqual([{ value: 'ASC', detail: 'Old to new', icon: ascIcon }, { value: 'DESC', detail: 'New to old', icon: descIcon }]);
    expect(getValueSuggestionsAt(sortDirection, null, 'done')).toEqual(textLabels);
    expect(getValueSuggestionsAt(sortDirection, null, 'title')).toEqual(textLabels);
    expect(getValueSuggestionsAt(groupDirection)).toEqual(textLabels);
  });

  test('a summary in a view\'s summaries: the summaries for the property\'s type and the custom ones, in Obsidian\'s order, with their result\'s icon', () => {
    const icon: string = 'lucide-binary';
    expect(getValueSuggestionsAt(['views', '#', 'summaries', 'done'])).toEqual([
      { value: 'Checked', label: 'Checked', detail: 'values.filter(value == true).length', icon },
      { value: 'Empty', label: 'Empty', detail: 'values.filter(value.isType("null")).length', icon },
      { value: 'Filled', label: 'Filled', detail: 'values.filter(!value.isType("null")).length', icon },
      { value: '"Top: 2"', label: 'Top: 2', detail: 'values.slice(0, 2)', icon: 'lucide-list' },
      { value: 'Unchecked', label: 'Unchecked', detail: 'values.filter(value == false).length', icon },
      { value: 'Unique', label: 'Unique', detail: 'values.unique().length', icon }
    ]);
  });

  test('a summary for a property whose type isn\'t known: the summaries of any type, and the custom ones', () => {
    const values: string[] = getValueSuggestionsAt(['views', '#', 'summaries', 'title']).map((suggestion: ValueSuggestion): string => suggestion.value);
    expect(values).toEqual(['Empty', 'Filled', '"Top: 2"', 'Unique']);
  });

  test('a dropdown option: its choices, with the empty one as ""', () => {
    expect(getValueSuggestionsAt(['views', '#', 'rowHeight'], 'table')).toEqual([
      { value: '""', detail: 'Short' },
      { value: 'medium', detail: 'Medium' }
    ]);
  });

  test('a toggle option: true and false', () => {
    expect(getValueSuggestionsAt(['views', '#', 'indentProperties'], 'table')).toEqual([{ value: 'true' }, { value: 'false' }]);
  });

  test('a slider or text option: its default, quoted if needed', () => {
    expect(getValueSuggestionsAt(['views', '#', 'cardSize'], 'table')).toEqual([{ value: '200', detail: 'Default' }]);
    expect(getValueSuggestionsAt(['views', '#', 'separator'], 'table')).toEqual([{ value: '", "', detail: 'Default' }]);
  });

  test('nothing for an option without a default, or of another type', () => {
    expect(getValueSuggestionsAt(['views', '#', 'caption'], 'table')).toEqual([]);
  });

  test('nothing for a view\'s own keys, even if its type declares an option with that key', () => {
    expect(getValueSuggestionsAt(['views', '#', 'name'], 'table')).toEqual([]);
  });

  test('nothing for an option of a view without a type, or of another type', () => {
    expect(getValueSuggestionsAt(['views', '#', 'rowHeight'])).toEqual([]);
    expect(getValueSuggestionsAt(['views', '#', 'rowHeight'], 'cards')).toEqual([]);
  });

  test('nothing outside views, sort items and groupBy', () => {
    expect(getValueSuggestionsAt(['type'])).toEqual([]);
    expect(getValueSuggestionsAt(['properties', 'note.status', 'displayName'])).toEqual([]);
  });
});

describe('property ids', () => {
  test('a sort item\'s property: every property but the file itself and its backlinks, short, with its icon and display name', () => {
    expect(getValueSuggestionsAt(['views', '#', 'sort', '#', 'property'])).toEqual([
      { value: 'file.name', label: 'file.name', detail: 'File', icon: 'lucide-text' },
      { value: 'file.ctime', label: 'file.ctime', detail: 'created time', icon: 'lucide-clock' },
      { value: 'formula.Film', label: 'formula.Film', icon: 'lucide-square-function' },
      { value: 'aliases', label: 'aliases', icon: 'lucide-forward' },
      { value: 'film - year', label: 'film - year', detail: 'Year', icon: 'lucide-binary' },
      { value: '"File: name"', label: 'File: name', icon: 'lucide-text' }
    ]);
  });

  test('groupBy\'s property: no file names, paths or times, and no aliases', () => {
    expect(getLabels(getValueSuggestionsAt(['views', '#', 'groupBy', 'property']))).toEqual(['file.backlinks', 'formula.Film', 'film - year', 'File: name']);
  });

  test('a property option: the properties its filter lets through, in full', () => {
    expect(getLabels(getValueSuggestionsAt(['views', '#', 'image'], 'table'))).toEqual(['file.file', 'formula.Film', 'note.aliases', 'note.film - year', 'note.File: name']);
  });

  test('an item in a view\'s order: every property but the file itself, short, without the columns already there', () => {
    const position: ListItemPosition = { listKeyPath: ['views', '#', 'order'], from: 0, to: 0, existingItems: ['film - year', 'note.aliases'] };
    expect(getLabels(getListItemSuggestions(position, SOURCES))).toEqual(['file.name', 'file.ctime', 'file.backlinks', 'formula.Film', 'File: name']);
  });

  test('nothing in another list', () => {
    const position: ListItemPosition = { listKeyPath: ['views', '#', 'groupOrder'], from: 0, to: 0, existingItems: [] };
    expect(getListItemSuggestions(position, SOURCES)).toEqual([]);
  });

  test('a key in a view\'s summaries: the view\'s columns without a summary, short', () => {
    const position: KeyPosition = createKeyPosition(['views', '#', 'summaries'], ['film - year']);
    expect(getLabels(getPropertyKeySuggestions(position, ['file.name', 'film - year', 'formula.Film'], SOURCES))).toEqual(['file.name', 'formula.Film']);
  });

  test('a key in a view\'s columnSize: the view\'s columns without a width, in full', () => {
    const position: KeyPosition = createKeyPosition(['views', '#', 'columnSize'], ['file.name']);
    expect(getLabels(getPropertyKeySuggestions(position, ['file.name', 'film - year', 'formula.Film'], SOURCES))).toEqual(['formula.Film', 'note.film - year']);
  });

  test('a key under properties: every property not there yet, in full', () => {
    const position: KeyPosition = createKeyPosition(['properties'], ['note.aliases', 'file.name']);
    expect(getLabels(getPropertyKeySuggestions(position, [], SOURCES))).toEqual(['file.file', 'file.ctime', 'file.backlinks', 'formula.Film', 'note.film - year', 'note.File: name']);
  });

  test('nothing in a mapping whose keys aren\'t property ids', () => {
    expect(getPropertyKeySuggestions(createKeyPosition(['views', '#']), ['file.name'], SOURCES)).toEqual([]);
  });
});
