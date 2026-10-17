/* ========================= IMPORTS ========================= */
import {
  Component,
  Platform,
  debounce,
  setIcon
} from 'obsidian';

import type {
  App,
  Command,
  Debouncer,
  IconName,
  WorkspaceLeaf
} from 'obsidian';

import type BasesSourceEditorPlugin from 'src/main';
import {
  BaseSourceView,
  VIEW_TYPE_BASES_SOURCE
} from 'src/BaseSourceView';
import { getMobileToolbarCommands } from 'src/Mobile/toolbarCommands';

/* ========================= BaseSourceMobileToolbar ========================= */

const TOOLBAR_OPEN_CLASS = 'mod-toolbar-open';
const KEYBOARD_TOGGLE_COMMAND_ID = 'editor:toggle-keyboard';

// Timings Obsidian's own toolbar uses to slide with the keyboard
const IOS_KEYBOARD_ANIMATION: KeyframeAnimationOptions = {
  duration: 300,
  easing: 'cubic-bezier(.12, 0, .44, .99)'
};
const ANDROID_KEYBOARD_ANIMATION: KeyframeAnimationOptions = {
  duration: 350,
  easing: 'cubic-bezier(.22, .25, 0, 1)'
};

export class BaseSourceMobileToolbar extends Component {
  private plugin: BasesSourceEditorPlugin;

  private isVisible: boolean = false;
  private hasKeyboardVisible: boolean = false;
  private lastKeyboardHeight: number = 0;
  private lastCommandIds: string = '';

  private spacerEl: HTMLElement;
  private wrapperEl: HTMLElement;
  private optionsListEl: HTMLElement;

  private requestUpdate: Debouncer<[], void> = debounce(() => this.update(), 0, true);

  constructor(plugin: BasesSourceEditorPlugin) {
    super();
    this.plugin = plugin;

    this.spacerEl = createDiv();
    this.spacerEl.addClass('mobile-toolbar-spacer');

    this.wrapperEl = createDiv();
    this.wrapperEl.addClass('mobile-toolbar');

    const containerEl: HTMLElement = this.wrapperEl.createDiv('mobile-toolbar-options-container');
    const optionsListContainerEl: HTMLElement = containerEl.createDiv('mobile-toolbar-options-list-container mod-raised');
    this.optionsListEl = optionsListContainerEl.createDiv('mobile-toolbar-options-list');

    if (Platform.isIosApp && Platform.isMobile) {
      const floatingOptionsEl: HTMLElement = containerEl.createDiv('mobile-toolbar-floating-options mod-raised');
      this.createOption(floatingOptionsEl, KEYBOARD_TOGGLE_COMMAND_ID, 'keyboard-toggle');
    }
  }

  override onload(): void {
    this.registerDomEvent(window, 'focusin', () => this.requestUpdate());
    this.registerDomEvent(window, 'focusout', () => this.requestUpdate());

    this.registerDomEvent(window, 'keyboardWillShow', () => {
      this.animateToKeyboardHeight();
      this.hasKeyboardVisible = true;
      if (Platform.isAndroidApp) {
        this.requestUpdate();
      }
    });

    this.registerDomEvent(window, 'keyboardWillHide', (evt) => {
      this.animateToKeyboardHeight();
      // With a physical keyboard the user can still type, so the toolbar stays
      if (evt.hasPhysicalKeyboard === true) {
        return;
      }
      this.hasKeyboardVisible = false;
      if (Platform.isAndroidApp) {
        this.requestUpdate();
      }
    });

    if (Platform.isAndroidApp) {
      this.registerDomEvent(window, 'multiWindowModeChanged', () => this.requestUpdate());
    }
  }

  override onunload(): void {
    this.requestUpdate.cancel();
    if (this.isVisible) {
      this.hide();
    }
  }

  /**
   * Shows the toolbar while a Base Source editor has focus, and hides it otherwise.
   */
  private update(): void {
    const app: App = this.plugin.app;
    this.lastKeyboardHeight = getKeyboardHeight();

    let shouldShow: boolean = this.hasBaseSourceEditorFocus();
    if (Platform.isAndroidApp && shouldShow) {
      const isMultiWindowMode: boolean = app.mobileToolbar?.isMultiWindowMode ?? false;
      shouldShow = this.hasKeyboardVisible || isMultiWindowMode;
    }

    if (shouldShow && !this.isVisible) {
      this.show();
    }
    else if (!shouldShow && this.isVisible) {
      this.hide();
    }
  }

  /**
   * Checks every Base Source view, so it doesn't depend on Obsidian having made the focused one active yet.
   *
   * @returns True if the editor of any Base Source view has focus.
   */
  private hasBaseSourceEditorFocus(): boolean {
    const app: App = this.plugin.app;
    const leaves: WorkspaceLeaf[] = app.workspace.getLeavesOfType(VIEW_TYPE_BASES_SOURCE);

    const hasFocus: boolean = leaves.some((leaf: WorkspaceLeaf): boolean => {
      return leaf.view instanceof BaseSourceView && leaf.view.hasEditorFocus();
    });
    return hasFocus;
  }

