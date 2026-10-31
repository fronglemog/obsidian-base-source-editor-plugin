/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import type {
  BasesPropertyId,
  IconName
} from 'obsidian';

/* CODEMIRROR */
import type { EditorState } from '@codemirror/state';

/* ========================= PROPERTY IDS ========================= */

/** Types a property id can start with, before a `.`. Any other property id is a note property's name. */
const PROPERTY_ID_TYPES: readonly string[] = ['note', 'formula', 'file'];

/** Property ids of the file itself: Obsidian writes `file.file` as `file`. */
const FILE_PROPERTY_IDS: readonly string[] = ['file', 'file.file'];

/** The file properties, in full, in the order Obsidian's property picker lists them. */
export const FILE_PROPERTIES: readonly BasesPropertyId[] = [
  'file.file',
  'file.name',
  'file.basename',
  'file.fullname',
  'file.path',
  'file.folder',
  'file.ext',
  'file.ctime',
  'file.mtime',
  'file.size',
  'file.links',
  'file.backlinks',
  'file.embeds',
  'file.tags'
];

/** File properties Obsidian's sort editor doesn't offer. */
const UNSORTABLE_PROPERTIES: readonly string[] = ['file.file', 'file.backlinks'];

/** File properties Obsidian's group-by editor doesn't offer. It doesn't offer note properties of the aliases type either. */
const UNGROUPABLE_PROPERTIES: readonly string[] = ['file.file', 'file.path', 'file.ctime', 'file.mtime', 'file.name', 'file.fullname', 'file.basename'];

/** The icon Obsidian's property picker shows for a formula. */
const FORMULA_ICON: IconName = 'lucide-square-function';

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

/**
 * Writes a property id in full, as Obsidian looks properties up: its type, a `.`, then its name.
 *
 * @remarks
 * Reads the property id as Obsidian does: `note.`, `formula.` or `file.` at the start names the property's type,
 * `file` is the file itself, and anything else is a note property's name.
 * Obsidian writes the full form under the Base's `properties`, in a view's `columnSize`, and in view options
 * that name a property, such as `image`.
 *
 * @param propertyId - The property id, such as `price`, `file` or `formula.Film`.
 * @returns The full property id, such as `note.price`, `file.file` or `formula.Film`.
 */
export function toFullPropertyId(propertyId: string): string {
  if (PROPERTY_ID_TYPES.some((type: string): boolean => propertyId.startsWith(`${type}.`)) === true) {
    return propertyId;
  }
  return propertyId === 'file' ? 'file.file' : `note.${propertyId}`;
}

/**
 * Writes a property id in the short form Obsidian writes in a view's `order`, `sort`, `groupBy` and `summaries`.
 *
 * @remarks
 * A note property loses its `note.`, unless its name would then read as another type, or as the file itself:
 * `note.file.size` stays as it is. The file itself is written `file`. Other property ids are written in full.
 *
 * @param propertyId - The property id, such as `note.price` or `file.file`.
 * @returns The short property id, such as `price`, `file` or `formula.Film`.
 */
export function toShortPropertyId(propertyId: string): string {
  const fullId: string = toFullPropertyId(propertyId);
  if (fullId === 'file.file') {
    return 'file';
  }
  if (fullId.startsWith('note.') === false) {
    return fullId;
  }

  const name: string = getPropertyName(fullId);
  const firstNamePart: string = name.split('.', 1)[0] ?? '';
  return name === '' || PROPERTY_ID_TYPES.includes(firstNamePart) === true ? fullId : name;
}

/**
 * Gets a property's name: its property id without its type.
 *
 * @param propertyId - The property id, such as `note.price`, `price` or `file.ctime`.
 * @returns The name, such as `price` or `ctime`.
 */
export function getPropertyName(propertyId: string): string {
  const fullId: string = toFullPropertyId(propertyId);
  return fullId.slice(fullId.indexOf('.') + 1);
}

