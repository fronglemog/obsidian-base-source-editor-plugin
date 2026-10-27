/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type { IconName } from 'obsidian';

/* CODEMIRROR */
import type { EditorState } from '@codemirror/state';

/* PLUGIN */
import type { PropertyType } from 'src/Autocompletion/propertyIds';

/* ========================= SUMMARIES ========================= */

/** Icon of a summary without a result, as in Obsidian's summary menu: a summary's icon is otherwise its result's. */
export const NO_RESULT_ICON: IconName = 'lucide-square-function';

/** Built-in summaries of a number property. */
const NUMBER_SUMMARIES: readonly SummarySuggestion[] = [
  { name: 'Average', formula: 'values.mean().round(2)' },
  { name: 'Min', formula: 'values.min()' },
  { name: 'Max', formula: 'values.max()' },
  { name: 'Sum', formula: 'values.sum().round(2)' },
  { name: 'Range', formula: 'values.max() - values.min()' },
  { name: 'Median', formula: 'values.median()' },
  { name: 'Stddev', formula: 'values.stddev().round(2)' }
];

/** Built-in summaries of a date property, with or without a time. */
const DATE_SUMMARIES: readonly SummarySuggestion[] = [
  { name: 'Earliest', formula: 'values.earliest()' },
  { name: 'Latest', formula: 'values.latest()' },
  { name: 'Range', formula: '(values.latest() - values.earliest())' }
];

/** Built-in summaries of a checkbox property. */
const CHECKBOX_SUMMARIES: readonly SummarySuggestion[] = [
  { name: 'Checked', formula: 'values.filter(value == true).length' },
  { name: 'Unchecked', formula: 'values.filter(value == false).length' }
];

/** Built-in summaries of a property of any type. */
const ANY_SUMMARIES: readonly SummarySuggestion[] = [
  { name: 'Empty', formula: 'values.filter(value.isType("null")).length' },
  { name: 'Filled', formula: 'values.filter(!value.isType("null")).length' },
  { name: 'Unique', formula: 'values.unique().length' }
];

/** Built-in summaries by property type, apart from those of any type. */
const TYPE_SUMMARIES: ReadonlyMap<PropertyType, readonly SummarySuggestion[]> = new Map<PropertyType, readonly SummarySuggestion[]>([
  ['number', NUMBER_SUMMARIES],
  ['date', DATE_SUMMARIES],
  ['checkbox', CHECKBOX_SUMMARIES]
]);

/** Order of Obsidian's summary menu: alphabetical, ignoring case, with numbers in natural order. */
const SUMMARY_ORDER: Intl.Collator = new Intl.Collator(undefined, { usage: 'sort', sensitivity: 'base', numeric: true });

/**
 * Gets the summaries Obsidian's summary menu offers for a property, in the menu's order.
 *
 * @remarks
 * The built-in summaries for the property's type, then those of any type: Empty, Filled and Unique.
 * Then the custom summaries, whatever the property's type; a custom summary replaces a built-in one with the same name.
 *
 * @param propertyType - The property's type.
 * @param customSummaries - The custom summaries from the top-level `summaries`: each name, with its formula.
 * @returns The summaries, sorted by name.
 */
export function getSummarySuggestions(propertyType: PropertyType, customSummaries: Record<string, string>): SummarySuggestion[] {
  const formulas: Map<string, string> = new Map();

  for (const summary of [...(TYPE_SUMMARIES.get(propertyType) ?? []), ...ANY_SUMMARIES]) {
    formulas.set(summary.name, summary.formula);
  }
  for (const [name, formula] of Object.entries(customSummaries)) {
    formulas.set(name, formula);
  }

  const summaries: SummarySuggestion[] = [...formulas].map(([name, formula]: [string, string]): SummarySuggestion => ({ name, formula }));
  return summaries.sort((first: SummarySuggestion, second: SummarySuggestion): number => SUMMARY_ORDER.compare(first.name, second.name));
}

/* ========================= TYPES ========================= */

/**
 * A summary to suggest.
 */
export type SummarySuggestion = {
  /** The summary's name, as written in a view's `summaries`. */
  name: string;
  /** The summary's formula, which works out the summary from the property's `values`. */
  formula: string;
};

/**
 * Reads the icon of a summary's result in a Base.
 *
 * @param state - Editor state of the Base.
 * @param propertyId - The property being summarised, as written in the Base.
 * @param formula - The summary's formula.
 * @returns The result's icon, or {@link NO_RESULT_ICON} if there's no result.
 */
export type ReadSummaryIcon = (state: EditorState, propertyId: string, formula: string) => IconName;
