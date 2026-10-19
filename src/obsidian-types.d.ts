/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable tsdoc/syntax */
/* ========================= IMPORTS ========================= */
import type {
  App,
  BasesEntry,
  BasesPropertyId,
  BasesView,
  BasesViewConfig,
  Command,  
  Component,
  Constructor,
  Debouncer,
  Events,
  IconName,
  KeymapInfo,
  QueryController,
  TFile,
  Value
} from 'obsidian';

import type {
  Completion,
  CompletionContext,
  CompletionResult
} from '@codemirror/autocomplete';

import type {
  Language,
  LanguageSupport as EditorLanguageSupport
} from '@codemirror/language';

import type { Parser } from '@lezer/common';

/* ========================= OBSIDIAN TYPES ========================= */
// Credit for undocumented Obsidian API typings: https://github.com/obsidian-typings/obsidian-typings

declare module 'obsidian' {
  interface App {
    /**
     * Contains all registered commands.
     *
     * @tutorial Can be used to manually invoke the functionality of a specific command.
     * @unofficial
     */
    commands: Commands;
    /**
     * References to important DOM elements of the application.
     *
     * @unofficial
     */
    dom: ObsidianDOM;
    /**
     * Navigation bar for mobile devices, or `null` on desktop.
     *
     * @unofficial
     */
    mobileNavbar: MobileNavbar | null;
    /**
     * Toolbar for mobile devices, or `null` on desktop.
     *
     * @unofficial
     */
    mobileToolbar: MobileToolbar | null;
    /**
     * Manages global hotkeys.
     *
     * @tutorial Can be used for manually invoking a command, or finding which hotkey is assigned to a specific key input.
     * @remark This should not be used for adding hotkeys to your custom commands, this can easily be done via the official API.
     * @unofficial
     */
    hotkeyManager: HotkeyManager;
    /**
     * Manager of internal 'core' plugins.
     *
     * @tutorial Can be used to check whether a specific internal plugin is enabled, or grab specific parts from its config for simplifying your own plugin's settings.
     * @unofficial
     */
    internalPlugins: InternalPlugins;
  }
  interface QueryController extends Component {
    /**
     * The app instance.
     *
     * @unofficial
     */
    app: App;
    /**
     * The current evaluation context, or `null` if none has been built yet.
     *
     * @unofficial
     */
    ctx: unknown;
    /**
     * The file the query is evaluated against, or `null` if none.
     *
     * @unofficial
     */
    currentFile: null | TFile;
    /**
     * A menu; `null` in the table views checked. Purpose not known.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    displayMenu: unknown;
    /**
     * The category of the currently displayed error (e.g. `'query'` or `'view'`), or `null` if none.
     *
     * @unofficial
     */
    error: null | string;
    /**
     * The element that displays errors in place of the view.
     *
     * @unofficial
     */
    errorEl: HTMLDivElement;
    /**
     * The error messages collected during the current query run.
     *
     * @unofficial
     */
    errors: Set<string>;
    /**
     * The event registry, emitting `'view-changed'` when the active view changes.
     *
     * @unofficial
     */
    events: Events;
    /**
     * The filter menu.
     *
     * @unofficial
     */
    filterMenu: unknown;
    /**
     * Collapsed groups, by view name: each view's set of group keys.
     * `null` until `getGroupFolds()` first loads them.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    groupFolds: Record<string, Set<unknown>> | null;
    /**
     * The group menu, in the view's toolbar.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    groupMenu: unknown;
    /**
     * Whether the initial scan of the query results is in progress.
     *
     * @unofficial
     */
    initialScan: boolean;
    /**
     * The mock context used to evaluate identifiers and resolve widget types.
     *
     * @unofficial
     */
    mockContext: BasesMockContext;
    /**
     * The new item menu.
     *
     * @unofficial
     */
    newItemMenu: unknown;
    /**
     * The Bases plugin instance.
     *
     * @unofficial
     */
    plugin: unknown;
    /**
     * The property menu.
     *
     * @unofficial
     */
    propertyMenu: unknown;
    /**
     * The current query, or `null` if none is set.
     *
     * @unofficial
     */
    query: unknown;
    /**
     * A serialized snapshot of the last-run query state, used to skip redundant re-runs, or `null` when cleared.
     *
     * @unofficial
     */
    queryState: null | string;
    /**
     * The scan queue that streams vault files into the query.
     *
     * @unofficial
     */
    queue: unknown;
    /**
     * The lowercased property keys relevant to the current results.
     *
     * @unofficial
     */
    relevantProperties: Set<string>;
    /**
     * Debounced {@link QueryController.notifyView}.
     *
     * @unofficial
     */
    requestNotifyView: Debouncer<[], void>;
    /**
     * The recorded result entries, keyed by file.
     *
     * @unofficial
     */
    results: Map<TFile, BasesEntry>;
    /**
     * The results menu.
     *
     * @unofficial
     */
    resultsMenu: unknown;
    /**
     * The search menu.
     *
     * @unofficial
     */
    searchMenu: unknown;
    /**
     * The current search query, or `null` if none is set.
     *
     * @unofficial
     */
    searchQuery: null | string;
    /**
     * The sort menu.
     *
     * @unofficial
     */
    sortMenu: unknown;
    /**
     * Path of the file the query belongs to: the current file's, else the query's own file's, else an empty string.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    readonly sourcePath: string;
    /**
     * The active Bases view, or `null` if none.
     *
     * @unofficial
     */
    view: BasesView | null;
    /**
     * The container element that hosts the active view.
     *
     * @unofficial
     */
    viewContainerEl: HTMLDivElement;
    /**
     * Per-view ephemeral state, keyed by view name.
     *
     * @unofficial
     */
    viewEstates: Record<string, unknown>;
    /**
     * The view header (toolbar) element.
     *
     * @unofficial
     */
    viewHeaderEl: HTMLDivElement;
    /**
     * The view menu.
     *
     * @unofficial
     */
    viewMenu: unknown;
    /**
     * The name of the currently selected view.
     *
     * @unofficial
     */
    viewName: string;
    /**
     * Records a query result entry for a file.
     *
     * @param file - The file the entry belongs to.
     * @param entry - The result entry.
     * @unofficial
     */
    addResult(file: TFile, entry: BasesEntry): void;
    /**
     * Filters entries by the current search query.
     *
     * @param entries - The entries to filter.
     * @param order - The property order used to read values from each entry.
     * @returns The filtered entries.
     * @unofficial
     */
    applySearchQuery(entries: BasesEntry[], order: BasesPropertyId[]): BasesEntry[];
    /**
     * Builds the Bases evaluation context from the query's filters and formulas.
     *
     * @param filters - The additional filters to combine with the query's own filters.
     * @returns The evaluation context.
     * @unofficial
     */
    buildBasesContext(filters?: unknown): unknown;
    /**
     * Clears the current query and view state.
     *
     * @unofficial
     */
    clear(): void;
    /**
     * Clears the currently displayed error.
     *
     * @unofficial
     */
    clearError(): void;
    /**
     * Constructor.
     *
     * To get the constructor instance, use {@link getQueryControllerConstructor} from `obsidian-typings/implementations`.
     *
     * @param app - The app.
     * @param plugin - The plugin.
     * @param containerEl - The container element the controller renders into (the view header and view container are created inside it).
     * @param currentFile - The current file the query is evaluated against.
     * @returns The new instance.
     * @unofficial
     * @deprecated - Added only for typing purposes.
     */
    constructor2__?(app: App, plugin: unknown, containerEl: HTMLElement, currentFile?: null | TFile): this;
    /**
     * Displays an error in place of the view.
     *
     * @param type - The error category (e.g. `'query'` or `'view'`).
     * @param error - The error to display.
     * @unofficial
     */
    displayError(type: string, error: Error): void;
    /**
     * Pre-evaluates the properties relevant to the given entries.
     *
     * @param entries - The entries whose relevant properties to evaluate.
     * @unofficial
     */
    evaluateRelevantProperties(entries: BasesEntry[]): void;
    /**
     * Gets the active Bases view if it is an instance of the given type.
     *
     * @typeParam T - The view type.
     * @param type - The view constructor to match.
     * @returns The active view, or `null` if it is not of the given type.
     * @unofficial
     */
    getActiveBasesViewOfType<T extends BasesView>(type: Constructor<T>): null | T;
    /**
     * Gets the current view's groups: those in its group order first, then the rest.
     *
     * @returns The groups, or an empty list if the view isn't grouped or has no group order.
     * @unofficial
     * @BaseSourceEditor
     */
    getAllGroups(): BasesGroupInfo[];
    /**
     * Gets the current file the query is evaluated against.
     *
     * @returns The current file, or `null` if none.
     * @unofficial
     */
    getCurrentFile(): null | TFile;
    /**
     * Gets the editor language support used for the query editor.
     *
     * @returns The editor language support.
     * @unofficial
     * @BaseSourceEditor
     */
    getEditorLanguageSupport(): BasesFormulaLanguageSupport;
    /**
     * Gets the controller's ephemeral state.
     *
     * @returns The ephemeral state.
     * @unofficial
     */
    getEphemeralState(): QueryControllerEphemeralState;
    /**
     * Gets the current view's collapsed groups, loading them for all views the first time.
     *
     * @returns The current view's set of collapsed group keys.
     * @unofficial
     * @BaseSourceEditor
     */
    getGroupFolds(): Set<unknown>;
    /**
     * Gets the property identifiers available to the query.
     *
     * @returns The available property identifiers.
     * @unofficial
     */
    getProperties(): BasesPropertyId[];
    /**
     * Gets the names of the views defined in the query.
     *
     * @returns The view names.
     * @unofficial
     */
    getQueryViewNames(): string[];
    /**
     * Gets the current search query string.
     *
     * @returns The search query, or `null` if none is set.
     * @unofficial
     */
    getSearchQuery(): null | string;
    /**
     * Gets the config for the currently selected view.
     *
     * @returns The view config.
     * @unofficial
     */
    getViewConfig(): BasesViewConfig;
    /**
     * Gets the widget type identifier for a property identifier.
     *
     * @param ident - The property identifier.
     * @returns The widget type identifier.
     * @unofficial
     */
    getWidgetForIdent(ident: string): string;
    /**
     * Reads every view's collapsed groups from the app's local storage, for this Base's file.
     * Views that no longer exist are left out.
     *
     * @returns Each view's set of collapsed group keys, by view name.
     * @unofficial
     * @BaseSourceEditor
     */
    loadGroupFolds(): Record<string, Set<unknown>>;
    /**
     * Notifies the active view of updated results.
     *
     * @unofficial
     */
    notifyView(): void;
    /**
     * Handles a config change.
     *
     * @param key - The config key that changed.
     * @unofficial
     */
    onConfigChanged(key: string): void;
    /**
     * Handles a resize of the view container.
     *
     * @unofficial
     */
    onResize(): void;
    /**
     * Prompts the user to add a new view.
     *
     * @unofficial
     */
    promptForAddView(): void;
    /**
     * Removes a previously recorded result entry for a file.
     *
     * @param file - The file whose entry to remove.
     * @unofficial
     */
    removeResult(file: TFile): void;
    /**
     * Runs the query against the given context.
     *
     * @param context - The evaluation context.
     * @unofficial
     */
    runQuery(context: unknown): void;
    /**
     * Saves every view's collapsed groups to the app's local storage, for this Base's file.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    saveGroupFolds(): void;
    /**
     * Selects the view with the given name.
     *
     * @param viewName - The name of the view to select.
     * @unofficial
     */
    selectView(viewName: string): void;
    /**
     * Sets the controller's ephemeral state.
     *
     * @param state - The ephemeral state to apply.
     * @unofficial
     */
    setEphemeralState(state: Partial<QueryControllerEphemeralState>): void;
    /**
     * Sets the query, or displays an error if an Error is given.
     *
     * @param query - The query to set, or an Error to display.
     * @unofficial
     */
    setQuery(query: unknown): void;
    /**
     * Sets both the query and the selected view name.
     *
     * @param query - The query to set, or an Error to display.
     * @param viewName - The view name to select.
     * @unofficial
     */
    setQueryAndView(query: unknown, viewName: string): void;
    /**
     * Starts the loading indicator.
     *
     * @unofficial
     */
    startLoader(): void;
    /**
     * Stops the loading indicator.
     *
     * @unofficial
     */
    stopLoader(): void;
    /**
     * Re-evaluates the query for the current view.
     *
     * @unofficial
     */
    update(): void;
    /**
     * Updates the current file and re-runs the query if needed.
     *
     * @param file - The new current file.
     * @unofficial
     */
    updateCurrentFile(file: TFile): void;
    /**
     * Updates the search query and re-notifies the view if it changed.
     *
     * @param searchQuery - The new search query.
     * @unofficial
     */
    updateSearchQuery(searchQuery: string): void;
  }
  interface SettingDefinitionBase {
    /**
     * Icon shown before the setting's name, as in Obsidian's mobile toolbar settings.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    icon?: IconName;
  }
}

/**
 * @unofficial
 * @BaseSourceEditor
 */
export interface KeyboardWillHideEvent extends Event {
  /**
   * Whether a physical keyboard is connected. The on-screen keyboard hides when one is used,
   * but the user can still type.
   */
  hasPhysicalKeyboard?: boolean;
}

/**
 * Core DOM elements of the Obsidian application layout.
 *
 * @public
 * @unofficial
 */
export interface ObsidianDOM {
  /**
   * Root element of the application.
   */
  appContainerEl: HTMLElement;
  /**
   * Child of {@link ObsidianDOM.appContainerEl} containing the main content of the application.
   */
  horizontalMainContainerEl: HTMLElement;
  /**
   * Status bar element containing word count among other things.
   */
  statusBarEl: HTMLElement;
  /**
   * Child of {@link ObsidianDOM.horizontalMainContainerEl} containing the workspace DOM.
   */
  workspaceEl: HTMLElement;
  /**
   * Constructor.
   *
   * To get the constructor instance, use {@link getObsidianDOMConstructor} from `obsidian-typings/implementations`.
   *
   * @param containerEl - The containerEl.
   * @returns The new instance.
   * @deprecated - Added only for typing purposes.
   */
  constructor__?(containerEl: HTMLElement): this;
}

/**
 * Navigation bar component for the mobile interface.
 *
 * @public
 * @unofficial
 * @BaseSourceEditor
 */
export interface MobileNavbar {
  /**
   * Shows the navbar, unless Obsidian's own toolbar or the on-screen keyboard is visible.
   */
  show(): void;
  hide(): void;
}

/**
 * Toolbar component displayed above the keyboard on mobile.
 *
 * @public
 * @unofficial
 * @BaseSourceEditor
 */
export interface MobileToolbar {
  /**
   * Whether the toolbar is shown.
   */
  isVisible: boolean;
  /**
   * Android only: whether the app is in split-screen.
   */
  isMultiWindowMode: boolean;
}

/**
 * Bases view controller mock context.
 * The identifiers a formula can use, and a value of the right type for each.
 * Obsidian's formula autocomplete reads it.
 * 
 * @public
 * @unofficial
 * @BaseSourceEditor
 */
export type BasesMockContext = {
  /**
   * Reference to the app.
   */
  app: App;
  /**
   * Every vault property, each with an empty value of its type, by property name.
   * Null until `cacheProps()` is first called.
   */
  cachedProps: Record<string, Value> | null;
  /**
   * The formulas given to the constructor, and their results once evaluated.
   */
  formulaResults: BasesFormulaResults;
  /**
   * Identifiers a formula can use: every vault property, plus `note`, `file`, `formula` and `this`.
   */
  keys(): string[];
  /**
   * Gets a value of the right type for an identifier.
   *
   * @param identifier - Identifier, such as `note` or a property name.
   */
  getByIdentifier(identifier: string): Value;
  /**
   * Parses a formula expression, then evaluates it with `evaluateFormula()`.
   *
   * @param expression - Formula expression.
   */
  evaluateIdent(expression: string): Value;
  /**
   * Evaluates a parsed formula with this context.
   *
   * @param formula - Parsed formula.
   * @returns The formula's result, or a null value if it fails or couldn't be parsed.
   */
  evaluateFormula(formula: BasesFormula): Value;
  /**
   * Gets every vault property, each with an empty value of its type, by property name.
   * Reads the properties the first time it's called, then returns the same object each time.
   */
  cacheProps(): Record<string, Value>;
}

/**
 * Constructor of Obsidian's mock context class. Reached through `QueryController.mockContext.constructor`.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export type BasesMockContextConstructor = new (app: App, formulas: Record<string, BasesFormula>) => BasesMockContext;

/**
 * A formula, as the mock context expects it.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesFormula {
  /**
   * Evaluates the formula.
   *
   * @param context - Context to evaluate it with.
   */
  getValue(context: BasesMockContext): Value;
}

/**
 * A mock context's formulas, and their results once evaluated. Reached through `BasesMockContext.formulaResults`.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesFormulaResults {
  /**
   * The mock context these formulas belong to.
   */
  ctx: BasesMockContext;
  /**
   * The formulas, by name, as given to the mock context's constructor.
   */
  formulas: Record<string, BasesFormula>;
  /**
   * Results of the formulas evaluated so far, by name, reused instead of evaluating a formula again.
   * While a formula is being evaluated, its entry holds a placeholder instead, to detect formulas that depend on themselves.
   */
  cachedFormulaOutputs: Record<string, Value>;
  /**
   * Gets a formula's result, evaluating it the first time it's asked for.
   *
   * @param name - Formula name.
   * @returns The result, or null if there's no formula with that name.
   * @throws If the formula depends on itself, directly or through other formulas.
   */
  getFormulaValue(name: string): Value | null;
}

