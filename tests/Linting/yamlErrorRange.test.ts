/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* YAML */
import { parseDocument } from 'yaml';
import type { Document } from 'yaml';

/* PLUGIN */
import { getYamlErrorRange } from 'src/Linting/yamlErrorRange';
import type { TextRange } from 'src/Linting/yamlErrorRange';

/* ========================= HELPERS ========================= */

/**
 * Parses a Base's text and gets the range for each error the `yaml` package reports.
 *
 * @param text - The Base's text.
 * @returns One range per error.
 */
function getErrorRanges(text: string): TextRange[] {
  const document: Document = parseDocument(text, { prettyErrors: false });
  return document.errors.map((error): TextRange => getYamlErrorRange(document, text, error.pos[0]));
}

/**
 * Gets the text that would be underlined for each error in a Base.
 *
 * @param text - The Base's text.
 * @returns The underlined text, one entry per error.
 */
function getUnderlinedTexts(text: string): string[] {
  return getErrorRanges(text).map((range: TextRange): string => text.slice(range.from, range.to));
}

/* ========================= TESTS ========================= */

describe('getYamlErrorRange', () => {
  describe('rule 1: an unclosed quote or bracket, from where it opens to the end of that line', () => {
    test('an unclosed double quote, reported at the end of the file', () => {
      const text: string = 'formulas:\n  Title: "note.title\n  Year: note.year\nviews:\n  - type: table\n    name: Films\n';
      expect(getUnderlinedTexts(text)).toEqual(['"note.title']);
    });

    test('an unclosed single quote', () => {
      const text: string = 'formulas:\n  Title: \'note.title\n  Year: note.year\n';
      expect(getUnderlinedTexts(text)).toEqual(['\'note.title']);
    });

    test('an unclosed quote on the last line, with no line break after it', () => {
      expect(getUnderlinedTexts('formulas:\n  T: "abc')).toEqual(['"abc']);
    });

    test('an unclosed [, reported on the next line; its follow-on errors underline the next word', () => {
      const text: string = 'views:\n  - type: table\n    name: Films\n    order: [file.name, note.year\n  - type: cards\n    name: Cards\n';
      expect(getUnderlinedTexts(text)).toEqual(['[file.name, note.year', 'cards', 'cards']);
    });

    test('an unclosed [ at the end of the file', () => {
      const text: string = 'views:\n  - type: table\n    order: [file.name, note.year\n';
      expect(getUnderlinedTexts(text)).toEqual(['[file.name, note.year']);
    });

    test('an unclosed {', () => {
      const text: string = 'views:\n  - type: table\n    columnSize: {a: 1, b: 2\n    name: X\n';
      expect(getUnderlinedTexts(text)).toEqual(['{a: 1, b: 2']);
    });

    test('a closed quote that ends where another error starts isn\'t treated as unclosed', () => {
      // The `yaml` package reports an error on the `b`, exactly where `"a"` ends.
      // Rule 1 would underline to the end of the line, comment included; rule 2's word stops at the space.
      expect(getUnderlinedTexts('name: "a"b # note\n')).toEqual(['"a"b']);
    });
  });

  describe('rule 2: visible text, the key or value that starts there, otherwise the word', () => {
    test('a repeated key', () => {
      const text: string = 'views:\n  - type: table\n    name: Films\n    name: Again\n';
      expect(getUnderlinedTexts(text)).toEqual(['name']);
    });

    test('a repeated key with spaces is underlined whole', () => {
      const text: string = 'views:\n  - type: table\n    film - title: A\n    film - title: B\n';
      expect(getUnderlinedTexts(text)).toEqual(['film - title']);
    });

    test('a mis-indented - is underlined alone, not its whole list item; the follow-on error on the next line\'s indentation underlines its key', () => {
      const text: string = 'views:\n  - type: table\n    name: Films\n   - type: cards\n    name: Cards\n';
      expect(getUnderlinedTexts(text)).toEqual(['-', 'name']);
    });

    test('a character that isn\'t part of a word is underlined alone', () => {
      expect(getUnderlinedTexts('a: [b, c]]\n')).toEqual([']']);
    });
  });

  describe('rule 3: indentation, the next word on the same line', () => {
    test('tabs as indentation', () => {
      expect(getUnderlinedTexts('views:\n\t- type: table\n\t  name: Films\n')).toEqual(['-', 'name']);
    });
  });

  describe('rule 4: the end of a line or the file, the last word before it', () => {
    test('at the end of a line ending in a key\'s colon: the key, without the colon', () => {
      const text: string = 'views:\n  - type: table\n';
      const document: Document = parseDocument(text);
      const range: TextRange = getYamlErrorRange(document, text, text.indexOf('\n'));
      expect(text.slice(range.from, range.to)).toBe('views');
    });

    test('at the end of the file', () => {
      const text: string = 'views:\n  - type: table\n';
      const document: Document = parseDocument(text);
      const range: TextRange = getYamlErrorRange(document, text, text.length);
      expect(text.slice(range.from, range.to)).toBe('table');
    });
  });

  describe('never past the end of the first line', () => {
    test('an error spanning two lines is cut to its first line, and a : between letters is part of the word', () => {
      expect(getUnderlinedTexts('views:\n  - type:table\n    name: Films\n')).toEqual(['type:table']);
    });

    test('a second document is underlined on its --- line only', () => {
      expect(getUnderlinedTexts('views: []\n---\nfoo: 1\n')).toEqual(['---']);
    });
  });

  test('every range is at least one character wide, inside the text, and on one line', () => {
    const texts: string[] = [
      'formulas:\n  Title: "note.title\n  Year: note.year\n',
      'formulas:\n  T: "abc',
      'views:\n  - type: table\n    name: Films\n    order: [file.name, note.year\n  - type: cards\n    name: Cards\n',
      'views:\n  - type: table\n    name: Films\n   - type: cards\n    name: Cards\n',
      'views:\n\t- type: table\n\t  name: Films\n',
      'views:\n  - type:table\n    name: Films\n',
      'views: []\n---\nfoo: 1\n',
      'views: []\n---\n',
      'a: b: c\n',
      'name: "a"b\n'
    ];

    for (const text of texts) {
      const ranges: TextRange[] = getErrorRanges(text);
      expect(ranges.length).toBeGreaterThan(0);

      for (const range of ranges) {
        expect(range.to).toBeGreaterThan(range.from);
        expect(range.from).toBeGreaterThanOrEqual(0);
        expect(range.to).toBeLessThanOrEqual(text.length);
        expect(text.slice(range.from, range.to)).not.toContain('\n');
      }
    }
  });
});
