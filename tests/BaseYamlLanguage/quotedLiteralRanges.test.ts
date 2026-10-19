/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

import { getQuotedLiteralRanges } from 'src/BaseYamlLanguage/quotedLiteralRanges';
import type { DocumentRange } from 'src/BaseYamlLanguage/quotedLiteralRanges';


/* ========================= HELPERS ========================= */
/**
 * Gets the ranges for the quoted value at the end of a YAML line, such as `x: "abc"`.
 *
 * @param line - A line ending in a quoted value.
 * @returns The ranges, in positions of `line`.
 */
function getRangesForLine(line: string): DocumentRange[] {
  const quote: string = line.at(-1) as string;
  const contentStart: number = line.indexOf(quote) + 1;
  const content: string = line.slice(contentStart, -1);

  const quotedLiteralRanges: DocumentRange[] = getQuotedLiteralRanges(content, contentStart, quote);
  return quotedLiteralRanges;
}

/**
 * Joins the text of the ranges: the text the formula parser sees.
 *
 * @param line - The line the ranges are in.
 * @param ranges - Ranges in positions of `line`.
 * @returns The joined text.
 */
function getTextFromRanges(line: string, ranges: DocumentRange[]): string {
  return ranges.map((range: DocumentRange): string => line.slice(range.from, range.to)).join('');
}

/* ========================= TESTS ========================= */
describe('getQuotedLiteralRanges', () => {
  describe('double quotes', () => {
    test('returns the whole content when there are no escapes', () => {
      const line: string = 'x: "note[\'film - title\']"';
      expect(getRangesForLine(line)).toEqual([{ from: 4, to: 24 }]);
    });

    // eslint-disable-next-line unicorn/prefer-string-raw
    test('leaves out the backslash of \\"', () => {
      const line: string = String.raw`x: "note[\"film - title\"]"`;
      const ranges: DocumentRange[] = getRangesForLine(line);
      expect(ranges).toEqual([
        { from: 4, to: 9 },
        { from: 10, to: 23 },
        { from: 24, to: 26 }
      ]);
      expect(getTextFromRanges(line, ranges)).toBe('note["film - title"]');
    });

    test('leaves out the first backslash of \\\\', () => {
      const line: string = String.raw`x: "a\\b"`;
      expect(getTextFromRanges(line, getRangesForLine(line))).toBe(String.raw`a\b`);
    });

    // eslint-disable-next-line unicorn/prefer-string-raw
    test('leaves out the backslash of \\/', () => {
      const line: string = String.raw`x: "a\/b"`;
      expect(getTextFromRanges(line, getRangesForLine(line))).toBe('a/b');
    });

    // eslint-disable-next-line unicorn/prefer-string-raw
    test('keeps escapes that decode to a different character, such as \\n', () => {
      const line: string = String.raw`x: "a\nb"`;
      expect(getRangesForLine(line)).toEqual([{ from: 4, to: 8 }]);
    });

    test('handles escapes next to each other', () => {
      const line: string = String.raw`x: "\\\""`;
      expect(getTextFromRanges(line, getRangesForLine(line))).toBe(String.raw`\"`);
    });

    test('handles content that is only an escape', () => {
      const line: string = String.raw`x: "\""`;
      expect(getRangesForLine(line)).toEqual([{ from: 5, to: 6 }]);
    });

    test('keeps a backslash at the very end, as while typing', () => {
      expect(getQuotedLiteralRanges('abc\\', 4, '"')).toEqual([{ from: 4, to: 8 }]);
    });

    test('leaves doubled single quotes alone', () => {
      const line: string = 'x: "it\'\'s"';
      expect(getTextFromRanges(line, getRangesForLine(line))).toBe('it\'\'s');
    });
  });

  describe('single quotes', () => {
    test('leaves out the second quote of \'\'', () => {
      const line: string = 'x: \'it\'\'s\'';
      const ranges: DocumentRange[] = getRangesForLine(line);
      expect(ranges).toEqual([
        { from: 4, to: 7 },
        { from: 8, to: 9 }
      ]);
      expect(getTextFromRanges(line, ranges)).toBe('it\'s');
    });

    test('leaves backslashes alone', () => {
      const line: string = String.raw`x: 'a\''b'`;
      expect(getTextFromRanges(line, getRangesForLine(line))).toBe(String.raw`a\'b`);
    });
  });

  test('returns no ranges for empty content', () => {
    expect(getQuotedLiteralRanges('', 4, '"')).toEqual([]);
  });
});