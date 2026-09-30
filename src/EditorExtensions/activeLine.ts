/* ========================= IMPORTS ========================= */
import { RangeSet } from '@codemirror/state';

import type {
  Extension,
  Range
} from '@codemirror/state';

import {
  Decoration,
  GutterMarker,
  gutterLineClass,
  ViewPlugin
} from '@codemirror/view';

import type {
  DecorationSet,
  EditorView,
  ViewUpdate
} from '@codemirror/view';


/* ================================================== */

const activeLineDecoration: Decoration = Decoration.line({ class: 'cm-active' });

function getActiveLineDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  let lastLineFrom: number = -1;

  for (const range of view.state.selection.ranges) {
    const lineFrom: number = view.lineBlockAt(range.head).from;
    if (lineFrom > lastLineFrom) {
      decorations.push(activeLineDecoration.range(lineFrom));
      lastLineFrom = lineFrom;
    }
  }

  return Decoration.set(decorations);
}

const activeLine: Extension = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = getActiveLineDecorations(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet) {
      this.decorations = getActiveLineDecorations(update.view);
    }
  }
}, {
  decorations: (plugin) => plugin.decorations
});

class ActiveLineGutterMarker extends GutterMarker {
  override elementClass: string = 'cm-active';
}

const activeLineGutterMarker: GutterMarker = new ActiveLineGutterMarker();

const activeLineGutter: Extension = gutterLineClass.compute(['selection'], (state) => {
  const markers: Range<GutterMarker>[] = [];
  let lastLineFrom: number = -1;

  for (const range of state.selection.ranges) {
    const lineFrom: number = state.doc.lineAt(range.head).from;
    if (lineFrom > lastLineFrom) {
      markers.push(activeLineGutterMarker.range(lineFrom));
      lastLineFrom = lineFrom;
    }
  }

  return RangeSet.of(markers);
});

/**
 * Highlights the line of each cursor, in both the editor content and the line number gutter.
 * Uses Obsidian's `cm-active` class, so themes style it like the markdown editor's active line.
 */
export const activeLineHighlight: Extension = [
  activeLineGutter,
  activeLine
];