/**
 * The ephemeral (non-persisted) state of a {@link QueryController}, keyed by view name.
 *
 * @unofficial
 */
export interface QueryControllerEphemeralState {
  /**
   * Per-view ephemeral state, keyed by view name.
   */
  views: Record<string, unknown>;
}

/**
 * A group in a Base view, as `QueryController.getAllGroups()` lists it.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesGroupInfo {
  /**
   * The group's key: the value its entries share.
   */
  key: unknown;
  /**
   * Number of entries in the group.
   */
  count: number;
  /**
   * Whether the group is in the view's group order. Groups that aren't come last, with this set to false.
   */
  isVisible: boolean;
}

/**
 * `QueryController`'s constructor. The public typings don't declare its parameters.
 *
 * @unofficial
 */
export type QueryControllerConstructor = new (app: App, plugin: unknown, containerEl: HTMLElement, currentFile: TFile | null) => QueryController;

/**
 * Language support of Obsidian's formula editor, from `QueryController.getEditorLanguageSupport()`.
 * Its class also has two static functions, `renderIcon` and `renderDetail`: the popup's renderers,
 * which `src/Autocompletion/renderOption.ts` copies.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesFormulaLanguageSupport extends EditorLanguageSupport {
  /**
   * The mock context it was created with, which its suggestions' identifiers and types come from.
   */
  ctx: BasesMockContext;
  /**
   * Completion source: suggestions at the cursor. Returns null on phones.
   *
   * @param context - Completion context.
   */
  autocomplete(context: CompletionContext): CompletionResult | null;
  /**
   * Everything that can start a formula: properties, identifiers, this file's formulas and global functions.
   */
  expressionCompletions(): Completion[];
  /**
   * Writes an identifier the way a formula refers to it, for names that can't be used as they are, such as names with spaces.
   *
   * @param identifier - Identifier, such as a property name.
   * @returns The text to insert, such as `note["film - title"]`.
   */
  getEncodedIdentifier(identifier: string): string;
  /**
   * Creates the suggestion for a formula function: its name with brackets, its signature and description
   * for the info panel, and an insert that puts the cursor inside the brackets if it takes arguments.
   *
   * @param func - The function's definition.
   * @param isMethod - Whether it's called on a value, as `startsWith()` is in `file.name.startsWith()`.
   *   Inferred from minified code: when true, the first parameter doesn't count as an argument.
   * @returns The suggestion.
   */
  funcCompletion(func: BasesFormulaFunction, isMethod: boolean): Completion;
}

