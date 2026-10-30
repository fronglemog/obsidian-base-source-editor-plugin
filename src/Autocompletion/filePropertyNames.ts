/* ========================= IMPORTS ========================= */
/* PLUGIN */
import { logError } from 'src/Util/logError';

/* ========================= FILE PROPERTY NAMES ========================= */

const FALLBACK_MESSAGE: string = 'file properties are shown with their British English names.';

/** Keys of Obsidian's translations of the file properties' names. */
const NAME_KEYS: Readonly<Record<string, string>> = {
  'file.file': 'plugins.bases.label-file-prop-file',
  'file.name': 'plugins.bases.label-file-prop-name',
  'file.basename': 'plugins.bases.label-file-prop-base-name',
  'file.fullname': 'plugins.bases.label-file-prop-full-name',
  'file.path': 'plugins.bases.label-file-prop-path',
  'file.folder': 'plugins.bases.label-file-prop-folder',
  'file.ext': 'plugins.bases.label-file-prop-ext',
  'file.ctime': 'plugins.bases.label-file-prop-ctime',
  'file.mtime': 'plugins.bases.label-file-prop-mtime',
  'file.size': 'plugins.bases.label-file-prop-size',
  'file.links': 'plugins.bases.label-file-prop-links',
  'file.backlinks': 'plugins.bases.label-file-prop-backlinks',
  'file.embeds': 'plugins.bases.label-file-prop-embeds',
  'file.tags': 'plugins.bases.label-file-prop-tags'
};

/** Obsidian's British English names for the file properties, used where Obsidian's own can't be read. */
const BRITISH_ENGLISH_NAMES: Readonly<Record<string, string>> = {
  'file.file': 'file',
  'file.name': 'name',
  'file.basename': 'file base name',
  'file.fullname': 'file full name',
  'file.path': 'path',
  'file.folder': 'folder',
  'file.ext': 'extension',
  'file.ctime': 'created time',
  'file.mtime': 'modified time',
  'file.size': 'file size',
  'file.links': 'file links',
  'file.backlinks': 'file backlinks',
  'file.embeds': 'file embeds',
  'file.tags': 'file tags'
};

/** Failures already logged since the plugin loaded, so each is logged once, not on every key press. */
const loggedFailures: Set<string> = new Set();

/**
 * Gets the names Obsidian shows for the file properties where a Base sets no display name, in Obsidian's language,
 * such as "created time" for `file.ctime`.
 *
 * @remarks
 * Reads Obsidian's translations, which it keeps in the undocumented `i18next` global. If that fails,
 * the reason is logged once, and the British English names are used instead; so is a name Obsidian has no translation for.
 *
 * @returns The names, by full property id.
 */
export function getFilePropertyNames(): Record<string, string> {
  // Accessing undocumented API... keep this guard.
  try {
    const translations: unknown = Reflect.get(window, 'i18next');
    if (isTranslations(translations) === false) {
      logFailureOnce('Obsidian\'s translations weren\'t found.');
      return { ...BRITISH_ENGLISH_NAMES };
    }

    const names: Record<string, string> = {};
    for (const [propertyId, key] of Object.entries(NAME_KEYS)) {
      if (translations.exists(key) === true) {
        names[propertyId] = translations.t(key);
      }
      else {
        logFailureOnce(`Obsidian has no translation for ${key}.`);
        names[propertyId] = BRITISH_ENGLISH_NAMES[propertyId] ?? propertyId;
      }
    }
    return names;
  } catch (error: unknown) {
    logFailureOnce('Couldn\'t read Obsidian\'s translations.', error);
    return { ...BRITISH_ENGLISH_NAMES };
  }
}

/**
 * Returns whether a value can look up translations as Obsidian's `i18next` does.
 *
 * @param value - The value.
 * @returns `true` if it has `exists()` and `t()`.
 */
function isTranslations(value: unknown): value is Translations {
  return typeof (value as Partial<Translations> | null)?.exists === 'function' && typeof (value as Partial<Translations> | null)?.t === 'function';
}

/**
 * Logs a failure, unless the same failure was logged since the plugin loaded.
 *
 * @param failure - What failed.
 * @param error - The error, if there was one.
 */
function logFailureOnce(failure: string, error?: unknown): void {
  if (loggedFailures.has(failure) === true) {
    return;
  }
  loggedFailures.add(failure);

  logError(`${FALLBACK_MESSAGE} ${failure}`, error);
}

/* ========================= TYPES ========================= */

/**
 * The parts of Obsidian's `i18next` global the plugin uses: a library's translation lookup, not Obsidian's own class.
 */
type Translations = {
  /** Returns whether there's a translation for a key, in Obsidian's language or its fallback. */
  exists: (key: string) => boolean;
  /** Returns the translation for a key, or the key itself if there's none. */
  t: (key: string) => string;
};
