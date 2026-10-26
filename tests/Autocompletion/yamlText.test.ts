/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import { toYamlText } from 'src/Autocompletion/yamlText';

/* ========================= TESTS ========================= */

describe('toYamlText', () => {
  test('leaves plain words unquoted', () => {
    expect(toYamlText('medium')).toBe('medium');
    expect(toYamlText('none')).toBe('none');
    expect(toYamlText('extra-tall_2')).toBe('extra-tall_2');
  });

  test('quotes empty text', () => {
    expect(toYamlText('')).toBe('""');
  });

  test('quotes words YAML reads as booleans or null', () => {
    expect(toYamlText('true')).toBe('"true"');
    expect(toYamlText('False')).toBe('"False"');
    expect(toYamlText('NULL')).toBe('"NULL"');
  });

  test('quotes text YAML would read as a number, or change', () => {
    expect(toYamlText('200')).toBe('"200"');
    expect(toYamlText(', ')).toBe('", "');
    expect(toYamlText('a: b')).toBe('"a: b"');
    expect(toYamlText('a #b')).toBe('"a #b"');
  });

  test('escapes quotes inside quoted text', () => {
    expect(toYamlText('say "hi"')).toBe(String.raw`"say \"hi\""`);
  });
});
