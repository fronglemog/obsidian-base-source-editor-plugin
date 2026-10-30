/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
  BooleanValue,
  DateValue,
  NullValue,
  NumberValue
} from 'obsidian';

import type {
  App,
  IconName,
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
import { toPropertyExpression } from 'src/Autocompletion/propertyIds';
import type { PropertyType } from 'src/Autocompletion/propertyIds';
import { NO_RESULT_ICON } from 'src/Autocompletion/summaries';
import { getFormulasFromBaseYaml } from 'src/BaseYamlLanguage/getFormulasFromBaseYaml';
import { isInSummaryFormula } from 'src/BaseYamlLanguage/yamlKeyPath';
import { logError } from 'src/Util/logError';

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

  /** Whether a failure to read a property's type has been logged, so it's logged once per editor. */
  private hasLoggedPropertyTypeError: boolean = false;

  /** Whether a failure to read a summary's result icon has been logged, so it's logged once per editor. */
  private hasLoggedSummaryIconError: boolean = false;

  /** Whether a failure to read a property's icon has been logged, so it's logged once per editor. */
  private hasLoggedPropertyIconError: boolean = false;

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
   * Reads a property's type, by evaluating the property with the file's own mock context.
   *
   * @remarks
   * Obsidian's summary menu and sort editor work out the type the same way, so formulas get their result's type.
   * The summary context is never used, even while it's selected.
   *
   * @param state - Editor state, to update the context with the document's formulas first.
   * @param propertyId - The property id, as written in the Base.
   * @returns The property's type, or `'other'` if the context can't evaluate, or the evaluation fails.
   */
  readPropertyType(state: EditorState, propertyId: string): PropertyType {
    this.update(state);
    const context: BasesIdentifierContext = this.current;

    // The plugin's fallback context can't evaluate
    if (canEvaluate(context) === false) {
      return 'other';
    }

    // Accessing undocumented API... keep this guard.
    try {
      const value: Value = context.evaluateIdent(toPropertyExpression(propertyId));

      if (value instanceof NumberValue) {
        return 'number';
      }
      if (value instanceof DateValue) {
        return 'date';
      }
      if (value instanceof BooleanValue) {
        return 'checkbox';
      }
      return 'other';
    } catch (error: unknown) {
      if (this.hasLoggedPropertyTypeError === false) {
        logError('summary and sort direction suggestions carry on without property types. Couldn\'t evaluate a property.', error);
        this.hasLoggedPropertyTypeError = true;
      }
      return 'other';
    }
  }

  /**
   * Reads the icon of a property's value, by evaluating the property with the file's own mock context.
   *
   * @remarks
   * Obsidian's property picker shows a file property's icon this way, such as a clock for `file.ctime`.
   * The summary context is never used, even while it's selected.
   *
   * @param state - Editor state, to update the context with the document's formulas first.
   * @param propertyId - The property id, as written in the Base.
   * @returns The icon, or `null` if the context can't evaluate, or the evaluation fails.
   */
  readPropertyIcon(state: EditorState, propertyId: string): IconName | null {
    this.update(state);
    const context: BasesIdentifierContext = this.current;

    // The plugin's fallback context can't evaluate
    if (canEvaluate(context) === false) {
      return null;
    }

    // Accessing undocumented API... keep this guard.
    try {
      return context.evaluateIdent(toPropertyExpression(propertyId)).icon;
    } catch (error: unknown) {
      if (this.hasLoggedPropertyIconError === false) {
        logError('property suggestions carry on without the icons of file properties. Couldn\'t evaluate a property.', error);
        this.hasLoggedPropertyIconError = true;
      }
      return null;
    }
  }

  /**
   * Reads the icon of a summary's result, by working out the summary on a stand-in for the property's values.
   *
   * @remarks
   * Obsidian's summary menu shows the icon of each summary's result on the view's values. The editor has no view,
   * so `values` holds one value instead: the empty value of the property's type that the file's own mock context gives,
   * such as `0` for a number. The result has the type it would have on the view's values, unless its type depends
   * on the values themselves, for example after a filter that the stand-in doesn't pass.
   *
   * Obsidian's mock context evaluates a formula with the context it's called on, so a copy of it with the identifiers
   * of a {@link SummaryMockContext} works out summary formulas.
   *
   * @param state - Editor state, to update the context with the document's formulas first.
   * @param propertyId - The property being summarised, as written in the Base.
   * @param formula - The summary's formula.
   * @returns The result's icon, or {@link NO_RESULT_ICON} if there's no result, the context can't evaluate,
   * or the evaluation fails.
   */
  readSummaryIcon(state: EditorState, propertyId: string, formula: string): IconName {
    this.update(state);
    const context: BasesIdentifierContext = this.current;

    // The plugin's fallback context can't evaluate
    if (canEvaluate(context) === false) {
      return NO_RESULT_ICON;
    }

    // Accessing undocumented API... keep this guard.
    try {
      const propertyValue: Value = context.evaluateIdent(toPropertyExpression(propertyId));
      const valuesContext: SummaryMockContext = new SummaryMockContext([propertyValue]);

      const summaryContext: BasesMockContext = Object.create(context) as BasesMockContext;
      summaryContext.keys = (): string[] => valuesContext.keys();
      summaryContext.getByIdentifier = (identifier: string): Value => valuesContext.getByIdentifier(identifier);

      const result: Value = summaryContext.evaluateIdent(formula);
      return result === NullValue.value ? NO_RESULT_ICON : result.icon;
    } catch (error: unknown) {
      if (this.hasLoggedSummaryIconError === false) {
        logError('summary suggestions carry on without their result icons. Couldn\'t work out a summary.', error);
        this.hasLoggedSummaryIconError = true;
      }
      return NO_RESULT_ICON;
    }
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
 * Returns whether a mock context can evaluate formula expressions: Obsidian's can, the plugin's fallback can't.
 *
 * @param context - The mock context.
 * @returns `true` if it has `evaluateIdent()`.
 */
function canEvaluate(context: BasesIdentifierContext): context is BasesMockContext {
  return typeof (context as Partial<BasesMockContext>).evaluateIdent === 'function';
}

/**
 * A mock context class: Obsidian's own, or the plugin's fallback built from public value classes.
 */
export type MockContextClass = new (app: App, formulas: Record<string, BasesFormula>) => BasesIdentifierContext;
