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
 * `values` is an empty list, as there, so an expression built on it, such as `values.mean()`, has no known type.
 */
export class SummaryMockContext implements BasesIdentifierContext {
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
   * @returns An empty list for `values`, or a null value for anything else.
   */
  getByIdentifier(identifier: string): Value {
    if (identifier.toLowerCase() === VALUES_IDENTIFIER) {
      // A new array each time: ListValue may modify the array it's given
      return new ListValue([]);
    }
    return NullValue.value;
  }
}
