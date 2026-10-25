/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import {
  getKeySuggestions,
  getSchemaKeys
} from 'src/Autocompletion/baseSchema';

import type { KeyPosition } from 'src/Autocompletion/cursorContext';

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
