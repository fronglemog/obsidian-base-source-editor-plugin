/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import {
  EditorView,
} from '@codemirror/view';

import type {
  Extension
} from '@codemirror/state';

/**
 * 
 * @returns 
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