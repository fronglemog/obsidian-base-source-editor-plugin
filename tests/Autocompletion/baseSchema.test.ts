/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import type { BasesOptions } from 'obsidian';

/* PLUGIN */
import {
  getKeySuggestions,
  getSchemaKeys,
  getValueSuggestions
} from 'src/Autocompletion/baseSchema';

import type { ValueSuggestion } from 'src/Autocompletion/baseSchema';

import type {
  KeyPosition,
  ValuePosition
} from 'src/Autocompletion/cursorContext';

import type { ViewType } from 'src/Autocompletion/viewRegistrations';

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
 * @returns The value position.
 */
function createValuePosition(keyPath: string[], typeValue: string | null = null): ValuePosition {
  return {
    keyPath,
    from: 0,
    to: 0,
    typeValue
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
    { key: 'image', type: 'property', displayName: 'Image property' },
    { key: 'name', type: 'text', displayName: 'Name', default: 'Untitled' }
  ];
}

/**
 * Gets the value suggestions at a value position, with the stand-ins for Obsidian.
 *
 * @param keyPath - Key path of the value.
 * @param typeValue - The mapping's `type` value.
 * @returns The value suggestions.
 */
function getValueSuggestionsAt(keyPath: string[], typeValue: string | null = null): ValueSuggestion[] {
  return getValueSuggestions(createValuePosition(keyPath, typeValue), readViewTypes, readViewOptions);
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

  test('a direction in a sort item or groupBy', () => {
    const directions: object[] = [{ value: 'ASC' }, { value: 'DESC' }];
    expect(getValueSuggestionsAt(['views', '#', 'sort', '#', 'direction'])).toEqual(directions);
    expect(getValueSuggestionsAt(['views', '#', 'groupBy', 'direction'])).toEqual(directions);
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
    expect(getValueSuggestionsAt(['views', '#', 'image'], 'table')).toEqual([]);
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
    expect(getValueSuggestionsAt(['views', '#', 'sort', '#', 'property'])).toEqual([]);
  });
});
