/* ========================= IMPORTS ========================= */
/* YAML */
import { visit } from 'yaml';

import type {
  Document,
  Range,
  Scalar
} from 'yaml';

/* ========================= YAML ERROR RANGE ========================= */

/** A range of the document's text, as character offsets. */
export type TextRange = {
  from: number;
  to: number;
};

/** Characters that end a word, besides whitespace and a `:` before whitespace ({@link isWordCharacter}). */
const WORD_DELIMITERS: string = ',[]{}';

/** The closing character of each kind of quoted value. */
const QUOTE_CLOSING_CHARACTERS: Partial<Record<NonNullable<Scalar['type']>, string>> = {
  QUOTE_DOUBLE: '"',
  QUOTE_SINGLE: '\''
};

/**
 * Gets the range to underline for a YAML error.
 *
 * @remarks
 * The `yaml` package often reports an error on whitespace or at the end of the file, where an underline
 * would be invisible or far from the mistake. These rules are tried in order, and the first that fits is used:
 * 1. An unclosed quote, `[` or `{`: from where it opens to the end of that line.
 * 2. Visible text: the key or value that starts there, otherwise the word.
 * 3. Indentation: the next word on the same line.
 * 4. The end of a line or of the file: the last word before it.
 *
 * The range never goes past the end of the line it starts on, and is at least one character wide.
 *
 * @param document - The document, from `parseDocument()`.
 * @param text - The text it was parsed from. Lines end with `\n`, as in CodeMirror's `doc.toString()`.
 * @param errorPosition - Where the package reports the error: the start of the error's `pos`.
 * @returns The range to underline. It's empty only when `text` is.
 */
export function getYamlErrorRange(document: Document, text: string, errorPosition: number): TextRange {
  const position: number = Math.max(0, Math.min(errorPosition, text.length));
  return clipToLine(text, getUnclippedRange(document, text, position));
}

/**
 * Applies rules 1 to 4 of {@link getYamlErrorRange}.
 *
 * @param document - The document.
 * @param text - Its text.
 * @param position - Where the error is reported, within the text.
 * @returns The range, which can still run past the end of its line.
 */
function getUnclippedRange(document: Document, text: string, position: number): TextRange {
  // Rule 1
  const unclosedStart: number | null = getUnclosedValueStart(document, text, position);
  if (unclosedStart != null) {
    return { from: unclosedStart, to: getLineEnd(text, unclosedStart) };
  }

  const character: string | undefined = text[position];

  // Rule 2
  if (character != null && isWhitespace(character) === false) {
    return getScalarRangeAt(document, position) ?? getWordAt(text, position);
  }

  // Rule 3
  if (character === ' ' || character === '\t') {
    const nextVisible: number | null = getNextVisibleOnLine(text, position);
    if (nextVisible != null) {
      return getWordAt(text, nextVisible);
    }
  }

  // Rule 4, also used for spaces with nothing after them on their line
  return getLastWordBefore(text, position);
}

/**
 * Finds a quoted value, `[…]` or `{…}` that isn't closed and ends where an error is reported.
 *
 * @remarks
 * The package reports an unclosed value where the value runs out, often at the end of the file, and the value's
 * range ends exactly there. A closed value can end there too, for example `"a"` in `name: "a"b`, where the error
 * is the `b`. So the value's text must also not end with its closing character.
 *
 * @param document - The document.
 * @param text - Its text.
 * @param position - Where the error is reported.
 * @returns Where the unclosed value starts (its opening quote or bracket), or `null` if no value fits.
 */
function getUnclosedValueStart(document: Document, text: string, position: number): number | null {
  let start: number | null = null;

  const checkValue = (range: Range | null | undefined, closingCharacter: string): symbol | undefined => {
    if (range == null || range[1] !== position) {
      return undefined;
    }

    if (text.slice(range[0], range[1]).trimEnd().endsWith(closingCharacter)) {
      return undefined;
    }

    start = range[0];
    return visit.BREAK;
  };

  visit(document, {
    Scalar: (_key, scalar) => {
      const closingCharacter: string | undefined = scalar.type == null ? undefined : QUOTE_CLOSING_CHARACTERS[scalar.type];
      return closingCharacter == null ? undefined : checkValue(scalar.range, closingCharacter);
    },
    Seq: (_key, seq) => (seq.flow === true ? checkValue(seq.range, ']') : undefined),
    Map: (_key, map) => (map.flow === true ? checkValue(map.range, '}') : undefined)
  });

  return start;
}

/**
 * Finds the key or value that starts at a position: a plain or quoted scalar, or an alias.
 *
 * @remarks
 * Lists and maps are left out on purpose. A list starts at its first `-`, so an error on a `-` would
 * otherwise underline the whole item.
 *
 * @param document - The document.
 * @param position - Where the error is reported.
 * @returns The scalar's or alias's range, or `null` if none starts there.
 */
