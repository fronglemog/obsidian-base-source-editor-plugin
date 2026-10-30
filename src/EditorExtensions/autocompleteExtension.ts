/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { Platform } from 'obsidian';
import type { IconName } from 'obsidian';

/* CODEMIRROR */
import {
  acceptCompletion,
  autocompletion,
  completionKeymap
} from '@codemirror/autocomplete';
import type { CompletionSource } from '@codemirror/autocomplete';

import {
  EditorState,
  Prec
} from '@codemirror/state';
import type { Extension } from '@codemirror/state';

import {
  Direction,
  keymap
} from '@codemirror/view';
import type {
  EditorView,
  KeyBinding,
  Rect
} from '@codemirror/view';

/* PLUGIN */
import { createYamlCompletionSource } from 'src/Autocompletion/yamlCompletionSource';
import type { FormulaEditorExtensions } from 'src/Autocompletion/NativeFormulaSupport';

import type {
  PropertyType,
  ReadPropertyIcon,
  ReadPropertyType
} from 'src/Autocompletion/propertyIds';
import { NO_RESULT_ICON } from 'src/Autocompletion/summaries';
import type { ReadSummaryIcon } from 'src/Autocompletion/summaries';
import type BasesSourceEditorPlugin from 'src/main';

import type {
  AutocompleteAcceptKey,
  PluginSettings
} from 'src/Settings/PluginSettings';

import {
  renderCompletionDetail,
  renderCompletionIcon
} from 'src/Autocompletion/renderOption';

/* ========================= AUTOCOMPLETE ========================= */

/** Maximum width of the info panel, the same as CodeMirror's default. */
const INFO_PANEL_MAX_WIDTH: number = 400;

/**
 * Gets the position config for the completion info panel on phones. For CodeMirror's `positionInfo` option.
 *
 * @remarks
 * Based on CodeMirror's default, with two changes:
 * - Space is measured within the editor, not the window, so the panel stays within the editor's area.
 * - When the panel fits on neither side of the list, it goes below or above the whole list, not over its options.
 *   A phone keyboard has no arrow keys, so the panel only ever describes the first option, and would cover the rest.
 *
 * @param view - The editor view.
 * @param list - The completion list.
 * @param option - The selected option.
 * @param info - The info panel, at its current size.
 * @param space - Space available for tooltips.
 * @returns Inline style and class that CodeMirror applies to the info panel.
 */
export function getCompletionInfoPositionConfig(view: EditorView, list: Rect, option: Rect, info: Rect, space: Rect): { style?: string; class?: string } {
  const editorRect: DOMRect = view.dom.getBoundingClientRect();
  const room: Rect = {
    top: Math.max(space.top, editorRect.top),
    bottom: Math.min(space.bottom, editorRect.bottom),
    left: Math.max(space.left, editorRect.left),
    right: Math.min(space.right, editorRect.right)
  };

  const isRtl: boolean = view.textDirection === Direction.RTL;
  const roomLeft: number = list.left - room.left;
  const roomRight: number = room.right - list.right;
  const infoWidth: number = info.right - info.left;
  const infoHeight: number = info.bottom - info.top;

  // The side the text runs towards, unless the other side has more room (CodeMirror's rule)
  let isLeft: boolean = isRtl;
  if (isLeft && roomLeft < Math.min(infoWidth, roomRight)) {
    isLeft = false;
  }
  else if (!isLeft && roomRight < Math.min(infoWidth, roomLeft)) {
    isLeft = true;
  }

  // Beside the list, level with the selected option, moved up if it would go past the bottom
  const roomBeside: number = isLeft ? roomLeft : roomRight;
  if (infoWidth <= roomBeside) {
    const top: number = Math.max(room.top, Math.min(option.top, room.bottom - infoHeight)) - list.top;
    const maxWidth: number = Math.min(INFO_PANEL_MAX_WIDTH, roomBeside);

    return {
      style: `top: ${top / view.scaleY}px; max-width: ${maxWidth / view.scaleX}px`,
      class: isLeft ? 'cm-completionInfo-left' : 'cm-completionInfo-right'
    };
  }

  // Below the whole list if it fits, otherwise on whichever side has more room.
  // The panel is inside the popup, so 100% is the popup's height.
  const roomBelow: number = room.bottom - list.bottom;
  const roomAbove: number = list.top - room.top;
  const isBelow: boolean = roomBelow >= infoHeight || roomBelow >= roomAbove;

  const verticalStyle: string = isBelow ? 'top: 100%' : 'bottom: 100%';
  const horizontalStyle: string = isRtl ? 'right: 0' : 'left: 0';
  const maxHeight: number = isBelow ? roomBelow : roomAbove;
  const maxWidth: number = Math.min(INFO_PANEL_MAX_WIDTH, isRtl ? list.right - room.left : room.right - list.left);

  return {
    style: `${verticalStyle}; ${horizontalStyle}; max-width: ${maxWidth / view.scaleX}px; max-height: ${maxHeight / view.scaleY}px; overflow-y: auto`
  };
}

