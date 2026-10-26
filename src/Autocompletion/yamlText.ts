/* ========================= YAML TEXT ========================= */

/** Text YAML reads back unchanged without quotes: a word, which may also contain digits, `-` and `_`. */
const PLAIN_TEXT: RegExp = /^[A-Za-z][\w-]*$/;

/** Words YAML reads as something other than text: booleans and null, in any case. */
const NON_TEXT_WORDS: RegExp = /^(?:true|false|null)$/i;

/**
 * Writes text as a YAML value, in double quotes if YAML wouldn't read it back as the same text without them.
 *
 * @remarks
 * Errs on the side of quoting: only plain words are left without quotes.
 * Text in JSON's double quotes is also valid YAML, with the same escapes.
 *
 * @param text - The text.
 * @returns The YAML value, such as `medium`, or `", "` for text that needs quotes.
 */
export function toYamlText(text: string): string {
  if (PLAIN_TEXT.test(text) === true && NON_TEXT_WORDS.test(text) === false) {
    return text;
  }
  return JSON.stringify(text);
}
