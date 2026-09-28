/* ========================= IMPORTS ========================= */
import type {
  Component 
} from 'obsidian';

import type {
  LanguageSupport as EditorLanguageSupport
} from '@codemirror/language';

/* ========================= OBSIDIAN TYPES ========================= */

declare module 'obsidian' {
  export interface QueryController extends Component {
    /**
     * The mock context used to evaluate identifiers and resolve widget types.
     *
     * @unofficial
     */
    mockContext: BasesMockContext;

    /**
     * Gets the editor language support used for the query editor.
     *
     * @returns The editor language support.
     * @unofficial
     */
    getEditorLanguageSupport(): EditorLanguageSupport;
  }
}

/**
 * Bases view controller mock context.
 *
 * @public
 * @unofficial
 */
export interface BasesMockContext {}
