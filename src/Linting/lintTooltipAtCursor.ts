/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import { forEachDiagnostic } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';

import { StateField } from '@codemirror/state';
import type {
  EditorState,
  SelectionRange,
  Transaction
} from '@codemirror/state';

import { showTooltip } from '@codemirror/view';
import type {
  Tooltip,
  TooltipView
} from '@codemirror/view';

/* ========================= LINT TOOLTIP AT CURSOR ========================= */

/** The errors at one position, and the range they cover together. */
export type DiagnosticsAtPosition = {
  from: number;
  to: number;
  diagnostics: Diagnostic[];
};

/**
 * Gets the errors whose underline includes a position, ends included.
 *
 * @param state - The editor state, with the lint package's errors.
 * @param position - The position.
 * @returns The errors, and the range from the first one's start to the last one's end, or `null` if there are none.
 */
export function getDiagnosticsAt(state: EditorState, position: number): DiagnosticsAtPosition | null {
  const found: DiagnosticsAtPosition[] = [];

  // `from` and `to` are the error's current position; the `Diagnostic` keeps the one from when it was created
  forEachDiagnostic(state, (diagnostic: Diagnostic, from: number, to: number): void => {
    if (from <= position && position <= to) {
      found.push({ from, to, diagnostics: [diagnostic] });
    }
  });

  if (found.length === 0) {
    return null;
  }

  return {
    from: Math.min(...found.map((entry: DiagnosticsAtPosition): number => entry.from)),
    to: Math.max(...found.map((entry: DiagnosticsAtPosition): number => entry.to)),
    diagnostics: found.flatMap((entry: DiagnosticsAtPosition): Diagnostic[] => entry.diagnostics)
  };
}

/**
 * Gets the tooltip for the errors at the cursor.
 *
 * @param state - The editor state.
 * @returns The tooltip, above the errors' text, or `null` if the selection isn't a cursor or there are no errors at it.
 */
function getLintTooltipAtCursor(state: EditorState): Tooltip | null {
  const selection: SelectionRange = state.selection.main;
  if (selection.empty === false) {
    return null;
  }

  const found: DiagnosticsAtPosition | null = getDiagnosticsAt(state, selection.head);
  if (found == null) {
    return null;
  }

  return {
    pos: found.from,
    end: found.to,
    above: true,
    create: (): TooltipView => createLintTooltipView(found.diagnostics)
  };
}

/**
 * Builds the tooltip's content, with the same elements and classes as the lint package's hover tooltip,
 * so the same styles apply to both.
 *
 * @remarks
 * Copied from the lint package's `diagnosticsTooltip()` and `renderDiagnostic()`, which it doesn't export,
 * without the parts the plugin's errors don't use (actions and the source label). One difference: the list
 * goes in a `div`, as the hover tooltip's list goes in its box, because CodeMirror adds its `cm-tooltip`
 * class to a tooltip's outermost element.
 *
 * Built with the main window's `createDiv()`: this tooltip is only used on phones and tablets, where Obsidian
 * has no popout windows.
 *
 * @param diagnostics - The errors to list.
 * @returns The tooltip's content.
 */
function createLintTooltipView(diagnostics: readonly Diagnostic[]): TooltipView {
  const container: HTMLDivElement = createDiv();
  const list: HTMLUListElement = container.createEl('ul', { cls: 'cm-tooltip-lint' });

  for (const diagnostic of diagnostics) {
    const item: HTMLLIElement = list.createEl('li', { cls: `cm-diagnostic cm-diagnostic-${diagnostic.severity}` });
    item.createSpan({ cls: 'cm-diagnosticText', text: diagnostic.message });
  }

  return { dom: container };
}

/**
 * Shows the errors' tooltip while the cursor is in an underline, for touch screens, which can't hover.
 *
 * @remarks
 * The tooltip shows when the cursor moves into an underline, for example after a tap, and hides as soon as the text
 * changes or the cursor leaves. A new lint result alone doesn't show it: otherwise, typing an opening quote would show
 * "Missing closing quote" at the cursor a moment later. The lint package's `nextDiagnostic` command uses the same rule.
 */
export const lintTooltipAtCursorField: StateField<Tooltip | null> = StateField.define<Tooltip | null>({
  create: (): Tooltip | null => null,

  update: (tooltip: Tooltip | null, transaction: Transaction): Tooltip | null => {
    if (transaction.docChanged) {
      return null;
    }

    // Only a transaction that sets the selection, such as a tap or an arrow key, can show it
    if (transaction.selection == null) {
      return tooltip;
    }
    return getLintTooltipAtCursor(transaction.state);
  },

  provide: (field: StateField<Tooltip | null>) => showTooltip.from(field)
});
