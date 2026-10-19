/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  App,
  Value
} from 'obsidian';

/* CODEMIRROR */
import {
  syntaxTree,
  syntaxTreeAvailable
} from '@codemirror/language';

import type {
  EditorState,
  Text
} from '@codemirror/state';

/* PLUGIN */
import { getFormulasFromBaseYaml } from 'src/BaseYamlLanguage/getFormulasFromBaseYaml';

import type {
  BasesFormula,
  BasesMockContext,
  BasesMockContextConstructor
} from 'src/obsidian-types';

/* ========================= FormulaContext ========================= */

/**
 * Obsidian's mock context for a Base Source editor, kept up to date with the formulas in the Base YAML document.
 */
export class FormulaContext {
  /**
   * Context to pass to Obsidian's formula language support.
   *
   * @remarks
   * A proxy that forwards to the latest mock context, so it stays the same object after each {@link FormulaContext.update}.
   */
  readonly context: BasesMockContext;

  private app: App;
  private mockContextClass: BasesMockContextConstructor;
  private current: BasesMockContext;

  /** Document the current mock context was created for. */
  private currentDoc: Text | null = null;

  constructor(app: App, mockContextClass: BasesMockContextConstructor) {
    this.app = app;
    this.mockContextClass = mockContextClass;
    this.current = new mockContextClass(app, {});

    this.context = new Proxy(this.current, {
      get: (_target: BasesMockContext, property: string | symbol): unknown => {
        const value: unknown = Reflect.get(this.current, property, this.current);

        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(this.current);
        }
        return value;
      }
    });
  }

  /**
   * Updates the context with the formulas in a document. Does nothing if the document is unchanged.
   *
   * @param state - Editor state to read the formulas from.
   */
  update(state: EditorState): void {
    if (state.doc === this.currentDoc) {
      return;
    }

    // Wait until the whole document is parsed, or formulas near the end would be missed
    if (syntaxTreeAvailable(state) === false) {
      return;
    }

    const formulaTexts: Record<string, string> = getFormulasFromBaseYaml(
      syntaxTree(state),
      (from: number, to: number): string => state.sliceDoc(from, to)
    );

    const formulas: Record<string, BasesFormula> = {};
    for (const [name, formulaText] of Object.entries(formulaTexts)) {
      formulas[name] = {
        getValue: (mockContext: BasesMockContext): Value => mockContext.evaluateIdent(formulaText)
      };
    }

    this.current = new this.mockContextClass(this.app, formulas);
    this.currentDoc = state.doc;
  }
}
