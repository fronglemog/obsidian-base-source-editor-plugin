/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import { getYamlErrorMessage } from '#src/Linting/yamlErrorMessages';

/* ========================= TESTS ========================= */

describe('getYamlErrorMessage', () => {
  test('a message without a replacement is kept as it is', () => {
    expect(getYamlErrorMessage('DUPLICATE_KEY', 'Map keys must be unique')).toBe('Map keys must be unique');
  });

  test('MULTIPLE_DOCS gets a message without the developer function', () => {
    const message: string = getYamlErrorMessage('MULTIPLE_DOCS', 'Source contains multiple documents; please use YAML.parseAllDocuments()');
    expect(message).toBe('A Base can only contain one YAML document, but this `---` starts a second one');
  });
});