/**
 * Gets the name Obsidian shows for a property, where it differs from the property's own name.
 *
 * @remarks
 * Obsidian shows the display name set under the Base's `properties`, or else its own name for a file property,
 * such as "created time" for `file.ctime`.
 *
 * @param propertyId - The property id.
 * @param displayNames - The names Obsidian shows, by full property id: its own for the file properties,
 * replaced by those set under the Base's `properties`.
 * @returns The display name, or `null` if Obsidian shows the property's own name.
 */
export function getShownDisplayName(propertyId: string, displayNames: Readonly<Record<string, string>>): string | null {
  const fullId: string = toFullPropertyId(propertyId);
  const displayName: string | undefined = displayNames[fullId];

  return displayName == null || displayName === getPropertyName(fullId) ? null : displayName;
}

/**
 * Gets the properties a Base can name, in the order Obsidian's property picker lists them:
 * the file properties, the Base's formulas, then the vault's note properties.
 *
 * @param noteProperties - The vault's note properties.
 * @param formulaNames - Names of the formulas under the Base's `formulas`.
 * @param readFilePropertyIcon - Reads the icon of a file property's value.
 * @returns The properties, with their full property ids.
 */
export function getPropertyCandidates(
  noteProperties: NoteProperty[],
  formulaNames: string[],
  readFilePropertyIcon: (propertyId: BasesPropertyId) => IconName | null
): PropertyCandidate[] {
  return [
    ...FILE_PROPERTIES.map((propertyId: BasesPropertyId): PropertyCandidate => ({ propertyId, icon: readFilePropertyIcon(propertyId), isAliases: false })),
    ...formulaNames.map((name: string): PropertyCandidate => ({ propertyId: `formula.${name}`, icon: FORMULA_ICON, isAliases: false })),
    ...noteProperties.map((property: NoteProperty): PropertyCandidate => ({ propertyId: `note.${property.name}`, icon: property.icon, isAliases: property.isAliases }))
  ];
}

/**
 * Returns whether Obsidian's sort editor offers a property.
 *
 * @param property - The property.
 * @returns `true` unless it's the file itself or its backlinks.
 */
export function isSortableProperty(property: PropertyCandidate): boolean {
  return UNSORTABLE_PROPERTIES.includes(property.propertyId) === false;
}

/**
 * Returns whether Obsidian's group-by editor offers a property.
 *
 * @param property - The property.
 * @returns `true` unless it's one of the file properties it leaves out, or a note property of the aliases type.
 */
export function isGroupableProperty(property: PropertyCandidate): boolean {
  return UNGROUPABLE_PROPERTIES.includes(property.propertyId) === false && property.isAliases === false;
}

/**
 * Returns whether Obsidian's "Properties" menu offers a property for a view's columns.
 *
 * @param property - The property.
 * @returns `true` unless it's the file itself.
 */
export function isOrderableProperty(property: PropertyCandidate): boolean {
  return property.propertyId !== 'file.file';
}

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

/**
 * Reads the icon of a property's value in a Base, as Obsidian's property picker shows it for a file property.
 *
 * @param state - Editor state of the Base.
 * @param propertyId - The property id, as written in the Base.
 * @returns The icon, or `null` if it can't be read.
 */
export type ReadPropertyIcon = (state: EditorState, propertyId: string) => IconName | null;

/**
 * A note property in the vault, as Obsidian's property picker lists it.
 */
export type NoteProperty = {
  /** The property's name, as written in notes. */
  name: string;
  /** The icon of the property's type. */
  icon: IconName;
  /** Whether the property's type is aliases. */
  isAliases: boolean;
};

/**
 * A property that can be suggested where a Base names a property.
 */
export type PropertyCandidate = {
  /** The property id, in full, such as `note.price`. */
  propertyId: BasesPropertyId;
  /** The icon Obsidian's property picker shows for it, or `null` if it can't be read. */
  icon: IconName | null;
  /** Whether it's a note property of the aliases type. */
  isAliases: boolean;
};
