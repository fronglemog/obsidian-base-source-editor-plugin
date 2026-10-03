/* ========================= SETTINGS ========================= */
export const PLUGIN_DEFAULT_SETTINGS: PluginSettings = {
  fontCustomSize: false,
  fontSize: 16,
  lineWrap: false,
  readableLineLength: false,
  indentationGuides: false,
  indentationGuideCustomStyle: false,
  indentationGuideColour: '#808080',
  indentationGuideOpacity: 25,
  renderWhitespace: false,
  whitespaceOpacity: 30,
}

export interface PluginSettings {
  fontCustomSize: boolean;
  fontSize: number;
  lineWrap: boolean;
  readableLineLength: boolean;
  indentationGuides: boolean;
  indentationGuideCustomStyle: boolean;
  indentationGuideColour: string;
  indentationGuideOpacity: number;
  renderWhitespace: boolean;
  whitespaceOpacity: number;
}


/**
 * Dot-notation paths of {@link PluginSettings} that correspond to settings of specific types.
 * Includes object-valued settings; arrays are treated as whole values, not indexed paths.
 */
export type PluginSettingPath<T = unknown> = ObjectKeyPath<PluginSettings, T>;

/**
 * Builds a union of dot-notation paths whose setting values are assignable to `T`.
 *
 * @typeParam O - The type being inspected at the current level of recursion.
 * @typeParam T - The allowed type at the end of a path. Use `unknown` to
 * include every type, including objects and arrays.
 *
 * @remarks
 * `O` is intentionally unconstrained: recursion also passes in property types such
 * as string and boolean. The conditional branches below decide how to handle them.
 *
 * This is a compile-time calculation: it produces string types, not runtime strings.
 * For each property, it considers both the property's own key and paths into its
 * children. A parent does not need to match `T` for its children to be searched.
 * Recursion stops at arrays and non-object types, such as strings and booleans.
 * Arrays can still match when their parent examines them.
 *
 * `never` means "no possible value". In a union, it contributes no alternatives:
 * `'name' | never` is just `'name'`. A template literal containing `never` also
 * becomes `never`, so a property with no child paths produces no dotted paths.
 *
 * The filter checks the property's entire declared type. For example, a property
 * typed `string | null` matches `T = string | null`, but not `T = string`.
 * Optional properties likewise include `undefined` when their own keys are checked.
 * Removing nullability for recursion does not change this matching rule.
 *
 * @example
 * ```ts
 * type Example = {
 *   editor: { theme: string; enabled: boolean };
 *   tags: string[];
 * };
 *
 * type AllPaths = ObjectKeyPath<Example, unknown>;
 * // 'editor' | 'editor.theme' | 'editor.enabled' | 'tags'
 *
 * type StringPaths = ObjectKeyPath<Example, string>;
 * // 'editor.theme'
 *
 * type ArrayPaths = ObjectKeyPath<Example, string[]>;
 * // 'tags' (no 'tags.0', 'tags.length', or array methods)
 * ```
 */
type ObjectKeyPath<O, T> = O extends readonly unknown[] ? never
    : O extends object ? {
          [K in keyof O & string]-?: 
            | (O[K] extends T ? K : never)
            | `${K}.${ObjectKeyPath<NonNullable<O[K]>, T>}`
        }[keyof O & string]
    : never;


/* ========================= HELPERS ========================= */

/* ===== SETTINGS CONFIG PARSING ===== */

/**
 * 
 * @param settings - 
 * @param path - 
 * @returns 
 */
export function getPluginSettingPath(settings: PluginSettings, path: string): unknown {
  const parts = getSettingPathParts(path);
  if (!parts) return undefined;

  let cursor: unknown = settings;
  for (const part of parts) {
    if (!isSettingsObject(cursor) || !Object.hasOwn(cursor, part)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

/**
 * 
 * @param settings - 
 * @param path - 
 * @param value 
 */
export function setPluginSettingPath(settings: PluginSettings, path: string, value: unknown): void {
  const parts = getSettingPathParts(path);
  const last = parts?.pop();
  if (!parts || last === undefined) {
    throw new Error(`Invalid settings path: '${path}'.`);
  }

  let cursor = settings as unknown as Record<string, unknown>;
  for (const part of parts) {
    let next = Object.hasOwn(cursor, part) ? cursor[part] : undefined;
    if (Array.isArray(next)) {
      throw new Error(`Cannot traverse an array in settings path: '${path}'.`);
    }
    if (!isSettingsObject(next)) {
      next = {};
      cursor[part] = next;
    }
    cursor = next as Record<string, unknown>;
  }
  cursor[last] = value;
}

function isSettingsObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getSettingPathParts(path: string): string[] | undefined {
  const parts = path.split('.');
  // Validate the entire path before a write can create any intermediate objects.
  if (parts.some((part) => part === '' || part === '__proto__' || part === 'constructor' || part === 'prototype')) {
    return undefined;
  }
  return parts;
}