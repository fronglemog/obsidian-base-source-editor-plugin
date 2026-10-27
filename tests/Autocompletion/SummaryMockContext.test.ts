/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* OBSIDIAN */
import {
  ListValue,
  NullValue,
  NumberValue
} from 'obsidian';

import { SummaryMockContext } from 'src/Autocompletion/SummaryMockContext';

/* ========================= TESTS ========================= */

describe('SummaryMockContext', () => {
  test('has only the values identifier', () => {
    expect(new SummaryMockContext().keys()).toEqual(['values']);
  });

  test('values is an empty list, in any letter case', () => {
    const context: SummaryMockContext = new SummaryMockContext();

    expect(context.getByIdentifier('values')).toStrictEqual(new ListValue([]));
    expect(context.getByIdentifier('VALUES')).toStrictEqual(new ListValue([]));
  });

  test('given values, values lists them', () => {
    const context: SummaryMockContext = new SummaryMockContext([new NumberValue(3)]);

    expect(context.getByIdentifier('values')).toStrictEqual(new ListValue([new NumberValue(3)]));
  });

  test('anything else is the null value', () => {
    const context: SummaryMockContext = new SummaryMockContext();

    expect(context.getByIdentifier('note')).toBe(NullValue.value);
    expect(context.getByIdentifier('value')).toBe(NullValue.value);
  });
});
