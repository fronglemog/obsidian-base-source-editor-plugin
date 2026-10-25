/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type { 
  Platform as _Platform
} from 'obsidian';

/* ================================================== */

/**
 * Stand-in for Obsidian's `Platform`, with the values of the desktop app on Windows.
 *
 * @remarks
 * Tests that depend on the platform pass their own object instead of reading this one.
 */
export const Platform: typeof _Platform = {
  isDesktop: true,
  isMobile: false,
  isDesktopApp: true,
  isMobileApp: false,
  isIosApp: false,
  isAndroidApp: false,
  isPhone: false,
  isTablet: false,
  isMacOS: false,
  isWin: true,
  isLinux: false,
  isSafari: false,
  resourcePathPrefix: ''
};

/**
 * Stand-in for Obsidian's `ListValue`: keeps the items it's created with.
 */
export class ListValue {
  data: unknown[];

  constructor(data: unknown[]) {
    this.data = data;
  }
}

/**
 * Stand-in for Obsidian's `NullValue`: one shared instance, as in Obsidian.
 */
export class NullValue {
  static readonly value: NullValue = new NullValue();

  toString(): string {
    return 'null';
  }
}