  /**
   * Shows the toolbar in place of the navbar, like Obsidian's own toolbar.
   * An empty toolbar isn't shown, so the navbar stays.
   */
  private show(): void {
    const app: App = this.plugin.app;

    const commands: Command[] = getMobileToolbarCommands(app, this.plugin.settings.mobileToolbarCommands);
    if (commands.length === 0) {
      return;
    }

    this.isVisible = true;
    this.compileToolbar(commands);

    app.mobileNavbar?.hide();
    app.dom.appContainerEl.appendChild(this.spacerEl);
    app.dom.appContainerEl.appendChild(this.wrapperEl);
    document.body.addClass(TOOLBAR_OPEN_CLASS);
  }

  /**
   * Hides the toolbar and brings back the navbar, like Obsidian's own toolbar.
   */
  private hide(): void {
    const app: App = this.plugin.app;

    this.isVisible = false;
    this.spacerEl.detach();
    this.wrapperEl.detach();

    // Doesn't show while Obsidian's own toolbar is visible
    app.mobileNavbar?.show();

    // When focus moves to a markdown editor, Obsidian's own toolbar shows first. Leave its class in place.
    const isNativeToolbarVisible: boolean = app.mobileToolbar?.isVisible ?? false;
    if (!isNativeToolbarVisible) {
      document.body.removeClass(TOOLBAR_OPEN_CLASS);
    }
  }

  /**
   * Rebuilds the toolbar's buttons, only if its commands have changed since the last time.
   *
   * @param commands - Commands to show, in order.
   */
  private compileToolbar(commands: Command[]): void {
    const commandIds: string = JSON.stringify(commands.map((command: Command): string => command.id));
    if (commandIds === this.lastCommandIds) {
      return;
    }

    this.optionsListEl.empty();
    for (const command of commands) {
      this.createOption(this.optionsListEl, command.id, command.icon ?? 'question-mark-glyph');
    }
    this.lastCommandIds = commandIds;
  }

  /**
   * Adds a toolbar button that runs a command.
   *
   * @param parentEl - Element to add the button to.
   * @param commandId - ID of the command to run.
   * @param icon - Icon to show.
   */
  private createOption(parentEl: HTMLElement, commandId: string, icon: IconName): void {
    const app: App = this.plugin.app;

    const optionEl: HTMLElement = parentEl.createDiv('mobile-toolbar-option');
    setIcon(optionEl, icon);

    // Stops the tap from taking focus from the editor, which would close the keyboard and hide the toolbar
    optionEl.addEventListener('mousedown', (evt: MouseEvent) => evt.preventDefault());
    optionEl.addEventListener('click', (evt: MouseEvent) => {
      app.commands.executeCommandById(commandId, evt);
      evt.preventDefault();
    });
  }

  /**
   * Slides the toolbar to its new position when the keyboard opens or closes, like Obsidian's own toolbar.
   * The toolbar's CSS already places it above the new keyboard height, so it starts the animation
   * from where it was and slides into place.
   */
  private animateToKeyboardHeight(): void {
    if (!this.isVisible) {
      return;
    }

    const keyboardHeight: number = getKeyboardHeight();
    const offset: number = keyboardHeight - this.lastKeyboardHeight;
    this.lastKeyboardHeight = keyboardHeight;

    const animation: KeyframeAnimationOptions | null = getKeyboardAnimation();
    if (animation == null) {
      return;
    }

    this.wrapperEl.animate(
      [
        { transform: `translateY(${offset}px)` },
        { transform: 'none' }
      ],
      animation
    );
  }
}

/* ========================= HELPERS ========================= */

/**
 * @returns Height of the on-screen keyboard in pixels, which Obsidian keeps in `--keyboard-height`.
 */
function getKeyboardHeight(): number {
  const documentStyle: CSSStyleDeclaration = getComputedStyle(document.documentElement);
  const keyboardHeightValue: string = documentStyle.getPropertyValue('--keyboard-height');

  const keyboardHeight: number = Number.parseFloat(keyboardHeightValue) || 0;
  return keyboardHeight;
}

/**
 * @returns Timing for sliding with the keyboard, or null on platforms where Obsidian's own toolbar doesn't slide.
 */
function getKeyboardAnimation(): KeyframeAnimationOptions | null {
  if (Platform.isIosApp) {
    return IOS_KEYBOARD_ANIMATION;
  }
  if (Platform.isAndroidApp) {
    return ANDROID_KEYBOARD_ANIMATION;
  }
  return null;
}
