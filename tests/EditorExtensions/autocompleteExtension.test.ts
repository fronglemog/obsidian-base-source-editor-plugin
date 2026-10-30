/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* PLUGIN */
import {
  getCompletionInfoPositionConfig,
  getInfoPanelOptions
} from 'src/EditorExtensions/autocompleteExtension';

/* ========================= TESTS ========================= */

describe('getInfoPanelOptions', () => {
  test('on desktop and tablets, no placement of its own: CodeMirror\'s default, as in Obsidian', () => {
    expect(getInfoPanelOptions(false)).toEqual({});
  });

  test('on phones, the plugin\'s own placement', () => {
    expect(getInfoPanelOptions(true)).toEqual({ positionInfo: getCompletionInfoPositionConfig });
  });
});
