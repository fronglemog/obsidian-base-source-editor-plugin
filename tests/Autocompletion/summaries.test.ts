/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import { getSummarySuggestions } from 'src/Autocompletion/summaries';
import type { SummarySuggestion } from 'src/Autocompletion/summaries';

/* ========================= HELPERS ========================= */

/**
 * Gets the names of summary suggestions.
 *
 * @param summaries - The summary suggestions.
 * @returns Their names, in order.
 */
function getNames(summaries: SummarySuggestion[]): string[] {
  return summaries.map((summary: SummarySuggestion): string => summary.name);
}

/* ========================= TESTS ========================= */

describe('getSummarySuggestions', () => {
  test('a number: its summaries and those of every type, in Obsidian\'s order', () => {
    expect(getNames(getSummarySuggestions('number', {}))).toEqual(['Average', 'Empty', 'Filled', 'Max', 'Median', 'Min', 'Range', 'Stddev', 'Sum', 'Unique']);
  });

  test('a date and a checkbox', () => {
    expect(getNames(getSummarySuggestions('date', {}))).toEqual(['Earliest', 'Empty', 'Filled', 'Latest', 'Range', 'Unique']);
    expect(getNames(getSummarySuggestions('checkbox', {}))).toEqual(['Checked', 'Empty', 'Filled', 'Unchecked', 'Unique']);
  });

  test('any other type: the summaries of every type', () => {
    expect(getSummarySuggestions('other', {})).toEqual([
      { name: 'Empty', formula: 'values.filter(value.isType("null")).length' },
      { name: 'Filled', formula: 'values.filter(!value.isType("null")).length' },
      { name: 'Unique', formula: 'values.unique().length' }
    ]);
  });

  test('each summary has its formula', () => {
    expect(getSummarySuggestions('date', {})).toContainEqual({ name: 'Range', formula: '(values.latest() - values.earliest())' });
    expect(getSummarySuggestions('number', {})).toContainEqual({ name: 'Range', formula: 'values.max() - values.min()' });
  });

  test('custom summaries are added, and replace a built-in one with the same name', () => {
    const summaries: SummarySuggestion[] = getSummarySuggestions('number', { Average: 'values.mean()', Top: 'values.max()' });
    expect(summaries).toHaveLength(11);
    expect(summaries).toContainEqual({ name: 'Average', formula: 'values.mean()' });
    expect(summaries).toContainEqual({ name: 'Top', formula: 'values.max()' });
  });

  test('sorted ignoring case, with numbers in natural order', () => {
    expect(getNames(getSummarySuggestions('other', { 'top 10': 'a', 'Top 2': 'b', 'average': 'c' }))).toEqual(['average', 'Empty', 'Filled', 'Top 2', 'top 10', 'Unique']);
  });
});
