/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { QueryController } from 'obsidian';

/* CODEMIRROR */
import type { Parser } from '@lezer/common';

/* PLUGIN */
import { logError } from 'src/Util/logError';

/* ========================= getBaseFormulaParser ========================= */

const UNAVAILABLE_MESSAGE: string = 'formula highlighting is off, so formulas are shown as plain YAML.';

/**
 * Gets the parser Obsidian uses for Base formulas.
 *
 * @remarks
 * Uses undocumented Obsidian API. If it's missing, the reason is logged to the console.
 *
 * @returns The parser, or `null` if it can't be found.
 */
export function getBaseFormulaParser(): Parser | null {
  const proto = QueryController.prototype;
  // Accessing undocumented API... keep this guard.
  if (typeof proto.getEditorLanguageSupport !== 'function') {
    logError(`${UNAVAILABLE_MESSAGE} QueryController has no getEditorLanguageSupport().`);
    return null;
  }

  try {
    const parser: Parser = proto.getEditorLanguageSupport.call({ mockContext: null }).language.parser;
    return parser;
  } catch (error: unknown) {
    logError(`${UNAVAILABLE_MESSAGE} Couldn't get Obsidian's formula parser.`, error);
    return null;
  }
}