/**
 * A formula function's definition, such as `if` or `now`, as Obsidian's formula autocomplete reads it.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesFormulaFunction {
  /**
   * Function name, such as `if`.
   */
  name: string;
  /**
   * The function's parameters, in order.
   */
  params: BasesFormulaFunctionParameter[];
  /**
   * Description for the info panel, or a function that returns it.
   */
  docString: string | (() => string);
  /**
   * Null in the global functions checked; purpose not known.
   */
  ctx: unknown;
  /**
   * Runs the function with its argument values.
   *
   * @param args - Argument values.
   * @returns The result.
   */
  apply(...args: unknown[]): unknown;
}

/**
 * A parameter in a formula function's definition.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesFormulaFunctionParameter {
  /**
   * Parameter name, such as `condition`.
   */
  name: string;
  /**
   * The parameter's type: an internal object whose text form is the type's name, such as `Boolean`.
   */
  type: unknown;
  /**
   * Whether the parameter can be left out. Not present on required parameters.
   */
  optional?: boolean;
}

/**
 * Bases' own copy of CodeMirror's `LRLanguage` class, reached through a language's `constructor`.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesLRLanguageClass {
  /**
   * Defines a language, as `LRLanguage.define()` does.
   *
   * @param spec - Name and parser.
   */
  define(spec: { name?: string; parser: Parser }): Language;
}

