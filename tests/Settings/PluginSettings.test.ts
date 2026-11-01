/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import { PLUGIN_DEFAULT_SETTINGS } from 'src/Settings/PluginSettings';

/* ========================= TESTS ========================= */

describe('PLUGIN_DEFAULT_SETTINGS', () => {
  test('"Show YAML errors" is on by default', () => {
    expect(PLUGIN_DEFAULT_SETTINGS.lintingYamlErrors).toBe(true);
  });
});
