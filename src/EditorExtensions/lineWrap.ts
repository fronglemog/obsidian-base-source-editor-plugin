/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import {
  EditorView,
} from '@codemirror/view';

import type {
  Extension
} from '@codemirror/state';

/* ========================= LINE WRAP ========================= */

/**
 * Gets the line wrapping extensions.
 *
 * @param extensionEnabled - Whether line wrapping is on.
 * @returns The extensions, or none if `extensionEnabled` is `false`.
 */
export function getLineWrapExtensions(extensionEnabled: boolean): Extension {
  if (extensionEnabled === false) {
    return [];
  }

  const extensions: Extension = [
    EditorView.lineWrapping
  ];
  return extensions;
}