/**
 * IDs of Obsidian's core plugins, as in `app.internalPlugins.plugins` (checked in Obsidian 1.14.4).
 * `@obsidian-typings` (obsidian-public-1.14.4) also lists `markdown-importer`, which isn't among Obsidian 1.14.4's core plugins.
 *
 * @unofficial
 */
export type InternalPluginNameType =
  | 'audio-recorder'
  | 'backlink'
  | 'bases'
  | 'bookmarks'
  | 'canvas'
  | 'command-palette'
  | 'daily-notes'
  | 'editor-status'
  | 'file-explorer'
  | 'file-recovery'
  | 'footnotes'
  | 'global-search'
  | 'graph'
  | 'note-composer'
  | 'outgoing-link'
  | 'outline'
  | 'page-preview'
  | 'properties'
  | 'publish'
  | 'random-note'
  | 'slash-command'
  | 'slides'
  | 'switcher'
  | 'sync'
  | 'tag-pane'
  | 'templates'
  | 'webviewer'
  | 'word-count'
  | 'workspaces'
  | 'zk-prefixer';

/**
 * Obsidian's core plugins. Also sends events, through Obsidian's `Events` class.
 *
 * @unofficial
 */
export interface InternalPlugins extends Events {
  /**
   * Reference to the app.
   */
  app: App;
  /**
   * Whether each core plugin is enabled, by plugin ID.
   */
  config: Record<InternalPluginNameType, boolean>;
  /**
   * Each core plugin, by plugin ID. Prefer `getPluginById()` or `getEnabledPluginById()`.
   */
  plugins: Record<InternalPluginNameType, unknown>;
  /**
   * Saves which core plugins are enabled, a moment after the last call.
   */
  requestSaveConfig: Debouncer<[], Promise<void>>;
  /**
   * Constructor.
   *
   * To get the constructor instance, use {@link getInternalPluginsConstructor} from `obsidian-typings/implementations`.
   *
   * @param app - The app.
   * @returns The new instance.
   * @deprecated - Added only for typing purposes.
   */
  constructor2__?(app: App): this;
  /**
   * Reads which core plugins are enabled from the vault's settings, and enables them.
   */
  enable(): Promise<void>;
  /**
   * Gets a core plugin's instance, if the plugin is enabled.
   *
   * @param id - Core plugin ID, such as `bases`.
   * @returns The instance, or null if the plugin is disabled or doesn't exist.
   */
  getEnabledPluginById(id: InternalPluginNameType): unknown;
  /**
   * Gets every enabled core plugin. Unlike `getEnabledPluginById()`, it gives the plugins, not their instances.
   */
  getEnabledPlugins(): unknown[];
  /**
   * Gets a core plugin, enabled or not.
   *
   * @param id - Core plugin ID, such as `bases`.
   * @returns The plugin, or null if there's no core plugin with that ID.
   */
  getPluginById(id: InternalPluginNameType): unknown;
  /**
   * Registers a core plugin.
   *
   * @param definition - The plugin's definition.
   * @returns The same definition.
   * @throws If a plugin with the same ID is already loaded.
   */
  loadPlugin(definition: unknown): unknown;
  /**
   * Handles a change to a file in the vault's settings folder: if it's a core plugin's settings, that plugin reloads them.
   *
   * @param path - Path of the changed file.
   */
  onRaw(path: string): void;
  /**
   * Saves which core plugins are enabled to the vault's settings.
   */
  saveConfig(): Promise<void>;
}

