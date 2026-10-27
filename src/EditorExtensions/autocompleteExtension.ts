/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { Platform } from 'obsidian';
import type { IconName } from 'obsidian';

/* CODEMIRROR */
import { autocompletion } from '@codemirror/autocomplete';
import type { CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { Direction } from '@codemirror/view';
import type {
  EditorView,
  Rect
} from '@codemirror/view';

/* PLUGIN */
import { createYamlCompletionSource } from 'src/Autocompletion/yamlCompletionSource';
import type { FormulaEditorExtensions } from 'src/Autocompletion/NativeFormulaSupport';

import type {
  PropertyType,
  ReadPropertyType
} from 'src/Autocompletion/propertyIds';
import { NO_RESULT_ICON } from 'src/Autocompletion/summaries';
import type { ReadSummaryIcon } from 'src/Autocompletion/summaries';
import type BasesSourceEditorPlugin from 'src/main';
import type { PluginSettings } from 'src/Settings/PluginSettings';

import {
  renderCompletionDetail,
  renderCompletionIcon
} from 'src/Autocompletion/renderOption';

/* ========================= AUTOCOMPLETE ========================= */

/** Maximum width of the info panel, the same as CodeMirror's default. */
const INFO_PANEL_MAX_WIDTH: number = 400;

/**
 * Gets the position config for the completion info panel. For CodeMirror's `positionInfo` option.
 *
 * @remarks
 * Based on CodeMirror's default, with two changes:
 * - Space is measured within the editor, not the window, because the editor's pane clips anything outside it.
 * - When the panel fits on neither side of the list, it goes below or above the whole list, not over its options.
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
 * Gets the extensions for autocomplete in a Base Source editor.
 *
 * @param plugin - The Base Source Editor plugin.
 * @returns The autocomplete extensions, including formula autocomplete if Obsidian's formula support can be found.
 */
export function getAutocompleteExtensions(plugin: BasesSourceEditorPlugin): Extension[] {
  const formulaSupport: FormulaEditorExtensions | null = plugin.nativeFormulaSupport.createEditorExtensions();

  // Property types and summary results are read with Obsidian's formula support; without it, neither is known
  const readPropertyType: ReadPropertyType = formulaSupport == null
    ? readUnknownPropertyType
    : (state: EditorState, propertyId: string): PropertyType => formulaSupport.formulaContext.readPropertyType(state, propertyId);

  const readSummaryIcon: ReadSummaryIcon = formulaSupport == null
    ? readNoSummaryIcon
    : (state: EditorState, propertyId: string, formula: string): IconName => formulaSupport.formulaContext.readSummaryIcon(state, propertyId, formula);

  // Created once: CodeMirror tells a source's earlier results apart by the source function
  const yamlCompletionSource: CompletionSource = createYamlCompletionSource(plugin.app, readPropertyType, readSummaryIcon);

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
      // Not in Obsidian's configuration: keeps the info panel inside the editor's pane
      positionInfo: getCompletionInfoPositionConfig
    }),
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
