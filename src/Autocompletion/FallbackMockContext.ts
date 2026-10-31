/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import {
  BooleanValue,
  DateValue,
  FileValue,
  ListValue,
  NullValue,
  NumberValue,
  ObjectValue,
  StringValue,
  TagValue
} from 'obsidian';

import type {
  App,
  Value
} from 'obsidian';

/* PLUGIN */
import type {
  BasesFormula,
  BasesIdentifierContext,
  DateValueConstructor,
  FileValueConstructor,
  ObjectValueConstructor,
  PropertyInfo
} from 'src/obsidian-types';

/* ========================= FallbackMockContext ========================= */

/** 
 * Identifiers a formula can always use, besides the vault's properties.
 */
const BUILT_IN_IDENTIFIERS: string[] = ['this', 'note', 'file', 'formula'];

const DateValueClass = DateValue as unknown as DateValueConstructor;
const FileValueClass = FileValue as unknown as FileValueConstructor;
const ObjectValueClass = ObjectValue as unknown as ObjectValueConstructor;

/**
 * A mock context built from Obsidian's public value classes, for when Obsidian's own mock context class can't be found.
 *
 * @remarks
 * The mock context cannot evaluate formulas, so it keeps only their names: `formula.` lists them without result types.
 * `tags` properties are lists of tags with the list icon: Obsidian's own class for them isn't exported.
 */
export class FallbackMockContext implements BasesIdentifierContext {
  private app: App;
  private formulaNames: string[];

  /**
   * Every vault property with an empty value of its type, by name: `null` until first needed.
   */
  private props: Record<string, Value> | null = null;

  constructor(app: App, formulas: Record<string, BasesFormula>) {
    this.app = app;
    this.formulaNames = Object.keys(formulas);
  }

  /**
   * Gets the identifiers a formula can use: every vault property, plus `this`, `note`, `file` and `formula`.
   */
  keys(): string[] {
    const keys: Set<string> = new Set(Object.keys(this.getProps()));

    for (const identifier of BUILT_IN_IDENTIFIERS) {
      keys.add(identifier);
    }
    return [...keys];
  }

  /**
   * Gets a value of the right type for an identifier.
   *
   * @param identifier - Identifier, such as `note` or a property name. Case is ignored.
   * @returns The value, or a null value if there's no such identifier.
   */
  getByIdentifier(identifier: string): Value {
    switch (identifier.toLowerCase()) {
      case 'this':
      case 'file': {
        return new FileValueClass(this.app, this.app.workspace.getActiveFile());
      }
      case 'note': {
        return new ObjectValueClass(this.getProps());
      }
      case 'formula': {
        return new ObjectValueClass(Object.fromEntries(
          this.formulaNames.map((name: string): [string, Value] => [name, NullValue.value])
        ));
      }
    }
    return getIgnoringCase(this.getProps(), identifier) ?? NullValue.value;
  }

  /**
   * Gets every vault property with an empty value of its type, by name, reading them the first time.
   */
  private getProps(): Record<string, Value> {
    if (this.props != null) {
      return this.props;
    }

    const properties: PropertyInfo[] = Object.values(this.app.metadataTypeManager.getAllProperties());

    this.props = Object.fromEntries(
      properties.map((property: PropertyInfo): [string, Value] => [property.name, createEmptyValue(property.widget)])
    );
    return this.props;
  }
}

/**
 * Creates an empty value of a property type, as Obsidian's own mock context does.
 *
 * @param widget - Property type, such as `text` or `tags`.
 * @returns The value, or a null value if the type is unknown.
 */
function createEmptyValue(widget: string): Value {
  switch (widget) {
    case 'file':
    case 'folder':
    case 'text': {
      return new StringValue('');
    }
    case 'number': {
      return new NumberValue(0);
    }
    case 'checkbox': {
      return new BooleanValue(true);
    }
    case 'date': {
      return new DateValueClass(new Date(), false);
    }
    case 'datetime': {
      return new DateValueClass(new Date(), true);
    }
    case 'tags': {
      return new ListValue([new TagValue('')]);
    }
    case 'aliases':
    case 'multitext': {
      return new ListValue(['']);
    }
  }
  return NullValue.value;
}

/**
 * Gets a value by name, matching the exact name first, then ignoring case, as Obsidian's own mock context does.
 *
 * @param values - Values by name.
 * @param name - Name to look up.
 * @returns The value, or `undefined` if there's none.
 */
function getIgnoringCase(values: Record<string, Value>, name: string): Value | undefined {
  if (Object.hasOwn(values, name)) {
    return values[name];
  }

  const lowerName: string = name.toLowerCase();
  const match: string | undefined = Object.keys(values).find((key: string): boolean => key.toLowerCase() === lowerName);

  return match == null ? undefined : values[match];
}