/**
 * Manager for registering, finding, and executing commands.
 *
 * @public
 * @unofficial
 */
export interface Commands extends Events {
  /**
   * Reference to the {@link obsidian#App}.
   */
  app: App;
  /**
   * Commands *without* editor callback, will always be available in the command palette.
   *
   * @example `app:open-vault` or `app:reload`.
   */
  commands: CommandsCommandsRecord;
  /**
   * Commands *with* editor callback, will only be available when editor is active and callback returns
   * `true`.
   *
   * @example `editor:fold-all` or `command-palette:open`.
   */
  editorCommands: CommandsEditorCommandsRecord;
  /**
   * Add a command to the command registry.
   *
   * @param command - Command to add.
   */
  addCommand(command: Command): void;
  /**
   * Constructor.
   *
   * To get the constructor instance, use {@link getCommandsConstructor} from `obsidian-typings/implementations`.
   *
   * @param app - The app.
   * @returns The new instance.
   * @deprecated - Added only for typing purposes.
   */
  constructor2__?(app: App): this;
  /**
   * Execute a command by reference.
   *
   * @param command - {@link obsidian#Command} to execute.
   * @returns Whether the command was successfully executed.
   */
  executeCommand(command: Command, event?: Event): boolean;
  /**
   * Execute a command by ID.
   *
   * @param commandId - ID of command to execute.
   * @returns Whether the command was successfully executed.
   */
  executeCommandById(commandId: string, event?: Event): boolean;
  /**
   * Find a command by ID.
   *
   * @param commandId - ID of command to find.
   * @returns The command, or `undefined` if not found.
   */
  findCommand(commandId: string): Command | undefined;
  /**
   * Lists **all** commands, both with and without editor callback.
   *
   * @returns All registered commands.
   */
  listCommands(): Command[];
  /**
   * Remove a command from the command registry.
   *
   * @param commandId - ID of command to remove.
   */
  removeCommand(commandId: string): void;
}

