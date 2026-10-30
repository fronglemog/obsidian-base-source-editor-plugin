/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import type {
  BasesPropertyId,
  IconName
} from 'obsidian';

/* PLUGIN */
import {
  FILE_PROPERTIES,
  getPropertyCandidates,
  getShownDisplayName,
  isGroupableProperty,
  isOrderableProperty,
  isSortableProperty,
  toFullPropertyId,
  toPropertyExpression,
  toShortPropertyId
} from 'src/Autocompletion/propertyIds';

import type {
  NoteProperty,
  PropertyCandidate
} from 'src/Autocompletion/propertyIds';

/* ========================= HELPERS ========================= */

/**
 * Creates a property to test with.
 *
 * @param propertyId - Its full property id.
 * @param isAliases - Whether it's of the aliases type.
 * @returns The property.
 */
function createCandidate(propertyId: BasesPropertyId, isAliases: boolean = false): PropertyCandidate {
  return { propertyId, icon: null, isAliases };
}

/* ========================= TESTS ========================= */

describe('toPropertyExpression', () => {
  test('a note property, written short or with note.', () => {
    expect(toPropertyExpression('price')).toBe('note["price"]');
    expect(toPropertyExpression('film - year')).toBe('note["film - year"]');
    expect(toPropertyExpression('note.price')).toBe('note["price"]');
  });

  test('a formula and a file property', () => {
    expect(toPropertyExpression('formula.Film')).toBe('formula["Film"]');
    expect(toPropertyExpression('file.ctime')).toBe('file["ctime"]');
  });

  test('the file itself, written short or in full', () => {
    expect(toPropertyExpression('file')).toBe('file');
    expect(toPropertyExpression('file.file')).toBe('file');
  });

  test('a dot only names a type after note, formula or file', () => {
    expect(toPropertyExpression('film.year')).toBe('note["film.year"]');
    expect(toPropertyExpression('note.file.size')).toBe('note["file.size"]');
  });

  test('quotes in a name are escaped', () => {
    expect(toPropertyExpression('say "hi"')).toBe(String.raw`note["say \"hi\""]`);
  });
});

describe('toFullPropertyId', () => {
  test('a note property gets note., the file itself is file.file', () => {
    expect(toFullPropertyId('film - year')).toBe('note.film - year');
    expect(toFullPropertyId('file')).toBe('file.file');
  });

  test('a property id that starts with a type stays as it is', () => {
    expect(toFullPropertyId('note.price')).toBe('note.price');
    expect(toFullPropertyId('formula.Film')).toBe('formula.Film');
    expect(toFullPropertyId('file.ctime')).toBe('file.ctime');
  });
});

describe('toShortPropertyId', () => {
  test('a note property loses its note.', () => {
    expect(toShortPropertyId('note.film - year')).toBe('film - year');
    expect(toShortPropertyId('price')).toBe('price');
  });

  test('the file itself is file', () => {
    expect(toShortPropertyId('file.file')).toBe('file');
  });

  test('formulas and other file properties stay in full', () => {
    expect(toShortPropertyId('formula.Film')).toBe('formula.Film');
    expect(toShortPropertyId('file.ctime')).toBe('file.ctime');
  });

  test('a note property keeps note. where its name would read as another type, or as the file itself', () => {
    expect(toShortPropertyId('note.file.size')).toBe('note.file.size');
    expect(toShortPropertyId('note.formula')).toBe('note.formula');
    expect(toShortPropertyId('note.file')).toBe('note.file');
    expect(toShortPropertyId('note.film.year')).toBe('film.year');
  });
});

describe('getShownDisplayName', () => {
  test('the name Obsidian shows, looked up by the full property id, where it differs from the name', () => {
    const displayNames: Record<string, string> = { 'note.title': 'Title', 'file.ctime': 'created time', 'file.name': 'name', 'note.price': 'price' };
    expect(getShownDisplayName('title', displayNames)).toBe('Title');
    expect(getShownDisplayName('file.ctime', displayNames)).toBe('created time');
    expect(getShownDisplayName('file.name', displayNames)).toBeNull();
    expect(getShownDisplayName('price', displayNames)).toBeNull();
  });

  test('nothing for a property without a display name', () => {
    expect(getShownDisplayName('formula.Film', {})).toBeNull();
    expect(getShownDisplayName('price', {})).toBeNull();
  });
});

describe('getPropertyCandidates', () => {
  test('the file properties, the formulas, then the note properties, in full, each with its icon', () => {
    const noteProperties: NoteProperty[] = [
      { name: 'aliases', icon: 'lucide-forward', isAliases: true },
      { name: 'film - year', icon: 'lucide-binary', isAliases: false }
    ];
    const candidates: PropertyCandidate[] = getPropertyCandidates(noteProperties, ['Film'], (propertyId: BasesPropertyId): IconName | null => (propertyId === 'file.ctime' ? 'lucide-clock' : null));

    expect(candidates.map((candidate: PropertyCandidate): string => candidate.propertyId)).toEqual([
      ...FILE_PROPERTIES, 'formula.Film', 'note.aliases', 'note.film - year'
    ]);
    expect(candidates.find((candidate: PropertyCandidate): boolean => candidate.propertyId === 'file.ctime')?.icon).toBe('lucide-clock');
    expect(candidates.find((candidate: PropertyCandidate): boolean => candidate.propertyId === 'file.name')?.icon).toBeNull();
    expect(candidates.find((candidate: PropertyCandidate): boolean => candidate.propertyId === 'formula.Film')?.icon).toBe('lucide-square-function');
    expect(candidates.find((candidate: PropertyCandidate): boolean => candidate.propertyId === 'note.aliases')).toEqual({ propertyId: 'note.aliases', icon: 'lucide-forward', isAliases: true });
  });
});

describe('the properties each of Obsidian\'s editors offers', () => {
  test('sorting: everything but the file itself and its backlinks', () => {
    expect(isSortableProperty(createCandidate('file.file'))).toBe(false);
    expect(isSortableProperty(createCandidate('file.backlinks'))).toBe(false);
    expect(isSortableProperty(createCandidate('file.name'))).toBe(true);
    expect(isSortableProperty(createCandidate('note.aliases', true))).toBe(true);
  });

  test('grouping: no file names, paths or times, and no aliases', () => {
    for (const propertyId of ['file.file', 'file.path', 'file.ctime', 'file.mtime', 'file.name', 'file.fullname', 'file.basename'] as const) {
      expect(isGroupableProperty(createCandidate(propertyId))).toBe(false);
    }
    expect(isGroupableProperty(createCandidate('note.aliases', true))).toBe(false);
    expect(isGroupableProperty(createCandidate('file.folder'))).toBe(true);
    expect(isGroupableProperty(createCandidate('note.price'))).toBe(true);
  });

  test('columns: everything but the file itself', () => {
    expect(isOrderableProperty(createCandidate('file.file'))).toBe(false);
    expect(isOrderableProperty(createCandidate('file.backlinks'))).toBe(true);
  });
});