/**
 * Gets the info panel's placement option for CodeMirror's `autocompletion()`: the plugin's own on phones,
 * CodeMirror's default elsewhere.
 *
 * @remarks
 * Obsidian's formula editor leaves the placement to CodeMirror's default, on desktop and tablets alike.
 * It has no formula suggestions on phones, where the plugin uses {@link getCompletionInfoPositionConfig}.
 *
 * @param isPhone - Whether Obsidian is running on a phone.
 * @returns `positionInfo` on phones, otherwise nothing, which leaves CodeMirror's default.
 */
export function getInfoPanelOptions(isPhone: boolean): { positionInfo?: typeof getCompletionInfoPositionConfig } {
  return isPhone ? { positionInfo: getCompletionInfoPositionConfig } : {};
}

/** Tab accepts the selected suggestion. With no suggestions open, `acceptCompletion` returns `false`, so Tab indents as usual. */
const TAB_ACCEPTS: KeyBinding = { key: 'Tab', run: acceptCompletion };

/**
 * Gets how the "Accept a suggestion with" setting changes CodeMirror's completion keys.
 *
 * @remarks
 * - Enter: CodeMirror's own completion keys, unchanged, as in Obsidian's formula editor.
 * - Tab and Enter: CodeMirror's own keys, plus Tab.
 * - Tab: CodeMirror's own keys are turned off, and the same keys without Enter are added, plus Tab.
 *   CodeMirror can only turn its keys off all together; filtering its own list keeps the other keys
 *   the same as in Obsidian's copy of CodeMirror, which the plugin uses at runtime.
 *
 * @param acceptKey - The setting's value.
 * @returns Whether CodeMirror's own completion keys stay on, and the key bindings to add. An unknown value counts as Enter.
 */
export function getAcceptKeyOptions(acceptKey: AutocompleteAcceptKey): AcceptKeyOptions {
  if (acceptKey === 'tabAndEnter') {
    return { defaultKeymap: true, keyBindings: [TAB_ACCEPTS] };
  }

  if (acceptKey === 'tab') {
    const keysWithoutEnter: KeyBinding[] = completionKeymap.filter((binding: KeyBinding): boolean => binding.key !== 'Enter');
    return { defaultKeymap: false, keyBindings: [...keysWithoutEnter, TAB_ACCEPTS] };
  }

  // 'enter', or a value this version doesn't know, for example from a hand-edited data.json
  return { defaultKeymap: true, keyBindings: [] };
}

/**
 * How the "Accept a suggestion with" setting changes CodeMirror's completion keys.
 */
export type AcceptKeyOptions = {
  /** Whether CodeMirror's own completion keys stay on: `autocompletion()`'s `defaultKeymap` option. */
  defaultKeymap: boolean;
  /** Key bindings to add, ahead of the editor's other keys. */
  keyBindings: KeyBinding[];
};

/**
 * Gets the extensions for autocomplete in a Base Source editor.
 *
 * @param plugin - The Base Source Editor plugin.
 * @returns The autocomplete extensions, including formula autocomplete if Obsidian's formula support can be found.
 */
