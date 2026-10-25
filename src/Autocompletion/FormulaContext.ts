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

import {
  Prec,
  StateField
} from '@codemirror/state';

import type {
  EditorState,
  Extension,
  SelectionRange,
  Text,
  Transaction
} from '@codemirror/state';

/* PLUGIN */
import { SummaryMockContext } from 'src/Autocompletion/SummaryMockContext';
import { getFormulasFromBaseYaml } from 'src/BaseYamlLanguage/getFormulasFromBaseYaml';
import { isInSummaryFormula } from 'src/BaseYamlLanguage/yamlKeyPath';

import type {
  BasesFormula,
  BasesIdentifierContext,
  BasesMockContext
} from 'src/obsidian-types';

/* ========================= FormulaContext ========================= */

/**
 * A mock context for a Base Source editor, kept up to date with the formulas in the Base YAML document.
 *
 * @remarks
 * While {@link FormulaContext.selectContextAt} has selected a summary formula, `context` forwards to a
 * {@link SummaryMockContext} instead, where the only identifier is `values`.
 */
export class FormulaContext {
  /**
   * Context to pass to Obsidian's formula language support.
   *
   * @remarks
   * A proxy that forwards to the selected mock context, so it stays the same object after each
   * {@link FormulaContext.update} or {@link FormulaContext.selectContextAt}.
   */
  readonly context: BasesIdentifierContext;

  private app: App;
  private mockContextClass: MockContextClass;
  private current: BasesIdentifierContext;

  /** Context for summary formulas, where the only identifier is `values`. */
  private summaryContext: BasesIdentifierContext = new SummaryMockContext();

  /** Whether the proxy forwards to the summary context instead of the current one. */
  private isSummarySelected: boolean = false;

  /** Document the current mock context was created for. */
  private currentDoc: Text | null = null;

  constructor(app: App, mockContextClass: MockContextClass) {
    this.app = app;
    this.mockContextClass = mockContextClass;
    this.current = new mockContextClass(app, {});

    this.context = new Proxy(this.current, {
      get: (_target: BasesIdentifierContext, property: string | symbol): unknown => {
        const selected: BasesIdentifierContext = this.isSummarySelected ? this.summaryContext : this.current;
        const value: unknown = Reflect.get(selected, property, selected);

        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(selected);
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

  /**
   * Selects the mock context for a position: the summary context in a summary formula, otherwise the current one.
   *
   * @param state - Editor state.
   * @param pos - Document position, such as the cursor.
   */
  selectContextAt(state: EditorState, pos: number): void {
    this.isSummarySelected = isInSummaryFormula(
      syntaxTree(state),
      pos,
      (from: number, to: number): string => state.sliceDoc(from, to)
    );
  }

  /**
   * Creates the extension that selects the mock context for the cursor on every edit or cursor move.
   *
   * @remarks
   * Obsidian's function signature tooltip reads the context while the editor state updates, so the context
   * must be selected first. State fields update in order of precedence, so this one has the highest.
   * Like the tooltip, it follows the first selection range. Its own value isn't used.
   *
   * @returns The extension.
   */
  createContextSelector(): Extension {
    const contextSelector: StateField<null> = StateField.define<null>({
      create: (): null => null,
      update: (_value: null, transaction: Transaction): null => {
        if (transaction.docChanged === false && transaction.selection == null) {
          return null;
        }

        const firstRange: SelectionRange | undefined = transaction.state.selection.ranges[0];
        if (firstRange != null) {
          this.selectContextAt(transaction.state, firstRange.head);
        }
        return null;
      }
    });

    return Prec.highest(contextSelector);
  }
}

/**
 * A mock context class: Obsidian's own, or the plugin's fallback built from public value classes.
 */
export type MockContextClass = new (app: App, formulas: Record<string, BasesFormula>) => BasesIdentifierContext;
