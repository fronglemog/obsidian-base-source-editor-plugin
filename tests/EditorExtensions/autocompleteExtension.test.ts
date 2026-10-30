/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test
} from 'vitest';

/* CODEMIRROR */
import {
  acceptCompletion,
  closeCompletion,
  completionKeymap,
  startCompletion
} from '@codemirror/autocomplete';

/* PLUGIN */
import {
  getAcceptKeyOptions,
  getCompletionInfoPositionConfig,
  getInfoPanelOptions
} from 'src/EditorExtensions/autocompleteExtension';

import type { AutocompleteAcceptKey } from 'src/Settings/PluginSettings';

/* ========================= TESTS ========================= */

describe('getInfoPanelOptions', () => {
  test('on desktop and tablets, no placement of its own: CodeMirror\'s default, as in Obsidian', () => {
    expect(getInfoPanelOptions(false)).toEqual({});
  });

  test('on phones, the plugin\'s own placement', () => {
    expect(getInfoPanelOptions(true)).toEqual({ positionInfo: getCompletionInfoPositionConfig });
  });
});

describe('getAcceptKeyOptions', () => {
  test('Enter: CodeMirror\'s own keys, unchanged, as in Obsidian\'s formula editor', () => {
    expect(getAcceptKeyOptions('enter')).toEqual({ defaultKeymap: true, keyBindings: [] });
  });

  test('Tab and Enter: CodeMirror\'s own keys, plus Tab', () => {
    expect(getAcceptKeyOptions('tabAndEnter')).toEqual({ defaultKeymap: true, keyBindings: [{ key: 'Tab', run: acceptCompletion }] });
  });

  test('Tab: CodeMirror\'s own keys off, replaced by the same keys without Enter, plus Tab', () => {
    const { defaultKeymap, keyBindings } = getAcceptKeyOptions('tab');
    expect(defaultKeymap).toBe(false);
    expect(keyBindings.some((binding) => binding.key === 'Enter')).toBe(false);
    expect(keyBindings).toContainEqual({ key: 'Tab', run: acceptCompletion });
    expect(keyBindings).toContainEqual({ key: 'Escape', run: closeCompletion });
    expect(keyBindings).toContainEqual({ key: 'Ctrl-Space', run: startCompletion });
    expect(keyBindings).toHaveLength(completionKeymap.length);
  });

  test('an unknown saved value counts as Enter', () => {
    expect(getAcceptKeyOptions('space' as unknown as AutocompleteAcceptKey)).toEqual(getAcceptKeyOptions('enter'));
  });
});
