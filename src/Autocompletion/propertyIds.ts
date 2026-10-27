/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type { EditorState } from '@codemirror/state';

/* ========================= PROPERTY IDS ========================= */

/** Types a property id can start with, before a `.`. Any other property id is a note property's name. */
const PROPERTY_ID_TYPES: readonly string[] = ['note', 'formula', 'file'];

/** Property ids of the file itself: Obsidian writes `file.file` as `file`. */
const FILE_PROPERTY_IDS: readonly string[] = ['file', 'file.file'];

/**
 * Turns a property id, as written in a Base, into a formula expression that reads the property.
 *
 * @remarks
 * Reads the property id as Obsidian does: `note.`, `formula.` or `file.` at the start names the property's type,
 * `file` is the file itself, and anything else is a note property's name. The name is always written in brackets,
 * because with a dot, a name like `film - year` would be read as a subtraction.
 *
 * @param propertyId - The property id, such as `price`, `note.price`, `formula.Film` or `file.ctime`.
 * @returns The expression, such as `note["price"]`, or `file` for the file itself.
 */
export function toPropertyExpression(propertyId: string): string {
  if (FILE_PROPERTY_IDS.includes(propertyId) === true) {
    return 'file';
  }

  const dotIndex: number = propertyId.indexOf('.');
  if (dotIndex !== -1) {
    const type: string = propertyId.slice(0, dotIndex);
    if (PROPERTY_ID_TYPES.includes(type) === true) {
      return `${type}[${JSON.stringify(propertyId.slice(dotIndex + 1))}]`;
    }
  }
  return `note[${JSON.stringify(propertyId)}]`;
}

/* ========================= TYPES ========================= */

/**
 * The type of a property's values, as far as summaries and sort directions depend on it.
 * `'other'` covers every other type, and a property whose type can't be read.
 */
export type PropertyType = 'number' | 'date' | 'checkbox' | 'other';

/**
 * Reads the type of a property in a Base.
 *
 * @param state - Editor state of the Base.
 * @param propertyId - The property id, as written in the Base.
 * @returns The property's type.
 */
export type ReadPropertyType = (state: EditorState, propertyId: string) => PropertyType;
