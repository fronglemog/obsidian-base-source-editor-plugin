/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type { App } from 'obsidian';

/* CODEMIRROR */
import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource
} from '@codemirror/autocomplete';

import { syntaxTree } from '@codemirror/language';

/* PLUGIN */
import { getKeySuggestions } from 'src/Autocompletion/baseSchema';
import { getKeyPosition } from 'src/Autocompletion/cursorContext';
import type { KeyPosition } from 'src/Autocompletion/cursorContext';
import { getViewOptionKeys } from 'src/Autocompletion/viewRegistrations';

/* ============================================================ */

/** Text a key suggestion stays valid for while typing, so CodeMirror filters it instead of asking again. */
const KEY_TEXT: RegExp = /^[A-Za-z]*$/;

/**
 * How far key suggestions move up among suggestions that match as well, from -99 to 99.
 * Under `filters:` and in a filter list, `and`, `or` and `not` share the popup with formula suggestions,
 * and come first.
 */
const KEY_BOOST: number = 99;

/**
 * Creates the completion source for the keys of a Base's YAML: `views`, `type`, `groupBy`, a view's options, and so on.
 *
 * @remarks
 * At a key position, it suggests the keys the mapping can have that aren't there yet. A picked key is inserted with `: `;
 * when renaming an existing key, only its name is replaced. On an empty line or a `- `, it only suggests on Ctrl+Space,
 * so indenting a new line doesn't open the popup.
 *
 * @param app - The app, for the view types' options.
 * @returns The completion source.
 */
export function createYamlKeyCompletionSource(app: App): CompletionSource {
  const completionSource: CompletionSource = (context: CompletionContext): CompletionResult | null => {
    const position: KeyPosition | null = getKeyPosition(syntaxTree(context.state), context.state.doc, context.pos);
    if (position == null) {
      return null;
    }

    // While typing, only once part of a key is typed
    if (context.explicit === false && context.pos === position.from) {
      return null;
    }

    const keys: string[] = getKeySuggestions(position, (viewType: string): string[] => getViewOptionKeys(app, viewType));
    if (keys.length === 0) {
      return null;
    }

    const options: Completion[] = keys.map((key: string): Completion => ({
      label: key,
      apply: position.isRename === true ? key : `${key}: `,
      boost: KEY_BOOST
    }));

    return {
      from: position.from,
      to: position.to,
      options,
      validFor: KEY_TEXT
    };
  };

  return completionSource;
}
