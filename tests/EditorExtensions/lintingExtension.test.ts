/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import {
  getLintingExtensions,
  getYamlLintDiagnostics
} from '#src/EditorExtensions/lintingExtension';

import { lintTooltipAtCursorField } from '#src/Linting/lintTooltipAtCursor';

/* ========================= TESTS ========================= */

describe('getLintingExtensions', () => {
  test('with the setting off, no extensions', () => {
    expect(getLintingExtensions(false, false)).toEqual([]);
    expect(getLintingExtensions(false, true)).toEqual([]);
  });

  test('on desktop, no cursor tooltip', () => {
    expect(getLintingExtensions(true, false)).not.toContain(lintTooltipAtCursorField);
  });

  test('on phones and tablets, the cursor tooltip', () => {
    expect(getLintingExtensions(true, true)).toContain(lintTooltipAtCursorField);
  });
});

describe('getYamlLintDiagnostics', () => {
  test('each YAML error becomes an error diagnostic, with its range and message', () => {
    const text: string = 'views:\n  - type: table\n    name: Films\n    name: Again\n';
    expect(getYamlLintDiagnostics(text)).toEqual([
      { from: 43, to: 47, severity: 'error', message: 'Map keys must be unique' }
    ]);
  });
});
