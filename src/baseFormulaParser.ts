/* ========================= IMPORTS ========================= */
import { 
  QueryController 
} from 'obsidian';

import type { 
  LanguageSupport 
} from '@codemirror/language';

import type { 
  Parser 
} from '@lezer/common';


/* ======================================================= */

/**
 * Get the parser used by Obsidian for parsing Base formulas
 * @returns 
 */
export function getBaseFormulaParser(): Parser | null {
  const proto = QueryController.prototype;
  if (typeof proto.getEditorLanguageSupport !== 'function') {
    return null;
  }

  try {
    return proto.getEditorLanguageSupport.call({ mockContext: null }).language.parser;
  } catch {
    return null;
  }
}
