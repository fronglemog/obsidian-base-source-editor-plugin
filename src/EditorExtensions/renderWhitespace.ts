/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import {
  highlightWhitespace,
} from '@codemirror/view';

import type {
  Extension
} from '@codemirror/state';

/* ========================= RENDER WHITESPACE ========================= */

/**
 * Gets the extensions that renders spaces and tabs in the Base Source editor.
 *
 * @param extensionEnabled - Whether rendering whitespace is on.
 * @returns The extensions, or none if `extensionEnabled` is `false`.
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
