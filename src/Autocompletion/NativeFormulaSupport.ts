/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { QueryController } from 'obsidian';
import type { 
  App,
  Component
} from 'obsidian';

/* CODEMIRROR */
import { LRLanguage } from '@codemirror/language';
import type { Language } from '@codemirror/language';
import { StateField } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

/* PLUGIN */
import type { BaseYamlLanguage } from 'src/BaseYamlLanguage/BaseYamlLanguage';
import { createFormulaCompletionSource } from 'src/Autocompletion/formulaCompletionSource';
import { FallbackMockContext } from 'src/Autocompletion/FallbackMockContext';
import { FormulaContext } from 'src/Autocompletion/FormulaContext';
import type { MockContextClass } from 'src/Autocompletion/FormulaContext';
import { logError } from 'src/Util/logError';

import type {
  BasesFormulaLanguageSupport,
  BasesIdentifierContext,
  BasesLRLanguageClass,
  BasesMockContext,
  BasesMockContextConstructor,
  QueryControllerConstructor
} from 'src/obsidian-types';

/* ========================= NativeFormulaSupport ========================= */

const SHADOW_LANGUAGE_NAME: string = 'base-yaml-shadow';
const UNAVAILABLE_MESSAGE: string = 'formula suggestions are off.';
const FALLBACK_MESSAGE: string = 'formula suggestions carry on without formula result types.';

/**
 * Provides Obsidian's own formula autocomplete and function signature tooltip to Base Source editors.
 *
 * @remarks
 * Uses undocumented Obsidian API. If Obsidian's mock context class can't be found, a {@link FallbackMockContext}
 * takes its place. If any other part is missing, formula autocomplete is turned off.
 */
export class NativeFormulaSupport {
  private app: App;
  private baseYamlLanguage: BaseYamlLanguage;

  /** Obsidian's mock context class: `undefined` until first needed, `null` if it can't be found. */
  private mockContextClass: BasesMockContextConstructor | null | undefined = undefined;

  /** The shadow language: `undefined` until first needed, `null` if it isn't needed or can't be created. */
  private shadowLanguage: Language | null | undefined = undefined;

  constructor(app: App, baseYamlLanguage: BaseYamlLanguage) {
    this.app = app;
    this.baseYamlLanguage = baseYamlLanguage;
  }

  /**
   * Creates the extensions for formula autocomplete in one editor.
   *
   * @returns The extensions, or `null` if the Bases core plugin is off or Obsidian's formula support can't be found.
   */
  createEditorExtensions(): Extension[] | null {
    // Accessing undocumented API... keep this guard.
    try {
      const basesPlugin: unknown = this.app.internalPlugins.getEnabledPluginById('bases');

      // The Bases core plugin is turned off: a user setting, not a failure, so nothing is logged
      if (basesPlugin == null) {
        return null;
      }

      const mockContextClass: MockContextClass = this.getMockContextClass(basesPlugin) ?? FallbackMockContext;
      const formulaContext: FormulaContext = new FormulaContext(this.app, mockContextClass);
      const languageSupport: BasesFormulaLanguageSupport | null = createLanguageSupport(formulaContext.context);

      if (languageSupport == null) {
        return null;
      }

      const extensions: Extension[] = [
        // Selects the summary context in summary formulas, before Obsidian's function signature tooltip reads it
        formulaContext.createContextSelector(),
        // Replaces Obsidian's own completion source, which isn't added.
        // Obsidian's formula language looks it up at positions inside formulas.
        languageSupport.language.data.of({
          autocomplete: createFormulaCompletionSource(languageSupport, formulaContext)
        }),
        // Obsidian's function signature tooltip
        ...getTopLevelStateFields(languageSupport.support)
      ];

      const shadowLanguage: Language | null = this.getShadowLanguage(languageSupport.language);
      if (shadowLanguage != null) {
        extensions.push(shadowLanguage);
      }

      return extensions;
    } catch (error: unknown) {
      logError(`${UNAVAILABLE_MESSAGE} Couldn't create the editor extensions.`, error);
      return null;
    }
  }

