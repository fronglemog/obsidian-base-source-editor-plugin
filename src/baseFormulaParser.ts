/* ========================= IMPORTS ========================= */
import { 
  QueryController 
} from 'obsidian';

import type { 
  Parser 
} from '@lezer/common';


/* ======================================================= */

/**
 * Get the parser used by Obsidian for parsing Base formulas.
 * Accesses undocumented parts of the Obsidian API.
 * 
 * @returns `Parser`
 */
export function getBaseFormulaParser(): Parser | null {
  const proto = QueryController.prototype;
  // Accessing undocumented API... keep this guard.
  if (typeof proto.getEditorLanguageSupport !== 'function') {
    return null;
  }

  try {
    return proto.getEditorLanguageSupport.call({ mockContext: null }).language.parser;
  } catch {
    return null;
  }
}
