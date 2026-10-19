/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { setIcon } from 'obsidian';

/* CODEMIRROR */
import type { Completion } from '@codemirror/autocomplete';

/* ========================= RENDER OPTION ========================= */

/**
 * Renders the icon for a completion suggestion, as Obsidian's formula editor does. For CodeMirror's `addToOptions`.
 *
 * @remarks
 * Obsidian's completions store a Lucide icon ID in `type`.
 *
 * @param completion - The completion.
 * @returns The icon element, or `null` if the completion has no icon.
 */
export function renderCompletionIcon(completion: Completion): Node | null {
  if (completion.type == null || completion.type === '') {
    return null;
  }

  const iconEl: HTMLElement = createDiv('cm-custom-completionIcon suggestion-icon');
  setIcon(iconEl.createSpan('suggestion-flair'), completion.type);
  return iconEl;
}

/**
 * Renders a completion's detail as grey text, as Obsidian's formula editor does. For CodeMirror's `addToOptions`.
 *
 * @param completion - The completion.
 * @returns The detail element, or `null` if the completion has no detail.
 */
export function renderCompletionDetail(completion: Completion): Node | null {
  if (completion.detail == null || completion.detail === '') {
    return null;
  }

  const detailEl: HTMLElement = createDiv('cm-custom-completionDescription suggestion-aux');
  detailEl.createDiv({
    cls: 'suggestion-flair u-small',
    text: completion.detail
  });
  return detailEl;
}
