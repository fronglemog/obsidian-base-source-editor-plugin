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
  test('leaves text unquoted where YAML reads it back unchanged, as Obsidian writes it', () => {
    expect(toYamlText('medium')).toBe('medium');
    expect(toYamlText('extra-tall_2')).toBe('extra-tall_2');
    expect(toYamlText('film - year')).toBe('film - year');
    expect(toYamlText('Filtered mean')).toBe('Filtered mean');
    expect(toYamlText('formula.Year (stars)')).toBe('formula.Year (stars)');
    expect(toYamlText('say "hi"')).toBe('say "hi"');
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
    expect(toYamlText('File: name')).toBe('"File: name"');
    expect(toYamlText('a #b')).toBe('"a #b"');
    expect(toYamlText('- a')).toBe('"- a"');
  });

  test('text starting with a double quote is written in single quotes', () => {
    expect(toYamlText('"q"')).toBe('\'"q"\'');
  });

  test('text too long for one line is written in double quotes, on one line', () => {
    const longText: string = 'a '.repeat(50) + 'end';
    expect(toYamlText(longText)).toBe(JSON.stringify(longText));
  });
});
