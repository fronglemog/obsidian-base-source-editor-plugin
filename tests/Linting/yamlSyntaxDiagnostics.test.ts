/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test,
  vi
} from 'vitest';

/* PLUGIN */
import { getYamlSyntaxDiagnostics } from 'src/Linting/yamlSyntaxDiagnostics';
import type { YamlSyntaxDiagnostic } from 'src/Linting/yamlSyntaxDiagnostics';

/* ========================= TESTS ========================= */

describe('getYamlSyntaxDiagnostics', () => {
  test('a valid Base has no errors', () => {
    const text: string = 'filters:\n  and:\n    - file.ext == "md"\nviews:\n  - type: table\n    name: Films\n    order:\n      - file.name\n';
    expect(getYamlSyntaxDiagnostics(text)).toEqual([]);
  });

  test('two separate mistakes give two errors, each with the package\'s sentence only', () => {
    const text: string = 'views:\n  - type: table\n    name: Films\n    name: Again\nformulas:\n  A: "x\n';
    const diagnostics: YamlSyntaxDiagnostic[] = getYamlSyntaxDiagnostics(text);

    expect(diagnostics.map((diagnostic) => text.slice(diagnostic.from, diagnostic.to))).toEqual(['name', '"x']);
    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual(['Map keys must be unique', 'Missing closing "quote']);
  });

  test('a second document gets the plugin\'s own message', () => {
    const text: string = 'views: []\n---\nfoo: 1\n';
    expect(getYamlSyntaxDiagnostics(text)).toEqual([
      { from: 10, to: 13, message: 'A Base can only contain one YAML document, but this `---` starts a second one' }
    ]);
  });

  test('a lone --- as the last line starts an empty second document', () => {
    const text: string = 'views: []\n---\n';
    expect(getYamlSyntaxDiagnostics(text).map((diagnostic) => text.slice(diagnostic.from, diagnostic.to))).toEqual(['---']);
  });

  test('a --- as the first line only marks where the one document starts', () => {
    expect(getYamlSyntaxDiagnostics('---\nviews: []\n')).toEqual([]);
  });

  test('if checking throws, the reason is logged and there are no errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Not a string, so the `yaml` package throws
    expect(getYamlSyntaxDiagnostics(null as unknown as string)).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith('Base Source Editor: Couldn\'t check the YAML for errors.', expect.any(TypeError));

    consoleError.mockRestore();
  });
});
