/* ========================= IMPORTS ========================= */
import { RangeSetBuilder } from '@codemirror/state';

import type {
  Extension,
  Line,
  Text
} from '@codemirror/state';

import {
  Decoration,
  ViewPlugin
} from '@codemirror/view';

import type {
  DecorationSet,
  EditorView,
  ViewUpdate
} from '@codemirror/view';

import { getIndentUnit } from '@codemirror/language';


/* ================================================== */

/**
 * One decoration per indent depth. Neighbouring marks with equal specs can be joined into
 * a single span, which would draw one guide instead of two, so each depth gets its own attribute.
 */
const indentDecorations: Decoration[] = [];

/**
 *
 * @param depth -
 * @returns
 */
function getIndentDecoration(depth: number): Decoration {
  let decoration: Decoration | undefined = indentDecorations[depth];

  if (decoration == null) {
    decoration = Decoration.mark({
      class: 'cm-indent',
      attributes: { 'data-indent': depth.toString() }
    });
    indentDecorations[depth] = decoration;
  }

  return decoration;
}

/**
 *
 * @param text -
 * @returns
 */
function countLeadingSpaces(text: string): number {
  let count: number = 0;

  while (text[count] === ' ') {
    count++;
  }

  return count;
}

/**
 *
 * @param builder -
 * @param line -
 * @param indentWidth -
 */
function addLineIndentDecorations(builder: RangeSetBuilder<Decoration>, line: Line, indentWidth: number): void {
  const lineDepth: number = Math.floor(countLeadingSpaces(line.text) / indentWidth);

  for (let depth: number = 0; depth < lineDepth; depth++) {
    const indentFrom: number = line.from + (depth * indentWidth);
    builder.add(
      indentFrom,
      indentFrom + indentWidth,
      getIndentDecoration(depth)
    );
  }
}

/**
 *
 * @param view -
 * @returns
 */
function getIndentDecorations(view: EditorView): DecorationSet {
  const doc: Text = view.state.doc;
  const indentWidth: number = getIndentUnit(view.state);
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const firstLineNumber: number = doc.lineAt(from).number;
    const lastLineNumber: number = doc.lineAt(to).number;

    for (let lineNumber: number = firstLineNumber; lineNumber <= lastLineNumber; lineNumber++) {
      addLineIndentDecorations(builder, doc.line(lineNumber), indentWidth);
    }
  }

  return builder.finish();
}

/**
 *
 */
export const indentationGuides: Extension = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = getIndentDecorations(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = getIndentDecorations(update.view);
    }
  }
},
{
  decorations: (plugin) => plugin.decorations
});
