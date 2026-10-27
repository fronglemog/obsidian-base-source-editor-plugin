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
 * Stand-in for Obsidian's `NullValue`: one shared instance, as in Obsidian, with its icon.
 */
export class NullValue {
  static readonly value: NullValue = new NullValue();
  icon: string = 'lucide-file-question';

  toString(): string {
    return 'null';
  }
}

/**
 * Stand-in for Obsidian's `ListValue`: keeps the items it's created with, and has its icon.
 */
export class ListValue {
  data: unknown[];
  icon: string = 'lucide-list';

  constructor(data: unknown[]) {
    this.data = data;
  }

  get(index: number): unknown {
    return this.data[index] ?? NullValue.value;
  }
}

/**
 * Stand-in for Obsidian's `NumberValue`: keeps the number it's created with, and has its icon.
 */
export class NumberValue {
  value: number;
  icon: string = 'lucide-binary';

  constructor(value: number) {
    this.value = value;
  }
}

/**
 * Stand-in for Obsidian's `DateValue`: keeps the date it's created with, and has its icon,
 * which depends on whether the date has a time.
 */
export class DateValue {
  date: Date;
  icon: string;

  constructor(date: Date, time: boolean = true) {
    this.date = date;
    this.icon = time ? 'lucide-clock' : 'lucide-calendar';
  }
}

/**
 * Stand-in for Obsidian's `BooleanValue`: keeps the boolean it's created with, and has its icon.
 */
export class BooleanValue {
  value: boolean;
  icon: string = 'lucide-check-square';

  constructor(value: boolean) {
    this.value = value;
  }
}
