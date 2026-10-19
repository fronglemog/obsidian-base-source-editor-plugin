/**
 * Characters that decode to themselves after a backslash in a double-quoted YAML string.
 */
const SELF_ESCAPED_CHARACTERS: string[] = ['"', '\\', '/'];

/**
 * Gets the ranges of a quoted literal's content that make up its decoded text, leaving out escape characters.
 *
 * @remarks
 * Left out: the backslash of `\"`, `\\` and `\/` in double quotes, and the second `'` of `''` in single quotes.
 * Other escapes, such as `\n`, decode to a different character, so they're kept.
 * The ranges use document positions, so they can be passed to a parser as an overlay.
 *
 * @param content - Text between the quotes, as written in the document.
 * @param contentStart - Document position of the first character of `content`.
 * @param quote - Quote character of the string: `"` or `'`.
 * @returns Document ranges, in order. Empty if `content` is empty.
 */
export function getQuotedLiteralRanges(content: string, contentStart: number, quote: string): DocumentRange[] {
  const ranges: DocumentRange[] = [];
  let rangeStart: number = 0;

  for (let index: number = 0; index < content.length; index++) {
    const skippedIndex: number | null = getSkippedIndex(content, index, quote);

    if (skippedIndex == null) {
      continue;
    }

    if (skippedIndex > rangeStart) {
      ranges.push({
        from: contentStart + rangeStart,
        to: contentStart + skippedIndex
      });
    }
    rangeStart = skippedIndex + 1;

    // Skip the escaped character, so `\\"` isn't read as `\` followed by `\"`
    index++;
  }

  if (content.length > rangeStart) {
    ranges.push({
      from: contentStart + rangeStart,
      to: contentStart + content.length
    });
  }

  return ranges;
}

/**
 * Gets the index of the escape character to leave out, if an escape starts at `index`.
 *
 * @param content - Text between the quotes.
 * @param index - Index in `content` to check.
 * @param quote - Quote character of the string.
 * @returns Index in `content` of the character to leave out, or `null` if no escape starts there.
 */
function getSkippedIndex(content: string, index: number, quote: string): number | null {
  const character: string | undefined = content[index];
  const nextCharacter: string | undefined = content[index + 1];

  if (nextCharacter == null) {
    return null;
  }

  const isDoubleQuoteEscape: boolean = (quote === '"') && (character === '\\') && SELF_ESCAPED_CHARACTERS.includes(nextCharacter);
  if (isDoubleQuoteEscape === true) {
    return index;
  }

  const isSingleQuoteEscape: boolean = (quote === '\'') && (character === '\'') && (nextCharacter === '\'');
  if (isSingleQuoteEscape === true) {
    return index + 1;
  }

  return null;
}

/**
 * A range of document text: the characters between positions `from` and `to`.
 */
export type DocumentRange = {
  from: number;
  to: number;
};
