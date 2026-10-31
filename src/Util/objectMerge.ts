/* ========================= objectMerge ========================= */

/**
 * Deep version of `Object.assign()`.
 * Copies all of the enumerable own properties from one or more source objects onto a target object, and returns the target object.
 *
 * @param target - The target object to copy properties into.
 * @param source - The source object from which to deeply copy properties.
 */
export function objectMerge<T extends object, U>(target: T, source: U): T & IntersectSources<[U]>;
/**
 * Deep version of `Object.assign()`.
 * Copies all of the enumerable own properties from one or more source objects onto a target object, and returns the target object.
 *
 * @param target - The target object to copy properties into.
 * @param source1 - The first source object from which to deeply copy properties.
 * @param source2 - The second source object from which to deeply copy properties.
 */
export function objectMerge<T extends object, U, V>(target: T, source1: U, source2: V): T & IntersectSources<[U, V]>;
/**
 * Deep version of `Object.assign()`.
 * Copies all of the enumerable own properties from one or more source objects onto a target object, and returns the target object.
 *
 * @param target - The target object to copy properties into.
 * @param source1 - The first source object from which to deeply copy properties.
 * @param source2 - The second source object from which to deeply copy properties.
 * @param source3 - The third source object from which to deeply copy properties.
 */
export function objectMerge<T extends object, U, V, W>(target: T, source1: U, source2: V, source3: W): T & IntersectSources<[U, V, W]>;
/**
 * Deep version of `Object.assign()`.
 * Copies all of the enumerable own properties from one or more source objects onto a target object, and returns the target object.
 *
 * @param target - The target object to copy properties into.
 * @param sources - One or more source objects from which to deeply copy properties.
 */
export function objectMerge<T extends object, S extends unknown[]>(target: T, ...sources: S): T & IntersectSources<S>;
export function objectMerge(target: object, ...sources: unknown[]): object {
  for (const source of sources) {
    if (typeof source !== 'object' || source === null) {
      continue;
    }

    mergeSource(target as Record<PropertyKey, unknown>, source as Record<PropertyKey, unknown>, new Map(), new Map());
  }

  return target;
}

/* ========================= HELPERS ========================= */

/**
 * Deeply copies one source object onto a target object.
 *
 * @remarks
 * Keeps circular and shared references, like `structuredClone()`. A reference back to an object still
 * being merged points at that object's target, and an object that appears twice gets the same copy.
 *
 * @param targetObject - Object to copy into.
 * @param sourceObject - Object to copy from.
 * @param merging - Source objects still being merged, mapped to the objects they're merged into.
 * @param copies - Source objects already copied into new objects, mapped to their copies.
 */
function mergeSource(targetObject: Record<PropertyKey, unknown>, sourceObject: Record<PropertyKey, unknown>, merging: Map<object, object>, copies: Map<object, object>): void {
  merging.set(sourceObject, targetObject);

  for (const key of Reflect.ownKeys(sourceObject)) {
    if (key === '__proto__' || !Object.prototype.propertyIsEnumerable.call(sourceObject, key)) {
      continue;
    }

    const sourceValue: unknown = sourceObject[key];

    if (!isPlainObject(sourceValue)) {
      targetObject[key] = sourceValue;
      continue;
    }

    const loopTarget = merging.get(sourceValue);
    if (loopTarget !== undefined) {
      targetObject[key] = loopTarget;
      continue;
    }

    // Merge into the target's own plain object if it has one
    const targetValue: unknown = Object.hasOwn(targetObject, key) ? targetObject[key] : undefined;
    if (isPlainObject(targetValue)) {
      mergeSource(targetValue, sourceValue, merging, copies);
      targetObject[key] = targetValue;
      continue;
    }

    // Otherwise copy into a new object, so the source's object is never shared, reusing the copy if this object was already copied
    const existingCopy = copies.get(sourceValue);
    if (existingCopy !== undefined) {
      targetObject[key] = existingCopy;
      continue;
    }

    const copy = {};
    copies.set(sourceValue, copy);
    mergeSource(copy, sourceValue, merging, copies);
    targetObject[key] = copy;
  }

  merging.delete(sourceObject);
}

/**
 * Returns whether a value is a plain object: an object literal, or one created with `Object.create(null)`.
 *
 * @remarks
 * Checks that the prototype's prototype is `null`, instead of comparing the prototype with `Object.prototype`,
 * so objects from other windows count too.
 *
 * @param value - Value to check.
 * @returns `true` if `value` is a plain object.
 */
function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

/**
 * Intersects every type in a tuple, so `[A, B, C]` becomes `A & B & C`.
 * `null` and `undefined` are dropped, because {@link objectMerge} skips them.
 */
type IntersectSources<S extends readonly unknown[]> =
  S extends readonly [infer Head, ...infer Rest]
    ? ([NonNullable<Head>] extends [never] ? unknown : NonNullable<Head>) & IntersectSources<Rest>
    : unknown;
