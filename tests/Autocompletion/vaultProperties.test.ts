/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test,
  vi
} from 'vitest';

/* OBSIDIAN */
import type { App } from 'obsidian';

/* PLUGIN */
import { getNoteProperties } from 'src/Autocompletion/vaultProperties';

/* ========================= HELPERS ========================= */

/**
 * Stands in for Obsidian's app, with two vault properties: an aliases property and a number.
 *
 * @returns The app.
 */
function createApp(): App {
  return {
    metadataTypeManager: {
      getAllProperties: () => ({
        'aliases': { name: 'aliases', widget: 'aliases' },
        'film - year': { name: 'film - year', widget: 'number' }
      }),
      getTypeInfo: (property: string) => ({
        expected: property === 'aliases'
          ? { type: 'aliases', icon: 'lucide-forward' }
          : { type: 'number', icon: 'lucide-binary' }
      })
    }
  } as unknown as App;
}

/* ========================= TESTS ========================= */

describe('getNoteProperties', () => {
  test('each vault property, with the icon of its type, and whether it\'s an aliases property', () => {
    expect(getNoteProperties(createApp())).toEqual([
      { name: 'aliases', icon: 'lucide-forward', isAliases: true },
      { name: 'film - year', icon: 'lucide-binary', isAliases: false }
    ]);
  });

  test('none if Obsidian\'s properties can\'t be read, and the failure is logged once', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getNoteProperties({} as App)).toEqual([]);
    expect(getNoteProperties({} as App)).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