export function getAutocompleteExtensions(plugin: BasesSourceEditorPlugin): Extension[] {
  const formulaSupport: FormulaEditorExtensions | null = plugin.nativeFormulaSupport.createEditorExtensions();

  // Property types, summary results and file property icons are read with Obsidian's formula support; without it, none is known
  const readPropertyType: ReadPropertyType = formulaSupport == null
    ? readUnknownPropertyType
    : (state: EditorState, propertyId: string): PropertyType => formulaSupport.formulaContext.readPropertyType(state, propertyId);

  const readSummaryIcon: ReadSummaryIcon = formulaSupport == null
    ? readNoSummaryIcon
    : (state: EditorState, propertyId: string, formula: string): IconName => formulaSupport.formulaContext.readSummaryIcon(state, propertyId, formula);

  const readPropertyIcon: ReadPropertyIcon = formulaSupport == null
    ? readNoPropertyIcon
    : (state: EditorState, propertyId: string): IconName | null => formulaSupport.formulaContext.readPropertyIcon(state, propertyId);

  // Created once: CodeMirror tells a source's earlier results apart by the source function
  const yamlCompletionSource: CompletionSource = createYamlCompletionSource(plugin.app, readPropertyType, readSummaryIcon, readPropertyIcon);
  const acceptKeyOptions: AcceptKeyOptions = getAcceptKeyOptions(plugin.settings.autocompleteAcceptKey);

  const extensions: Extension[] = [
    // Same popup configuration as Obsidian's formula editor, so the popup looks the same.
    // Only one configuration per editor may add render functions, or every icon is drawn twice.
    autocompletion({
      icons: false,
      tooltipClass: (): string => 'suggestion-container',
      optionClass: (): string => 'suggestion-item mod-complex',
      addToOptions: [
        {
          render: renderCompletionIcon,
          position: 20
        },
        {
          render: renderCompletionDetail,
          position: 80
        }
      ],
      // Not in Obsidian's configuration, and only on phones, where Obsidian has no formula suggestions
      ...getInfoPanelOptions(Platform.isPhone),
      // Off only when Tab alone accepts: the plugin's own keys, below, replace CodeMirror's
      defaultKeymap: acceptKeyOptions.defaultKeymap
    }),
    // The accept key's bindings, ahead of the editor's own keys, such as `indentWithTab`
    Prec.highest(keymap.of(acceptKeyOptions.keyBindings)),
    // YAML key and value suggestions, at every position whatever its language: under `filters:`,
    // a key being typed is parsed as a formula until its `:` is typed
    EditorState.languageData.of((): readonly Record<string, unknown>[] => [{ autocomplete: yamlCompletionSource }])
  ];

  if (formulaSupport != null) {
    extensions.push(...formulaSupport.extensions);
  }

  return extensions;
}

/**
 * Reads no property's type: the type reader used without Obsidian's formula support.
 *
 * @returns `'other'`, for every property.
 */
function readUnknownPropertyType(): PropertyType {
  return 'other';
}

/**
 * Reads no summary's result: the icon reader used without Obsidian's formula support.
 *
 * @returns The icon of a summary without a result, for every summary.
 */
function readNoSummaryIcon(): IconName {
  return NO_RESULT_ICON;
}

/**
 * Reads no property's icon: the icon reader used without Obsidian's formula support.
 *
 * @returns `null`, for every property.
 */
function readNoPropertyIcon(): null {
  return null;
}

/**
 * Returns whether autocomplete is enabled in the plugin settings.
 *
 * @param settings - The plugin's settings.
 * @returns `true` if autocomplete is enabled.
 */
export function isAutocompleteEnabled(settings: PluginSettings): boolean {
  if (settings.autocomplete === 'allDevices') {
    return true;
  }

  // Off on phones, like Obsidian's formula editor
  if (settings.autocomplete === 'desktopAndTablet') {
    return Platform.isPhone === false;
  }

  // 'off', or a value this version doesn't know, for example from a hand-edited data.json
  return false;
}
