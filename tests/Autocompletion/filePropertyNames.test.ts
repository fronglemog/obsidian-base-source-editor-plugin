/* ========================= IMPORTS ========================= */
import {
  afterEach,
  describe,
  expect,
  test,
  vi
} from 'vitest';

/* PLUGIN */
import { getFilePropertyNames } from 'src/Autocompletion/filePropertyNames';

/* ========================= TESTS ========================= */

describe('getFilePropertyNames', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('Obsidian\'s translations, and the British English name where one is missing, which is logged', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('window', {
      i18next: {
        exists: (key: string): boolean => key !== 'plugins.bases.label-file-prop-ext',
        t: (key: string): string => (key === 'plugins.bases.label-file-prop-name' ? 'Dateiname' : 'übersetzt')
      }
    });

    const names: Record<string, string> = getFilePropertyNames();
    expect(Object.keys(names)).toHaveLength(14);
    expect(names['file.name']).toBe('Dateiname');
    expect(names['file.ext']).toBe('extension');
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  test('the British English names without Obsidian\'s translations, and the failure is logged once', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getFilePropertyNames()['file.name']).toBe('name');
    expect(getFilePropertyNames()['file.ctime']).toBe('created time');
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