function getScalarRangeAt(document: Document, position: number): TextRange | null {
  let found: TextRange | null = null;

  const checkStart = (range: Range | null | undefined): symbol | undefined => {
    if (range == null || range[0] !== position || range[1] <= position) {
      return undefined;
    }

    found = { from: range[0], to: range[1] };
    return visit.BREAK;
  };

  visit(document, {
    Scalar: (_key, scalar) => checkStart(scalar.range),
    Alias: (_key, alias) => checkStart(alias.range)
  });

  return found;
}

/**
 * Gets the word at a position, or the single character there if it isn't part of a word.
 *
 * @param text - The document's text.
 * @param position - A position with a character after it.
 * @returns The word's range.
 */
function getWordAt(text: string, position: number): TextRange {
  if (isWordCharacter(text, position) === false) {
    return { from: position, to: position + 1 };
  }

  let from: number = position;
  while (from > 0 && isWordCharacter(text, from - 1)) {
    from--;
  }

  let to: number = position + 1;
  while (isWordCharacter(text, to)) {
    to++;
  }

  return { from, to };
}

/**
 * Finds the first visible character after spaces and tabs, on the same line.
 *
 * @param text - The document's text.
 * @param position - A position on a space or tab.
 * @returns The character's position, or `null` if the line has nothing visible after `position`.
 */
function getNextVisibleOnLine(text: string, position: number): number | null {
  let index: number = position;
  while (index < text.length && text[index] !== '\n' && isWhitespace(text[index])) {
    index++;
  }

  if (index >= text.length || text[index] === '\n') {
    return null;
  }
  return index;
}

/**
 * Gets the last word before a position, on an earlier line if needed.
 *
 * @remarks
 * When the last visible text ends in punctuation, the word attached to it is used, so `views:` gives `views`.
 *
 * @param text - The document's text.
 * @param position - Where the error is reported.
 * @returns The word's range, the last visible character if no word is attached to it,
 * or the document's first character if there's no visible text before `position`.
 */
function getLastWordBefore(text: string, position: number): TextRange {
  let lastVisible: number = position - 1;
  while (lastVisible >= 0 && isWhitespace(text[lastVisible])) {
    lastVisible--;
  }

  if (lastVisible < 0) {
    return { from: 0, to: Math.min(1, text.length) };
  }

  // Back over punctuation, to a word attached to it
  let index: number = lastVisible;
  while (index >= 0 && isWhitespace(text[index]) === false && isWordCharacter(text, index) === false) {
    index--;
  }

  if (index >= 0 && isWordCharacter(text, index)) {
    return getWordAt(text, index);
  }
  return { from: lastVisible, to: lastVisible + 1 };
}

/**
 * Cuts a range at the end of the line it starts on, keeping it at least one character wide.
 *
 * @param text - The document's text.
 * @param range - The range.
 * @returns The range, ending no later than its first line.
 */
function clipToLine(text: string, range: TextRange): TextRange {
  const to: number = Math.min(range.to, getLineEnd(text, range.from));
  return { from: range.from, to: Math.max(to, Math.min(range.from + 1, text.length)) };
}

/**
 * Gets the end of the line a position is on.
 *
 * @param text - The document's text.
 * @param position - A position in the text.
 * @returns The position of the line's `\n`, or the end of the text on the last line.
 */
function getLineEnd(text: string, position: number): number {
  const index: number = text.indexOf('\n', position);
  return index === -1 ? text.length : index;
}

/**
 * Returns whether the character at a position is part of a word.
 *
 * @remarks
 * Whitespace and `,[]{}` end a word. So does a `:` followed by whitespace or the end of the text, which is how YAML
 * ends a key. Any other `:` is part of the text, so `type:table` is one word.
 *
 * @param text - The document's text.
 * @param index - The character's position.
 * @returns `true` if it's part of a word, `false` otherwise, or past the end of the text.
 */
function isWordCharacter(text: string, index: number): boolean {
  const character: string | undefined = text[index];
  if (character == null || isWhitespace(character) || WORD_DELIMITERS.includes(character)) {
    return false;
  }

  if (character === ':') {
    const next: string | undefined = text[index + 1];
    return next != null && isWhitespace(next) === false;
  }
  return true;
}

/**
 * Returns whether a character is whitespace, including line breaks.
 *
 * @param character - The character, or `undefined` past the end of the text.
 * @returns `true` for whitespace, `false` for anything else, including `undefined`.
 */
function isWhitespace(character: string | undefined): boolean {
  return character != null && /\s/.test(character);
}
