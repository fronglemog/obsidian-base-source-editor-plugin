/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import { toPropertyExpression } from 'src/Autocompletion/propertyIds';

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
