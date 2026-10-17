/* ========================= IMPORTS ========================= */

/* CODEMIRROR */
import {
  highlightWhitespace,
} from '@codemirror/view';

import type {
  Extension
} from '@codemirror/state';

/**
 *
 * @returns 
 */
export function getRenderWhitespaceExtensions(extensionEnabled: boolean): Extension {
  if (extensionEnabled === false) {
    return [];
  }

  const extensions: Extension = [
    highlightWhitespace()
  ];
  return extensions;
}