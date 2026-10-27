/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
  ListValue,
  NullValue
} from 'obsidian';

import type { Value } from 'obsidian';

/* PLUGIN */
import type { BasesIdentifierContext } from 'src/obsidian-types';

/* ========================= SummaryMockContext ========================= */

/** The only identifier a summary formula can use: the summarised property's values. */
const VALUES_IDENTIFIER: string = 'values';

/**
 * A mock context for summary formulas, the formulas under a Base's top-level `summaries`.
 *
 * @remarks
 * A copy of the context Obsidian's summary formula editor uses, which isn't exported.
 * Unless it's given values, `values` is an empty list, as there, so an expression built on it,
 * such as `values.mean()`, has no known type.
 */
export class SummaryMockContext implements BasesIdentifierContext {
  /** The summarised property's values. */
  private values: Value[];

  /**
   * @param values - The summarised property's values. None if left out, as in Obsidian's summary formula editor.
   */
  constructor(values: Value[] = []) {
    this.values = values;
  }

  /**
   * Gets the identifiers a summary formula can use: only `values`.
   */
  keys(): string[] {
    return [VALUES_IDENTIFIER];
  }

  /**
   * Gets a value of the right type for an identifier.
   *
   * @param identifier - Identifier. Case is ignored.
   * @returns A list of the summarised values for `values`, or a null value for anything else.
   */
  getByIdentifier(identifier: string): Value {
    if (identifier.toLowerCase() === VALUES_IDENTIFIER) {
      // A new array each time: ListValue may modify the array it's given
      return new ListValue([...this.values]);
    }
    return NullValue.value;
  }
}
