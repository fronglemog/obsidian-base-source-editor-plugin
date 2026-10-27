/* eslint-disable tsdoc/syntax */
/* ========================= IMPORTS ========================= */
import type {
  App,
  BasesEntry,
  BasesPropertyId,
  BasesView,
  BasesViewConfig,
  BasesViewFactory,
  BasesViewRegistration,
  CachedMetadata,
  Command,
  Component,
  Constructor,
  DateValue,
  Debouncer,
  Editor,
  EventRef,
  Events,
  FileValue,
  HoverPopover,
  IconName,
  KeymapInfo,
  Menu,
  moment,
  ObjectValue,
  QueryController,
  TAbstractFile,
  TFile,
  TFolder,
  UserEvent,
  Value,
  WorkspaceLeaf
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

import type {
  RangeSet,
  RangeValue,
  SelectionRange,
  Text as EditorText
} from '@codemirror/state';

import type {
  EditorView,
  MouseSelectionStyle,
  ViewUpdate
} from '@codemirror/view';

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
    /**
     * Manages the frontmatter properties of the vault and the rendering of the properties.
     *
     * @tutorial Fetching properties used in all frontmatter fields, may potentially be used for adding custom frontmatter widgets.
     * @unofficial
     */
    metadataTypeManager: MetadataTypeManager;
  }

  interface Component {
    /**
     * Child Components attached to current component, will be unloaded on unloading parent component.
     *
     * @unofficial
     */
    _children: Component[];
    /**
     * Events that are attached to the current component, will be detached on unloading parent component.
     * Functions added by `register()` and the other `register*()` methods, run last-first when this component unloads.
     *
     * @unofficial
     */
    _events: (() => unknown)[];
    /**
     * Whether the component and its children are loaded.
     *
     * @unofficial
     */
    _loaded: boolean;
  }

  /**
   * A reference to an event listener, returned by {@link Events.on}.
   * @public
   */
  interface EventRef {
    /**
     * Context applied to the event callback.
     *
     * @unofficial
     */
    ctx?: unknown;
    /**
     * Events object the event was registered on.
     *
     * @unofficial
     */
    e: Events;
    /**
     * Event name the event was registered on.
     *
     * @unofficial
     */
    name: string;
    /**
     * Function to be called on event trigger on the events object.
     *
     * @param arg - The event arguments.
     * @unofficial
     */
    fn(...arg: unknown[]): void;
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

  interface Value {
    /**
     * Icon of the value's type, set by each value class: `lucide-binary` for a number, `lucide-calendar` for a date
     * without a time and `lucide-clock` for one with a time, `lucide-file-question` for the null value.
     *
     * @unofficial
     */
    icon: IconName;
    /**
     * The value's class: a getter that returns `this.constructor`.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    readonly type: typeof Value;
    /**
     * Gets the keys {@link Value.objectAccess} accepts, such as `year` and `month` for a date.
     *
     * @returns The keys, or none for a value without any.
     * @unofficial
     */
    keys(): string[];
    /**
     * Gets a part of the value by its key.
     *
     * @param key - One of {@link Value.keys}.
     * @returns The part, or `null` if the value has no part with that key.
     * @unofficial
     */
    objectAccess(key: string): Value | null;
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
 * The part of a mock context that Obsidian's formula language support calls: the identifiers a formula can use,
 * and a value of the right type for each.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface BasesIdentifierContext {
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
export type BasesMockContext = BasesIdentifierContext & {
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
 * `ObjectValue`'s constructor: `data` holds the object's entries, as values or as plain data that's wrapped on access.
 * The public typings don't declare its parameters.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export type ObjectValueConstructor = new (data: Record<string, unknown>) => ObjectValue;

/**
 * `FileValue`'s constructor. The public typings don't declare its parameters.
 *
 * @remarks
 * Obsidian's mock context passes `null` when no file is active. The value's `toString()` then throws,
 * but autocomplete only reads its class.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export type FileValueConstructor = new (app: App, file: TFile | null) => FileValue;

/**
 * `DateValue`'s constructor: `time` is whether the value includes a time of day, `true` if left out.
 * The public typings don't declare its parameters.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export type DateValueConstructor = new (date: Date, time?: boolean) => DateValue;

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
   * It calls only `keys()` and `getByIdentifier()` on it.
   */
  ctx: BasesIdentifierContext;
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
   * Gets the Bases core plugin's instance, if the plugin is enabled.
   *
   * @param id - `bases`.
   * @returns The instance, or null if the plugin is disabled.
   */
  getEnabledPluginById(id: 'bases'): BasesPluginInstance | null;
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
 * The Bases core plugin's instance: the registered view types, and the commands and menu items that create Bases.
 * From `app.internalPlugins.getEnabledPluginById('bases')` (checked in Obsidian 1.14.5).
 *
 * @unofficial
 */
export interface BasesPluginInstance {
  /**
   * Reference to the app.
   */
  app: App;
  /**
   * Whether the plugin is enabled in a new vault.
   */
  defaultOn: boolean;
  /**
   * The plugin's description, as shown in the core plugins settings.
   */
  description: string;
  /**
   * The plugin's ID: `bases`.
   */
  id: string;
  /**
   * The plugin's name, as shown in the core plugins settings.
   */
  name: string;
  /**
   * Each registered view type, by type: Obsidian's own (`table`, `cards`, `list`, `kanban`) and other plugins'.
   * Prefer `getRegistration()`.
   */
  registrations: Record<string, BasesViewRegistration>;
  /**
   * Creates a Base in the folder for new files, and embeds it at the editor's selection as `![[path]]`.
   *
   * @param editor - The editor to embed the Base in.
   */
  createAndEmbedBase(editor: Editor): Promise<void>;
  /**
   * Creates a Base in the folder for new files and opens it, with its name selected for renaming.
   *
   * @param evt - The event that started it: with a modifier key, the Base opens in a new tab. Defaults to the app's last event.
   */
  createAndOpenBase(evt?: UserEvent): Promise<void>;
  /**
   * Creates a `.base` file.
   *
   * @param location - Folder to create it in.
   * @param filename - Name of the file, without its extension.
   * @param contents - The file's contents.
   * @returns The new file.
   */
  createNewBasesFile(location?: TFolder, filename?: string, contents?: string): Promise<TFile>;
  /**
   * Removes a view type.
   *
   * @param type - The view type, such as `table`.
   */
  deregisterView(type: string): void;
  /**
   * Gets a view type's registration.
   *
   * @param type - The view type, such as `table`.
   * @returns The registration, or `null` if no view type has that name.
   */
  getRegistration(type: string): BasesViewRegistration | null;
  /**
   * Gets every view type's registration.
   *
   * @returns The registrations, by view type.
   */
  getRegistrations(): Record<string, BasesViewRegistration>;
  /**
   * Gets the function that creates a view of a type.
   *
   * @param type - The view type, such as `table`.
   * @returns The view factory, or `null` if no view type has that name.
   */
  getViewFactory(type: string): BasesViewFactory | null;
  /**
   * Sets up the plugin when Obsidian loads it: registers the commands that create, insert, copy and switch Bases.
   *
   * @param app - The app.
   * @param plugin - Obsidian's wrapper for the core plugin.
   */
  init(app: App, plugin: unknown): void;
  /**
   * Removes Obsidian's own view types when the plugin is disabled.
   *
   * @param app - The app.
   * @param plugin - Obsidian's wrapper for the core plugin.
   * @BaseSourceEditor
   */
  onDisable(app: App, plugin: unknown): void;
  /**
   * Adds a "New base" item to an editor's context menu.
   *
   * @param menu - The context menu.
   * @param editor - The editor the menu was opened in.
   */
  onEditorMenu(menu: Menu, editor: Editor): void;
  /**
   * Sets up the plugin when it's enabled: Base embeds, the file menu item, link previews, and Obsidian's own view types.
   * It isn't an async function, so it doesn't return a promise.
   *
   * @param app - The app.
   * @param plugin - Obsidian's wrapper for the core plugin.
   * @BaseSourceEditor
   */
  onEnable(app: App, plugin: unknown): void;
  /**
   * Adds a "New base" item to a folder's context menu in the file explorer.
   *
   * @param menu - The context menu.
   * @param file - The file or folder the menu was opened on.
   * @param source - Where the menu was opened, such as `file-explorer-context-menu`.
   * @param leaf - The leaf the menu was opened in.
   */
  onFileMenu(menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf): void;
  /**
   * Adds a view type. Shows an error notice instead if a view type with that name is already registered.
   *
   * @param type - The view type, such as `table`.
   * @param registration - The view type's registration.
   */
  registerView(type: string, registration: BasesViewRegistration): void;
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

/**
 * Manager for frontmatter property types: the name and type of every property in the vault.
 *
 * @remarks
 * Its records are keyed by property name in lower case. Each entry's `name` keeps the property's spelling.
 *
 * @public
 * @unofficial
 */
export interface MetadataTypeManager extends Events {
  /**
   * Whether `load()` has finished.
   *
   * @remarks
   * `@obsidian-typings` calls this the {@link obsidian#Component} lifecycle flag, but the manager isn't a `Component`:
   * it extends `Events`, and `load()` sets this itself after reading `types.json`.
   *
   * @BaseSourceEditor
   */
  _loaded: boolean;
  /**
   * Reference to the {@link obsidian#App}.
   */
  app: App;
  /**
   * Associated widget types for each property: the types set in the vault's `types.json`,
   * plus the built-in types of `aliases`, `cssclasses` and `tags`.
   *
   * @BaseSourceEditor
   */
  assignedWidgets: MetadataTypeManagerTypesRecord;
  /**
   * Time of the last save, or the modification time of `types.json` when it was last read after a change on disk.
   * In milliseconds since 1970; `0` until then.
   *
   * @remarks
   * `@obsidian-typings` calls this a Unix timestamp, which usually means seconds.
   *
   * @BaseSourceEditor
   */
  lastSave: number;
  /**
   * Debounced handler for property type config file changes on disk: reads `types.json` again
   * if it changed since `lastSave`, 50 ms after the last call.
   *
   * @BaseSourceEditor
   */
  onConfigFileChange: Debouncer<[], Promise<void>>;
  /**
   * Registered properties of the vault. Each is typed from `assignedWidgets`, or else from its value
   * in the first note that gives it one; `text` if none does.
   *
   * @BaseSourceEditor
   */
  properties: MetadataTypeManagerPropertiesRecord;
  /**
   * Registered type widgets. A type that isn't registered gets a fallback widget from `getWidget()`.
   */
  registeredTypeWidgets: MetadataTypeManagerRegisteredTypeWidgetsRecord;
  /**
   * Constructor.
   *
   * To get the constructor instance, use {@link getMetadataTypeManagerConstructor} from `obsidian-typings/implementations`.
   *
   * @param app - The app.
   * @returns The new instance.
   * @deprecated - Added only for typing purposes.
   */
  constructor2__?(app: App): this;
  /**
   * Get all registered properties of the vault.
   *
   * @returns {@link MetadataTypeManager.properties} itself, not a copy: property info by property name in lower case.
   * @BaseSourceEditor
   */
  getAllProperties(): Record<string, PropertyInfo>;
  /**
   * Get assigned widget type for property, ignoring case. The built-in types of `aliases`, `cssclasses`
   * and `tags` count as assigned.
   *
   * @param property - Property name.
   * @returns The assigned widget type, or `null` if none is set.
   * @BaseSourceEditor
   */
  getAssignedWidget(property: string): null | PropertyWidgetType;
  /**
   * Gets a property's name and type, ignoring case.
   *
   * @param property - Property name.
   * @returns The property's info, or `{ name: property, widget: 'text' }` if no note has it.
   * @BaseSourceEditor
   */
  getPropertyInfo(property: string): PropertyInfo;
  /**
   * Counts the notes that have each property.
   *
   * @returns The number of notes, by property name in lower case.
   * @BaseSourceEditor
   */
  getPropertyOccurrences(): Record<string, number>;
  /**
   * Get expected widget type for property and the one inferred from the property value.
   *
   * @param property - Property name.
   * @param value - Property value in one note.
   * @returns Type information for the property: see {@link TypeInfo}.
   */
  getTypeInfo(property: string, value: unknown): TypeInfo;
  /**
   * Get property widget for a type, ignoring case.
   *
   * @param type - Widget type name.
   * @returns The property widget, or a fallback widget of type `unknown` if the type isn't registered.
   * @BaseSourceEditor
   */
  getWidget(type: string): PropertyWidget;
  /**
   * Load metadata type configuration: reads `types.json` with `loadData()`, then sets `_loaded`.
   *
   * @BaseSourceEditor
   */
  load(): Promise<void>;
  /**
   * Load property types from config: reads `types.json` into `assignedWidgets`, then adds the built-in types.
   * Once loaded, triggers `changed` for each property whose type changed.
   *
   * @returns A promise that resolves when the property types are loaded.
   * @BaseSourceEditor
   */
  loadData(): Promise<void>;
  /**
   * Adds a note's new properties to `properties`, and updates the spelling and type of those the user hasn't typed.
   * Listens to the metadata cache's `changed` event.
   *
   * @param file - The note that changed.
   * @param data - The note's text.
   * @param cache - The note's new metadata.
   * @BaseSourceEditor
   */
  onCacheChanged(file: TFile, data: string, cache: CachedMetadata): void;
  /**
   * Stops listening to the metadata cache's `finished` event, then calls `rebuildProperties()`.
   *
   * @BaseSourceEditor
   */
  onCacheFinished(): void;
  /**
   * Calls `onConfigFileChange()` if the file is the vault's `types.json`.
   *
   * @param path - Path of the file that changed on disk.
   * @BaseSourceEditor
   */
  onRaw(path: string): void;
  /**
   * Schedules `rebuildProperties()` if the vault's excluded files (`userIgnoreFilters`) changed.
   *
   * @param name - Name of the vault setting that changed.
   * @BaseSourceEditor
   */
  onVaultConfigChanged(name: string): void;
  /**
   * Rebuilds `properties` from `assignedWidgets` and every note's frontmatter. Properties with no known type get `text`.
   *
   * @BaseSourceEditor
   */
  rebuildProperties(): void;
  /**
   * Listens for changes to `types.json`, the vault's settings and the metadata cache, and to its own `changed` event.
   */
  registerListeners(): void;
  /**
   * Writes `assignedWidgets` to `types.json` and updates `lastSave`.
   */
  save(): Promise<void>;
  /**
   * Sets a property's type, saves it, then triggers `changed`.
   *
   * @param property - Property name.
   * @param type - Widget type to assign.
   */
  setType(property: string, type: PropertyWidgetType): Promise<void>;
  /**
   * Removes the type the user set for a property, saves, then triggers `changed`.
   *
   * @param property - Property name.
   */
  unsetType(property: string): Promise<void>;
  /**
   * Called when the user sets or removes a property's type, or `types.json` changes it.
   *
   * @param name - Event name.
   * @param callback - Called with the property's name in lower case.
   * @param ctx - `this` for the callback.
   * @BaseSourceEditor
   */
  on(name: 'changed', callback: (property: string) => unknown, ctx?: unknown): EventRef;
  /**
   * Triggers the `changed` event.
   *
   * @param name - Event name.
   * @param property - The property's name in lower case.
   * @BaseSourceEditor
   */
  trigger(name: 'changed', property: string): void;
}

/**
 * Record mapping property names, in lower case, to their metadata information across the vault.
 *
 * @public
 * @unofficial
 */
export interface MetadataTypeManagerPropertiesRecord extends Record<string, PropertyInfo> {
}

/**
 * Registered type widgets, by type.
 *
 * @public
 * @unofficial
 */
export interface MetadataTypeManagerRegisteredTypeWidgetsRecord extends Record<PropertyWidgetType, PropertyWidget> {
  /**
   * Property widget for aliases.
   */
  aliases: PropertyWidget<AliasesPropertyWidgetComponent>;
  /**
   * Property widget for checkboxes.
   */
  checkbox: PropertyWidget<CheckboxPropertyWidgetComponent>;
  /**
   * Property widget for dates.
   */
  date: PropertyWidget<DatePropertyWidgetComponent>;
  /**
   * Property widget for datetimes.
   */
  datetime: PropertyWidget<DatetimePropertyWidgetComponent>;
  /**
   * Property widget for files.
   */
  file: PropertyWidget<FilePropertyWidgetComponent>;
  /**
   * Property widget for folders.
   */
  folder: PropertyWidget<FolderPropertyWidgetComponent>;
  /**
   * Property widget for multitexts, named "List" in Obsidian.
   */
  multitext: PropertyWidget<MultitextPropertyWidgetComponent>;
  /**
   * Property widget for numbers.
   */
  number: PropertyWidget<NumberPropertyWidgetComponent>;
  /**
   * Property widget for properties: the value is the name of another property.
   */
  property: PropertyWidget<PropertyPropertyWidgetComponent>;
  /**
   * Property widget for tags.
   */
  tags: PropertyWidget<TagsPropertyWidgetComponent>;
  /**
   * Property widget for text.
   */
  text: PropertyWidget<TextPropertyWidgetComponent>;
}

/**
 * Record mapping property names, in lower case, to their assigned widget entries.
 *
 * @public
 * @unofficial
 */
export interface MetadataTypeManagerTypesRecord extends Record<string, PropertyWidgetEntry> {
}

/**
 * A property's name and type, as {@link MetadataTypeManager} keeps them.
 *
 * @remarks
 * `@obsidian-typings` also lists `occurrences`, which these objects don't have.
 * {@link MetadataTypeManager.getPropertyOccurrences} gives the counts instead.
 *
 * @public
 * @unofficial
 */
export interface PropertyInfo {
  /**
   * The property's name, spelled as in a note, or as the user typed it when setting its type.
   */
  name: string;
  /**
   * The property's type, such as `text`, `number`, `date` or `tags`. `unknown` if it couldn't be inferred from a value.
   */
  widget: string;
}

/**
 * A property's name and the type the user set for it, as {@link MetadataTypeManager.assignedWidgets} keeps them.
 *
 * @public
 * @unofficial
 */
export interface PropertyWidgetEntry {
  /**
   * The property's name, spelled as in `types.json`.
   *
   * @remarks
   * `@obsidian-typings` calls this the widget's display name; it's the property's name.
   *
   * @BaseSourceEditor
   */
  name: string;
  /**
   * The property widget type.
   */
  widget: PropertyWidgetType;
}

/**
 * Property widget type: the name of a registered type. Any string is allowed, because `types.json` can hold any name.
 *
 * @remarks
 * A property's inferred type can also be `unknown`, which isn't registered: {@link MetadataTypeManager.getWidget}
 * gives the fallback widget for it.
 *
 * @public
 * @unofficial
 * @BaseSourceEditor
 */
export type PropertyWidgetType = 'aliases' | 'checkbox' | 'date' | 'datetime' | 'file' | 'folder' | 'multitext' | 'number' | 'property' | 'tags' | 'text' | string;

/**
 * Information about a property's expected and inferred widget types, from {@link MetadataTypeManager.getTypeInfo}.
 *
 * @public
 * @unofficial
 */
export interface TypeInfo {
  /**
   * The widget of the type the user assigned to the property, or else the same widget as `inferred`.
   *
   * @BaseSourceEditor
   */
  expected: PropertyWidget;
  /**
   * The widget for the value: the assigned type's if it accepts the value; otherwise, for a `null` value,
   * the property's type in the vault; otherwise the type the value itself suggests.
   *
   * @BaseSourceEditor
   */
  inferred: PropertyWidget;
}

/**
 * Property widget: one property type, with the component that shows and edits its values.
 *
 * @typeParam ComponentType - The type of the component.
 * @public
 * @unofficial
 */
export interface PropertyWidget<ComponentType extends PropertyWidgetComponentBase = PropertyWidgetComponentBase> {
  /**
   * Lucide icon ID shown for the type, such as `lucide-text`.
   */
  icon: string;
  /**
   * Property names that always have this type: `['aliases']` for aliases and `['tags']` for tags.
   * An empty list for file, folder and property; missing for the other built-in types.
   *
   * @BaseSourceEditor
   */
  reservedKeys?: string[];
  /**
   * Identifier for the widget: its type, such as `text`.
   */
  type: string;
  /**
   * Returns the I18N name of the widget.
   *
   * @returns The localized name of the widget, such as "List" for `multitext`.
   */
  name(): string;
  /**
   * Creates the widget's component in `containerEl`, showing `data`.
   *
   * @param containerEl - The container element to render the widget into.
   * @param data - The property data to render.
   * @param context - The rendering context for the property: `PropertyRenderContext` in `@obsidian-typings`.
   * @returns The rendered widget component.
   */
  render(containerEl: HTMLElement, data: unknown, context: unknown): ComponentType;
  /**
   * Validate whether the input value to the widget is correct, for example a string for `text`.
   * The fallback widget accepts every value.
   *
   * @param value - The value to validate.
   * @returns Whether the value is valid.
   */
  validate(value: unknown): boolean;
}

/**
 * Base class for property widget components.
 *
 * @public
 * @unofficial
 */
export interface PropertyWidgetComponentBase {
  /**
   * The element the component renders into. The base class sets it.
   *
   * @BaseSourceEditor
   */
  containerEl: HTMLElement;
  /**
   * The type of the property widget.
   */
  type: string;
  /**
   * Focus the property widget: calls the component's own `onFocus()` with `mode`.
   *
   * @param mode - The focus mode. Defaults to `both`.
   */
  focus(mode?: FocusMode): void;
}

/**
 * Where {@link PropertyWidgetComponentBase.focus} puts the cursor. Only the text widget uses it.
 *
 * @public
 * @unofficial
 */
export type FocusMode = 'both' | 'end' | 'start';

/**
 * Property widget component for aliases.
 *
 * @public
 * @unofficial
 */
export interface AliasesPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The container element for the property widget.
   */
  containerEl: HTMLElement;
  /**
   * The render context for the property widget: `PropertyRenderContext` in `@obsidian-typings`.
   */
  ctx: unknown;
  /**
   * The hover popover for the property widget. Always `null`: aliases aren't shown as links.
   */
  hoverPopover: null;
  /**
   * The multiselect component for the property widget: `Multiselect` in `@obsidian-typings`.
   */
  multiselect: unknown;
  /**
   * The type of the property widget.
   */
  type: 'aliases';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Property widget component for checkboxes.
 *
 * @public
 * @unofficial
 */
export interface CheckboxPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The checkbox element for the property widget. Shown as indeterminate while the property has no value.
   */
  checkboxEl: HTMLInputElement;
  /**
   * The type of the property widget.
   */
  type: 'checkbox';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Base interface for date property widget components.
 *
 * @remarks
 * `moment.Moment` and `moment.MomentInput` are written as `ReturnType<typeof moment.unix>` and
 * `Parameters<typeof moment.utc>[0]`. The `moment` package isn't a dependency of the plugin, so its types
 * are reached through Obsidian's `moment` export, which only keeps the functions of the package's namespace.
 *
 * @public
 * @unofficial
 */
export interface DatePropertyWidgetComponentBase extends PropertyWidgetComponentBase {
  /**
   * The date of the property widget, parsed from the input. Invalid while the input doesn't hold a date.
   *
   * @remarks
   * `@obsidian-typings` marks this optional, but the constructor always sets it.
   *
   * @BaseSourceEditor
   */
  date: ReturnType<typeof moment.unix>;
  /**
   * Whether the property widget is dirty: the input changed since the value was last saved.
   */
  dirty: boolean;
  /**
   * The hover popover for the property widget. Always `null`.
   *
   * @remarks
   * `@obsidian-typings` calls this `hoverPopup`.
   *
   * @BaseSourceEditor
   */
  hoverPopover: null;
  /**
   * The input element for the property widget.
   */
  inputEl: HTMLInputElement;
  /**
   * The value of the property widget, as text, as last saved or set.
   */
  value: string;
  /**
   * Build the input element for the property widget.
   *
   * @param parentEl - The parent element.
   * @returns The input element.
   */
  buildInput(parentEl: HTMLElement): HTMLInputElement;
  /**
   * Format the date input.
   *
   * @param input - The input to format.
   * @returns The formatted date, or an empty string if the date is invalid.
   */
  format(input: ReturnType<typeof moment.unix>): string;
  /**
   * Handle focus event: focuses the input.
   *
   * @BaseSourceEditor
   */
  onFocus(): void;
  /**
   * Parse the date input into `date`.
   *
   * @param input - The input to parse.
   */
  parse(input: Parameters<typeof moment.utc>[0]): void;
  /**
   * Set the value of the property widget: shows it in the input, parses it, and clears `dirty`.
   *
   * @param value - The value to set.
   * @BaseSourceEditor
   */
  setValue(value: string): void;
}

/**
 * Property widget component for dates.
 *
 * @public
 * @unofficial
 */
export interface DatePropertyWidgetComponent extends DatePropertyWidgetComponentBase {
  /**
   * The button element for the property widget: opens the daily note for the date, and is hidden
   * while the date is invalid. `null` if the Daily notes core plugin is off.
   */
  buttonEl: HTMLDivElement | null;
  /**
   * The type of the property widget.
   *
   * @remarks
   * `datetime`, not `date`: the base class sets `date`, then this class's constructor overwrites it with `datetime`.
   * `@obsidian-typings` says `date`.
   *
   * @BaseSourceEditor
   */
  type: 'datetime';
}

/**
 * Property widget component for datetimes.
 *
 * @public
 * @unofficial
 */
export interface DatetimePropertyWidgetComponent extends DatePropertyWidgetComponentBase {
  /**
   * The type of the property widget.
   */
  type: 'datetime';
}

/**
 * Property widget component for files.
 *
 * @public
 * @unofficial
 */
export interface FilePropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The input element for the property widget, which suggests the vault's files.
   */
  inputEl: HTMLInputElement;
  /**
   * The type of the property widget.
   */
  type: 'file';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Property widget component for folders.
 *
 * @public
 * @unofficial
 */
export interface FolderPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The input element for the property widget, which suggests the vault's folders.
   */
  inputEl: HTMLInputElement;
  /**
   * The type of the property widget.
   */
  type: 'folder';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Property widget component for multiple texts.
 *
 * @public
 * @unofficial
 */
export interface MultitextPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The hover popover for the property widget: the preview of a link in one of its values, while it's open.
   *
   * @remarks
   * `@obsidian-typings` types this as always `null`, but the component is the hover parent of its links' previews.
   *
   * @BaseSourceEditor
   */
  hoverPopover: HoverPopover | null;
  /**
   * The multiselect component for the property widget: `Multiselect` in `@obsidian-typings`.
   */
  multiselect: unknown;
  /**
   * The type of the property widget.
   */
  type: 'multitext';
  /**
   * The values of the property widget, kept in step with the multiselect.
   */
  valueSet: Set<string>;
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Property widget component for numbers.
 *
 * @public
 * @unofficial
 */
export interface NumberPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The input element for the property widget.
   */
  inputEl: HTMLInputElement;
  /**
   * The type of the property widget.
   */
  type: 'number';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
  /**
   * Show the error message.
   */
  showError(): void;
}

/**
 * Property widget component for properties: the value is the name of another property.
 *
 * @remarks
 * `@obsidian-typings` also lists `inputEl`, which this component doesn't set.
 *
 * @public
 * @unofficial
 */
export interface PropertyPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The combobox component for the property widget, listing the vault's property names:
   * `PropertyPropertyWidgetComponentComboBox` in `@obsidian-typings`.
   */
  combobox: unknown;
  /**
   * The type of the property widget.
   */
  type: 'property';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Property widget component for tags.
 *
 * @public
 * @unofficial
 */
export interface TagsPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * The multiselect component for the property widget: `Multiselect` in `@obsidian-typings`.
   */
  multiselect: unknown;
  /**
   * The type of the property widget.
   */
  type: 'tags';
  /**
   * Handle focus event.
   */
  onFocus(): void;
  /**
   * Set the value of the property widget.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/**
 * Property widget component for text.
 *
 * @public
 * @unofficial
 */
export interface TextPropertyWidgetComponent extends PropertyWidgetComponentBase {
  /**
   * `true` while `commit()` or `setValue()` runs, so the `blur` that re-rendering causes doesn't save the value again.
   *
   * @BaseSourceEditor
   */
  _saving: boolean;
  /**
   * The container element for the property widget.
   */
  containerEl: HTMLElement;
  /**
   * The render context for the property widget: `PropertyRenderContext` in `@obsidian-typings`.
   */
  ctx: unknown;
  /**
   * The hover popover for the property widget: the preview of a link in the value, while it's open.
   *
   * @remarks
   * `@obsidian-typings` types this as always `null`, but the component is the hover parent of its link's preview.
   *
   * @BaseSourceEditor
   */
  hoverPopover: HoverPopover | null;
  /**
   * The input element for the property widget: an editable `div`, so long values can wrap.
   *
   * @remarks
   * `@obsidian-typings` types this as an `HTMLInputElement`.
   *
   * @BaseSourceEditor
   */
  inputEl: HTMLDivElement;
  /**
   * The type of the property widget.
   */
  type: 'text';
  /**
   * The value of the property widget.
   */
  value: string;
  /**
   * Saves a value through the render context's `onChange()`, then shows it.
   *
   * @param value - The value to save.
   * @BaseSourceEditor
   */
  commit(value: string): void;
  /**
   * Handle focus event.
   *
   * @param mode - The focus mode.
   */
  onFocus(mode?: FocusMode): void;
  /**
   * Render the property widget: the value as a link if it is one, otherwise the input.
   */
  render(): void;
  /**
   * Set the value of the property widget. A missing value becomes an empty string.
   *
   * @param value - The value to set.
   */
  setValue(value: unknown): void;
}

/* ========================= CODEMIRROR TYPES ========================= */
// From @codemirror/view 6.43.13, the version Obsidian 1.14.4 ships (its `obsidian` package's peerDependencies)

declare module '@codemirror/view' {
  interface EditorView {
    /**
     * Tracks the editor's DOM input: key presses, touches, compositions and the mouse selection in progress.
     *
     * @unofficial
     * @BaseSourceEditor
     */
    inputState: EditorInputState;
  }
}

/**
 * CodeMirror's input state, at `EditorView.inputState`: what the editor's DOM event handlers record.
 * Times are from `Date.now()`.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface EditorInputState {
  /**
   * `-1` outside a composition. Otherwise the number of changes made during the current composition.
   */
  composing: number;
  /**
   * Time the last composition ended; `0` before the first.
   */
  compositionEndedAt: number;
  /**
   * Whether the next change starts the composition: `true` if it does, `false` once the first change is marked,
   * `null` outside a composition.
   */
  compositionFirstChange: boolean | null;
  /**
   * Whether changes from DOM mutations that arrive shortly after `compositionend` still count as part of the composition.
   */
  compositionPendingChange: boolean;
  /**
   * Safari only: whether an Enter `keydown` right after `compositionend` is still ignored as part of the composition.
   */
  compositionPendingKey: boolean;
  /**
   * The range being dragged while text is dragged out of the editor, or `null`.
   */
  draggedContent: SelectionRange | null;
  /**
   * DOM event handlers and observers by event type: the editor's view plugins' first, then CodeMirror's own.
   */
  handlers: Record<string, EditorEventHandlers>;
  /**
   * Text of the last `beforeinput` event that inserted text. Used when reading DOM changes.
   */
  insertingText: string;
  /**
   * Time of the last `beforeinput` event that inserted text; `0` before the first.
   */
  insertingTextAt: number;
  /**
   * Time of the last `contextmenu` event; `0` before the first.
   */
  lastContextMenu: number;
  /**
   * Time the editor last gained focus; `0` before then, and reset to `0` in some cases.
   */
  lastFocusTime: number;
  /**
   * iOS only: time of the last `scroll` event while no finger was down, which means a glide.
   * CodeMirror doesn't set `scrollTop` within 100 ms of it, because Safari stops the glide if it does.
   */
  lastIOSMomentumScroll: number;
  /**
   * `keyCode` of the last `keydown`. Reset to `0` by the next transaction.
   */
  lastKeyCode: number;
  /**
   * Time of the last `keydown`; `0` before the first.
   */
  lastKeyTime: number;
  /**
   * The scroller's `scrollLeft` at the last `scroll` event. Restored on focus if the scroll position was reset.
   */
  lastScrollLeft: number;
  /**
   * The scroller's `scrollTop` at the last `scroll` event. Restored on focus if the scroll position was reset.
   */
  lastScrollTop: number;
  /**
   * User event type for the next selection change, such as `select.pointer`, or `null`.
   */
  lastSelectionOrigin: string | null;
  /**
   * Time `lastSelectionOrigin` was set. Reset to `0` by the next transaction.
   */
  lastSelectionTime: number;
  /**
   * Time of the last `touchstart`; `0` before the first. Mouse presses within 2 seconds of it are ignored.
   */
  lastTouchTime: number;
  /**
   * `clientX` of the last `touchstart`.
   */
  lastTouchX: number;
  /**
   * `clientY` of the last `touchstart`.
   */
  lastTouchY: number;
  /**
   * Time of the last `wheel` event; `0` before the first.
   */
  lastWheelEvent: number;
  /**
   * The mouse selection in progress, or `null` when there's none.
   */
  mouseSelection: EditorMouseSelection | null;
  /**
   * Whether the editor had focus when focus was last reported to extensions, through a view update.
   */
  notifiedFocused: boolean;
  /**
   * iOS only: a key whose default behaviour runs first, to keep the on-screen keyboard right,
   * and is handled once the DOM change it causes is read. `undefined` when there's none.
   */
  pendingIOSKey: EditorPendingKey | undefined;
  /**
   * Set to an empty list and not used anywhere else in CodeMirror 6.43.13.
   */
  scrollHandlers: unknown[];
  /**
   * Tab focus mode. `-1`: off, so Tab reaches the key handlers. `0`: on, so Tab moves focus as in the browser.
   * Above `0`: on until that time. Esc turns it on for 2 seconds.
   */
  tabFocusMode: number;
  /**
   * Whether a finger is on the editor: set by `touchstart`, cleared by `touchend`.
   */
  touchActive: boolean;
  /**
   * The editor.
   */
  view: EditorView;
  /**
   * Ends the mouse selection in progress, if any.
   */
  destroy(): void;
  /**
   * Adds the DOM event listeners the handlers need to the editor's content element, and removes ones no longer needed.
   * Listeners for events with only observers are passive.
   *
   * @param plugins - The editor's view plugin instances.
   */
  ensureHandlers(plugins: readonly unknown[]): void;
  /**
   * iOS only: handles `pendingIOSKey` now.
   *
   * @param change - The DOM change that came with the key, if any.
   * @returns Whether the key was handled. `false` if there's no pending key, DOM changes are still waiting to be read,
   *   or the change looks like an autocorrection before Enter.
   */
  flushIOSKey(change?: { from: number; to: number; insert: EditorText }): boolean;
  /**
   * Passes a DOM event to {@link EditorInputState.runHandlers}, unless it doesn't belong to the editor
   * or is ignored during a composition. Bound to the instance in the constructor, so it can be passed
   * to `addEventListener()`.
   *
   * @param event - The DOM event.
   */
  handleEvent(event: Event): void;
  /**
   * Returns whether a key event is part of a composition, and so isn't handled.
   *
   * @param event - The DOM event.
   * @returns `true` if the event is ignored.
   */
  ignoreDuringComposition(event: Event): boolean;
  /**
   * Handles what must happen on every `keydown`: records it, applies tab focus mode, and delays keys
   * that Android and iOS handle after their DOM change.
   *
   * @param event - The `keydown` event.
   * @returns `true` if the key handlers shouldn't run for it.
   */
  keydown(event: KeyboardEvent): boolean;
  /**
   * Runs the observers, then the handlers, for an event type. Stops at the first handler that returns `true`,
   * and calls `preventDefault()` for it.
   *
   * @param type - The event type.
   * @param event - The DOM event.
   */
  runHandlers(type: string, event: Event): void;
  /**
   * Sets `lastSelectionOrigin` and `lastSelectionTime`.
   *
   * @param origin - User event type, such as `select.pointer`.
   */
  setSelectionOrigin(origin: string): void;
  /**
   * Sets the mouse selection in progress, ending the previous one.
   *
   * @param mouseSelection - The new mouse selection.
   */
  startMouseSelection(mouseSelection: EditorMouseSelection): void;
  /**
   * Passes a view update to the DOM observer and the mouse selection, maps `draggedContent` through document changes,
   * and resets `lastKeyCode` and `lastSelectionTime` after a transaction.
   *
   * @param update - The view update.
   */
  update(update: ViewUpdate): void;
}

/**
 * DOM event handlers and observers for one event type, in {@link EditorInputState.handlers}.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface EditorEventHandlers {
  /**
   * Called in order until one returns `true`. Handlers from view plugins are wrapped to catch and log their errors.
   */
  handlers: ((view: EditorView, event: Event) => boolean | void)[];
  /**
   * Called for every event, before the handlers.
   */
  observers: ((view: EditorView, event: Event) => void)[];
}

/**
 * iOS only: a key whose handling waits for the DOM change it causes, in {@link EditorInputState.pendingIOSKey}.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface EditorPendingKey {
  /**
   * The key's `key`, such as `Enter`.
   */
  key: string;
  /**
   * The key's `keyCode`.
   */
  keyCode: number;
  /**
   * Modifier keys held. Shift is dropped while the on-screen keyboard capitalises automatically.
   */
  mods: {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  };
}

/**
 * A mouse selection in progress: from a left-button `mousedown` in the editor until `mouseup`.
 * In {@link EditorInputState.mouseSelection}.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface EditorMouseSelection {
  /**
   * The editor's atomic ranges when the selection started. The selection skips over them.
   */
  atoms: RangeSet<RangeValue>[];
  /**
   * `false` for a selection drag. `null` while a press inside the selection may still become a drag
   * of the selected text, and `true` once it has.
   */
  dragging: boolean | null;
  /**
   * Whether Shift was held at the start, so the selection extends the existing one.
   */
  extend: boolean;
  /**
   * The last `mousemove` the selection was updated from, or the starting `mousedown`.
   */
  lastEvent: MouseEvent;
  /**
   * Whether the selection adds a range instead of replacing the selection. By default: Ctrl held, or Cmd on macOS.
   */
  multiple: boolean;
  /**
   * Whether the next {@link EditorMouseSelection.select} dispatches the selection even if it's unchanged.
   * Set when the editor didn't have focus at the start.
   */
  mustSelect: boolean;
  /**
   * The elements scrolled when the pointer is dragged past their edges.
   */
  scrollParents: EditorScrollParents;
  /**
   * The current drag-scroll speed, in px per step. A step runs every 50 ms.
   */
  scrollSpeed: { x: number; y: number };
  /**
   * The interval that runs the drag-scroll steps, or `-1` while not scrolling.
   */
  scrolling: number;
  /**
   * The `mousedown` that started the selection.
   */
  startEvent: MouseEvent;
  /**
   * How the selection is computed from the pointer: from `EditorView.mouseSelectionStyle`, or CodeMirror's basic style.
   */
  style: MouseSelectionStyle;
  /**
   * The editor.
   */
  view: EditorView;
  /**
   * Stops drag-scrolling, removes the document listeners, and clears the input state's
   * `mouseSelection` and `draggedContent`.
   */
  destroy(): void;
  /**
   * Handles `mousemove` on the document: updates the selection, then sets the drag-scroll speed
   * from how far the pointer is past the scroll parents' edges. Bound to the instance in the constructor.
   *
   * @param event - The `mousemove` event.
   */
  move(event: MouseEvent): void;
  /**
   * Runs one drag-scroll step: scrolls each scroll parent by the speed, or the window when there's
   * no parent for that direction, then updates the selection.
   */
  scroll(): void;
  /**
   * Dispatches the selection for the pointer position, if it changed or `mustSelect` is set.
   *
   * @param event - The mouse event to take the pointer position from.
   */
  select(event: MouseEvent): void;
  /**
   * Sets the drag-scroll speed, starting or stopping the interval.
   *
   * @param sx - Horizontal speed, in px per step.
   * @param sy - Vertical speed, in px per step.
   */
  setScrollSpeed(sx: number, sy: number): void;
  /**
   * Applies the starting `mousedown`, unless the press may become a drag of the selected text.
   *
   * @param event - The `mousedown` event.
   */
  start(event: MouseEvent): void;
  /**
   * Handles `mouseup` on the document: applies the last position if needed, then ends the mouse selection.
   * Bound to the instance in the constructor.
   *
   * @param event - The `mouseup` event.
   */
  up(event: MouseEvent): void;
  /**
   * Ends the selection when the user types; otherwise lets the style map its positions through document changes.
   *
   * @param update - The view update.
   */
  update(update: ViewUpdate): void;
}

/**
 * The elements a mouse selection scrolls, in {@link EditorMouseSelection.scrollParents}.
 *
 * @remarks
 * Each is the first parent of the editor's content that is larger inside than its own box in that direction.
 * CodeMirror doesn't check `overflow`, so the element may not be able to scroll.
 *
 * @unofficial
 * @BaseSourceEditor
 */
export interface EditorScrollParents {
  /**
   * The first parent whose `scrollWidth` is larger than its `clientWidth`, or `null` if there's none.
   */
  x: HTMLElement | null;
  /**
   * The first parent whose `scrollHeight` is larger than its `clientHeight`, or `null` if there's none.
   */
  y: HTMLElement | null;
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
