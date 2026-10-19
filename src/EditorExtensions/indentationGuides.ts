/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import {
  Prec,
  RangeSetBuilder
} from '@codemirror/state';

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

/* ========================= INDENTATION GUIDES ========================= */

/**
 * Mark decorations for indentation guides, by indent depth. Created on first use.
 *
 * @remarks
 * Each depth has its own `data-indent` attribute. CodeMirror joins neighbouring marks with equal specs
 * into one span, which would draw one guide instead of two.
 */
const indentDecorations: Decoration[] = [];

/**
 * Gets the mark decoration for an indent depth.
 *
 * @param depth - Indent depth, from 0.
 * @returns The decoration.
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
 * Counts the spaces at the start of a string.
 *
 * @param text - Text to check.
 * @returns The number of leading spaces.
 */
function countLeadingSpaces(text: string): number {
  let count: number = 0;

  while (text[count] === ' ') {
    count++;
  }

  return count;
}

/**
 * Adds a mark for each indent level of a line.
 *
 * @param builder - Builder to add the marks to.
 * @param line - The line.
 * @param indentWidth - Number of spaces per indent level.
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
 * Creates the indentation guide marks for the visible lines.
 *
 * @param view - The editor.
 * @returns The marks.
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
 * Draws indentation guides on the visible lines.
 */
const indentationGuides: Extension = ViewPlugin.fromClass(class {
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

/**
 * Gets the indentation guide extensions.
 *
 * @param extensionEnabled - Whether indentation guides are on.
 * @returns The extensions, or none if `extensionEnabled` is `false`.
 */
export function getIndentationGuidesExtensions(extensionEnabled: boolean): Extension {
  if (extensionEnabled === false) {
    return [];
  }

  const extensions: Extension = [
    // Ensures indentation guides wrap the whitespace marks rather than the other way around
    Prec.lowest(indentationGuides)
  ];
  return extensions;
}