/**
 * Record mapping command IDs to {@link obsidian#Command} objects without editor callbacks.
 *
 * @public
 * @unofficial
 */
export type CommandsCommandsRecord = Record<string, Command>;

/**
 * Record mapping command IDs to {@link obsidian#Command} objects with editor callbacks.
 *
 * @public
 * @unofficial
 */
export type CommandsEditorCommandsRecord = Record<string, Command>;

/**
 * Record mapping command IDs to their user-customized hotkey bindings.
 *
 * @public
 * @unofficial
 */
export type HotkeyManagerCustomKeysRecord = Record<string, KeymapInfo[]>;

/**
 * Record mapping command IDs to their default hotkey bindings.
 *
 * @public
 * @unofficial
 */
export type HotkeyManagerDefaultKeysRecord = Record<string, KeymapInfo[]>;

/**
 * Manager for keyboard shortcut registration, storage, and triggering.
 *
 * @public
 * @unofficial
 */
export interface HotkeyManager {
  /**
   * Reference to the {@link obsidian#App}.
   */
  app: App;
  /**
   * Whether hotkeys have been baked (checks completed).
   */
  baked: boolean;
  /**
   * Assigned hotkeys.
   */
  bakedHotkeys: KeymapInfo[];
  /**
   * Array of hotkey index to command ID.
   */
  bakedIds: string[];
  /**
   * Custom (non-Obsidian default) hotkeys, one to many mapping of command ID to assigned hotkey.
   */
  customKeys: HotkeyManagerCustomKeysRecord;
  /**
   * Default hotkeys, one to many mapping of command ID to assigned hotkey.
   */
  defaultKeys: HotkeyManagerDefaultKeysRecord;
  /**
   * Debounced handler for hotkey config file changes on disk.
   */
  onConfigFileChange: Debouncer<[], Promise<void>>;
  /**
   * Add a hotkey to the default hotkeys.
   *
   * @param command - {@link obsidian#Command} ID to add hotkey to.
   * @param keys - Hotkeys to add.
   */
  addDefaultHotkeys(command: string, keys: KeymapInfo[]): void;
  /**
   * Bake hotkeys (create mapping of pressed key to command ID).
   */
  bake(): void;
  /**
   * Constructor.
   *
   * To get the constructor instance, use {@link getHotkeyManagerConstructor} from `obsidian-typings/implementations`.
   *
   * @param app - The app.
   * @returns The new instance.
   * @deprecated - Added only for typing purposes.
   */
  constructor__?(app: App): this;
  /**
   * Get hotkey associated with command ID.
   *
   * @param command - {@link obsidian#Command} ID to get hotkey for.
   * @returns The default hotkeys for the command.
   */
  getDefaultHotkeys(command: string): KeymapInfo[];
  /**
   * Get hotkey associated with command ID.
   *
   * @param command - {@link obsidian#Command} ID to get hotkey for.
   * @returns The hotkeys for the command.
   */
  getHotkeys(command: string): KeymapInfo[];
  /**
   * Load hotkeys from storage.
   */
  load(): void;
  /**
   * Handle raw file system change events for the hotkey config.
   *
   * @param e - The file system change event.
   */
  onRaw(e: unknown): void;
  /**
   * Trigger a command by keyboard event.
   *
   * @param event - Keyboard event to trigger command with.
   * @param keypress - Pressed key information.
   * @returns Whether a command was triggered.
   */
  onTrigger(event: KeyboardEvent, keypress: KeymapInfo): boolean;
  /**
   * Pretty-print hotkey of a command.
   *
   * @param commandId - {@link obsidian#Command} ID to print hotkey for.
   * @returns The formatted hotkey string.
   */
  printHotkeyForCommand(commandId: string): string;
  /**
   * Register event listeners for hotkey config file changes.
   */
  registerListeners(): void;
  /**
   * Remove a hotkey from the default hotkeys.
   *
   * @param command - {@link obsidian#Command} ID to remove hotkey from.
   */
  removeDefaultHotkeys(command: string): void;
  /**
   * Remove a hotkey from the custom hotkeys.
   *
   * @param command - {@link obsidian#Command} ID to remove hotkey from.
   */
  removeHotkeys(command: string): void;
  /**
   * Save custom hotkeys to storage.
   */
  save(): void;
  /**
   * Add a hotkey to the custom hotkeys (overrides default hotkeys).
   *
   * @param command - {@link obsidian#Command} ID to add hotkey to.
   * @param keys - Hotkeys to add.
   */
  setHotkeys(command: string, keys: KeymapInfo[]): void;
}

declare global {
  /**
   * Events fired on `window` by Obsidian's mobile apps, as the on-screen keyboard opens and closes.
   * When they fire, Obsidian has already set `--keyboard-height` to the new height.
   *
   * @unofficial
   * @BaseSourceEditor
   */
  interface WindowEventMap {
    keyboardWillShow: Event;
    keyboardWillHide: KeyboardWillHideEvent;
    /** Android only: the app entered or left split-screen. */
    multiWindowModeChanged: Event;
  }
}