  /**
   * Gets Obsidian's mock context class.
   *
   * @remarks
   * The class isn't exported, so it's read from the `mockContext` of a `QueryController` instance.
   * The QueryController is initialised but never loaded; the listeners it registers are cleaned-up manually.
   *
   * @param basesPlugin - The Bases core plugin's instance, which `QueryController`'s constructor needs.
   * @returns The class, or `null` if it can't be found.
   */
  private getMockContextClass(basesPlugin: unknown): BasesMockContextConstructor | null {
    if (this.mockContextClass !== undefined) {
      return this.mockContextClass;
    }

    // Accessing undocumented API... keep this guard.
    try {
      const QueryControllerClass = QueryController as unknown as QueryControllerConstructor;
      const queryController: QueryController = new QueryControllerClass(this.app, basesPlugin, createDiv(), null);
      const mockContext: BasesMockContext | undefined = queryController.mockContext;

      // Accessing undocumented API... keep this guard.
      // Clean up the listeners registered when the QueryController is created.
      try {
        disposeComponent(queryController);
      } catch(error: unknown) {
        logError(`Couldn't remove the listeners of the QueryController created to reach the mock context class.`, error);
      }

      if (mockContext == null || typeof mockContext.constructor !== 'function') {
        logError(`${FALLBACK_MESSAGE} A QueryController has no mockContext.`);
        this.mockContextClass = null;
        return null;
      }

      this.mockContextClass = mockContext.constructor as unknown as BasesMockContextConstructor;
      return this.mockContextClass;
    } catch (error: unknown) {
      logError(`${FALLBACK_MESSAGE} Couldn't create a QueryController to reach the mock context class.`, error);
      this.mockContextClass = null;
      return null;
    }
  }

  /**
   * Gets the shadow language: the plugin's YAML language, defined again with the Bases plugin's copy of `LRLanguage`.
   *
   * @remarks
   * Obsidian bundles two copies of `@codemirror/language`: one for plugins, one for the Bases formula code.
   * Each copy keeps the syntax tree in its own state field, so the formula code can't see the tree
   * the plugin's language creates. The shadow language parses the same document into the Bases copy.
   *
   * @param nativeLanguage - Obsidian's formula language.
   * @returns The shadow language, or `null` if it isn't needed or can't be created.
   */
  private getShadowLanguage(nativeLanguage: Language): Language | null {
    if (this.shadowLanguage !== undefined) {
      return this.shadowLanguage;
    }

    // Only one copy: the formula code already sees the plugin's tree, and a shadow language would duplicate every completion
    if (nativeLanguage instanceof LRLanguage) {
      this.shadowLanguage = null;
      return null;
    }

    const BasesLRLanguage: BasesLRLanguageClass = nativeLanguage.constructor as unknown as BasesLRLanguageClass;

    if (typeof BasesLRLanguage.define !== 'function') {
      logError(`${UNAVAILABLE_MESSAGE} Bases' copy of LRLanguage has no define(), so the shadow language can't be made.`);
      this.shadowLanguage = null;
      return null;
    }

    this.shadowLanguage = BasesLRLanguage.define({
      name: SHADOW_LANGUAGE_NAME,
      parser: this.baseYamlLanguage.getLanguageSupport().language.parser
    });
    return this.shadowLanguage;
  }
}

/**
 * Creates Obsidian's formula language support, reading identifiers from a mock context.
 *
 * @remarks
 * Calls `QueryController.prototype.getEditorLanguageSupport()` with a minimal `this` that only has `mockContext`.
 *
 * @param mockContext - Mock context to read identifiers and their types from.
 * @returns The language support, or `null` if it can't be created.
 */
function createLanguageSupport(mockContext: BasesIdentifierContext): BasesFormulaLanguageSupport | null {
  const proto: QueryController = QueryController.prototype;

  if (typeof proto.getEditorLanguageSupport !== 'function') {
    logError(`${UNAVAILABLE_MESSAGE} QueryController has no getEditorLanguageSupport().`);
    return null;
  }

  const languageSupport: BasesFormulaLanguageSupport = proto.getEditorLanguageSupport.call({ mockContext: mockContext });

  if (typeof languageSupport.autocomplete !== 'function') {
    logError(`${UNAVAILABLE_MESSAGE} Obsidian's formula language support has no autocomplete().`);
    return null;
  }
  return languageSupport;
}

/**
 * Gets the state fields at the top level of an extension, without looking inside nested arrays.
 *
 * @remarks
 * In Obsidian's formula language support, the only top-level state field is the function signature tooltip.
 * Nested fields belong to other parts, such as its own autocomplete configuration.
 *
 * @param extension - Extension to search.
 * @returns The state fields found.
 */
function getTopLevelStateFields(extension: Extension): StateField<unknown>[] {
  if (Array.isArray(extension) === false) {
    return extension instanceof StateField ? [extension] : [];
  }

  const items: Extension[] = extension as Extension[];
  return items.filter((item: Extension): item is StateField<unknown> => item instanceof StateField);
}

/**
 * Calls the functions that a {@link Component}'s `unload()` would run.
 *
 * @remarks
 * A Component that is initialised but never loaded can still register events and children.
 * Listeners can be left behind, causing memory leaks.
 *
 * @param component - Component that was initialised but not loaded.
 */
function disposeComponent(component: Component): void {
  for (const child of component._children) {
    disposeComponent(child);
  }
  while (component._events.length > 0) {
    component._events.pop()?.();
  }
}
