// Old: chunk.vendor.js module 2 (GNode.Properties).
/**
 * Named properties on a node.
 *
 * A property `foo` is an own field of the node named `$foo`; custom
 * properties (`custom` = true, set by the app, saved verbatim) are `@foo`.
 * A temporary change (`temporary` = true, used while dragging) keeps the
 * permanent value in `#$foo` and puts the temporary one in `$foo`;
 * `getProperty` returns the permanent one unless asked for the temporary
 * one, and the next permanent set or `resetTemporaryProperty` drops the
 * backup.
 *
 * Every change goes through `_notifyChange` (BeforePropertiesChange,
 * AfterPropertiesChange), which is where subclasses react and where the
 * property events come from, and is recorded by the workspace's
 * transaction recorder for undo.
 *
 * Defaults are plain objects per class (`Block.VisualProperties` and so
 * on): `_setDefaultProperties` copies them onto a new node, and
 * `storeProperties` writes only the values that differ from them, which
 * makes the default tables part of the file format.
 */
import { defineMixin, GObject, type AnyConstructor } from "../core/object.ts";
import { equals, extend } from "../core/util.ts";
import { Pattern } from "../style/pattern.ts";
import { NodeChange } from "./node-change.ts";
import type { Node } from "./node.ts";
import type { NodeBlob } from "../serialize/blob.ts";

/** A defaults table: property name → default value. */
export type PropertyDefaults = Readonly<Record<string, unknown>>;

/** Maps a value on its way into or out of a blob (transforms to arrays and back). */
export type PropertyFilter = (name: string, value: unknown) => unknown;

/** The payload of the BeforePropertiesChange and AfterPropertiesChange changes. */
export interface PropertiesChangeArgs {
  properties: string[];
  /** New values before the change, old values after it. */
  values: unknown[];
  custom: boolean | null | undefined;
  temporary: boolean | null | undefined;
  /** One of the names is in getTrackTempPropNames(): send the Before event even for temporary changes. */
  forceEvent?: boolean;
}

/** What GNode.Properties adds to a node. */
export interface PropertiesApi {
  arePropertiesEqual(other: PropertiesNode, names: readonly string[], custom?: boolean): boolean;
  hasProperty(name: string, custom?: boolean): boolean;
  getProperty(name: string, custom?: boolean, defaultValue?: unknown, temporary?: boolean): unknown;
  getProperties(
    names: readonly string[],
    custom?: boolean,
    defaultValues?: readonly unknown[] | null,
    temporary?: boolean,
  ): unknown[];
  resetTemporaryProperty(name: string, custom?: boolean): boolean;
  resetTemporaryProperties(names: readonly string[], custom?: boolean): boolean;
  setProperty(
    name: string,
    value: unknown,
    custom?: boolean | null,
    force?: boolean | null,
    temporary?: boolean | null,
  ): boolean;
  setProperties(
    names: readonly string[],
    values: readonly unknown[],
    custom?: boolean | null,
    force?: boolean | null,
    temporary?: boolean | null,
  ): boolean;
  getTrackTempPropNames(): string[] | null;
  storeProperties(
    blob: NodeBlob,
    defaults: PropertyDefaults,
    filter?: PropertyFilter | null | false,
  ): void;
  restoreProperties(
    blob: NodeBlob,
    defaults: PropertyDefaults,
    filter?: PropertyFilter | null | false,
  ): void;
  transferProperties(
    source: PropertiesNode,
    defaultsList: readonly PropertyDefaults[],
    temporary?: boolean,
  ): void;
  _setDefaultProperties(...defaultsList: PropertyDefaults[]): void;
}

export type PropertiesNode = Node & PropertiesApi;

const passThrough: PropertyFilter = (_name, value) => value;

function keyOf(name: string, custom: boolean | null | undefined): string {
  return (custom ? "@" : "$") + name;
}

export const Properties = defineMixin(
  "GNode.Properties",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class PropertiesMixin extends Base implements PropertiesApi {
      /** The node's own fields by name, for the `$`/`@`/`#` keys. */
      private get _fields(): Record<string, unknown> {
        return this as unknown as Record<string, unknown>;
      }

      arePropertiesEqual(
        other: PropertiesNode,
        names: readonly string[],
        custom?: boolean,
      ): boolean {
        for (let i = 0; i < names.length; ++i) {
          const name = names[i] as string;
          const mine = this.hasProperty(name, custom);
          const theirs = other.hasProperty(name, custom);
          if (mine) {
            if (!theirs) return false;
            if (!equals(this.getProperty(name, custom), other.getProperty(name, custom), true)) {
              return false;
            }
          } else if (theirs) return false;
        }
        return true;
      }

      hasProperty(name: string, custom?: boolean): boolean {
        return Object.hasOwn(this, keyOf(name, custom));
      }

      getProperty(
        name: string,
        custom?: boolean,
        defaultValue?: unknown,
        temporary?: boolean,
      ): unknown {
        const key = keyOf(name, custom);
        const backupKey = "#" + key;
        return !temporary && Object.hasOwn(this, backupKey)
          ? this._fields[backupKey]
          : Object.hasOwn(this, key)
            ? this._fields[key]
            : defaultValue;
      }

      getProperties(
        names: readonly string[],
        custom?: boolean,
        defaultValues?: readonly unknown[] | null,
        temporary?: boolean,
      ): unknown[] {
        const result: unknown[] = [];
        for (let i = 0; i < names.length; ++i) {
          const defaultValue = defaultValues && defaultValues.length > i ? defaultValues[i] : null;
          result.push(this.getProperty(names[i] as string, custom, defaultValue, temporary));
        }
        return result;
      }

      resetTemporaryProperty(name: string, custom?: boolean): boolean {
        return this.resetTemporaryProperties([name], custom);
      }

      resetTemporaryProperties(names: readonly string[], custom?: boolean): boolean {
        const fields = this._fields;
        const changed: string[] = [];
        const permanentValues: unknown[] = [];
        for (let i = 0; i < names.length; ++i) {
          const backupKey = "#" + keyOf(names[i] as string, custom);
          if (Object.hasOwn(this, backupKey)) {
            const current = fields[keyOf(names[i] as string, custom)];
            const backup = fields[backupKey];
            // A backup equal to the current value is kept (old behaviour).
            if (!equals(current, backup, false)) {
              changed.push(names[i] as string);
              permanentValues.push(backup);
            }
          }
        }
        if (changed.length === 0) return false;
        this._notifyChange(NodeChange.BeforePropertiesChange, {
          properties: changed,
          values: permanentValues,
          custom,
          temporary: true,
        } satisfies PropertiesChangeArgs);
        const temporaryValues: unknown[] = [];
        for (let i = 0; i < changed.length; ++i) {
          const key = keyOf(changed[i] as string, custom);
          temporaryValues.push(fields[key]);
          fields[key] = permanentValues[i];
          Reflect.deleteProperty(fields, "#" + key);
        }
        this._notifyChange(NodeChange.AfterPropertiesChange, {
          properties: changed,
          values: temporaryValues,
          custom,
          temporary: true,
        } satisfies PropertiesChangeArgs);
        return true;
      }

      setProperty(
        name: string,
        value: unknown,
        custom?: boolean | null,
        force?: boolean | null,
        temporary?: boolean | null,
      ): boolean {
        return this.setProperties([name], [value], custom, force, temporary);
      }

      setProperties(
        names: readonly string[],
        values: readonly unknown[],
        custom?: boolean | null,
        force?: boolean | null,
        temporary?: boolean | null,
      ): boolean {
        if (names.length !== values.length) {
          throw new Error("Properties length does not match values length");
        }
        const fields = this._fields;
        const changedNames: string[] = [];
        const newValues: unknown[] = [];
        const trackedNames = this.getTrackTempPropNames();
        let forceEvent = false;
        const oldValues: unknown[] = [];
        const prefix = custom ? "@" : "$";
        for (let i = 0; i < names.length; ++i) {
          const value = values[i];
          const name = names[i] as string;
          const key = prefix + name;
          const backupKey = "#" + key;
          if (!forceEvent && trackedNames && trackedNames.indexOf(name) !== -1) forceEvent = true;
          // A permanent set first puts the permanent value back.
          if (!temporary && Object.hasOwn(this, backupKey)) {
            fields[key] = fields[backupKey];
            Reflect.deleteProperty(fields, backupKey);
          }
          const old = fields[key];
          if (force || !equals(value, old, false)) {
            changedNames.push(name);
            newValues.push(value);
            oldValues.push(old);
            if (temporary && !Object.hasOwn(this, backupKey)) {
              fields[backupKey] = old;
            }
          }
        }
        if (changedNames.length === 0) return false;
        this._notifyChange(NodeChange.BeforePropertiesChange, {
          properties: changedNames,
          values: newValues,
          custom,
          temporary,
          forceEvent,
        } satisfies PropertiesChangeArgs);
        // Before handlers may add properties (GComment adds "read"); their
        // old values are read now.
        if (changedNames.length > oldValues.length) {
          for (let i = oldValues.length; i < changedNames.length; i++) {
            oldValues[i] = fields[prefix + changedNames[i]];
          }
        }
        for (let i = 0; i < changedNames.length; ++i) {
          fields[prefix + changedNames[i]] = newValues[i];
        }
        const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
        if (recorder) {
          recorder.afterSetProperties(this, changedNames, oldValues, newValues, temporary, custom);
        }
        this._notifyChange(NodeChange.AfterPropertiesChange, {
          properties: changedNames,
          values: oldValues,
          custom,
          temporary,
          forceEvent,
        } satisfies PropertiesChangeArgs);
        return true;
      }

      /** Names whose temporary changes still send the Before event. */
      getTrackTempPropNames(): string[] | null {
        return null;
      }

      storeProperties(
        blob: NodeBlob,
        defaults: PropertyDefaults,
        filter?: PropertyFilter | null | false,
      ): void {
        // Any falsy filter (null too, not only a missing one) passes the
        // values through, as the old `filter || function...` did.
        const apply = filter || passThrough;
        for (const name in defaults) {
          const defaultValue = defaults[name];
          const value = apply(name, this._fields["$" + name]);
          if (!equals(value, defaultValue, true)) blob[name] = value;
        }
      }

      restoreProperties(
        blob: NodeBlob,
        defaults: PropertyDefaults,
        filter?: PropertyFilter | null | false,
      ): void {
        // Any falsy filter (null too, not only a missing one) passes the
        // values through, as the old `filter || function...` did.
        const apply = filter || passThrough;
        const names: string[] = [];
        const values: unknown[] = [];
        for (const name in defaults) {
          names.push(name);
          if (Object.hasOwn(blob, name)) values.push(apply(name, blob[name]));
          else values.push(defaults[name]);
        }
        this.setProperties(names, values, false);
      }

      transferProperties(
        source: PropertiesNode,
        defaultsList: readonly PropertyDefaults[],
        temporary?: boolean,
      ): void {
        const names: string[] = [];
        const values: unknown[] = [];
        for (let i = 0; i < defaultsList.length; ++i) {
          const defaults = defaultsList[i] as PropertyDefaults;
          for (const name in defaults) {
            names.push(name);
            if (source.hasProperty(name)) {
              values.push(source.getProperty(name, false, null, temporary));
            } else values.push(defaults[name]);
          }
        }
        this.setProperties(names, values, false);
      }

      _setDefaultProperties(...defaultsList: PropertyDefaults[]): void {
        const fields = this._fields;
        for (let i = 0; i < defaultsList.length; ++i) {
          const defaults = defaultsList[i] as PropertyDefaults;
          for (const name in defaults) {
            let value = defaults[name];
            // Plain objects are copied deeply so nodes don't share them;
            // engine objects, patterns and arrays are shared as they are.
            if (
              value &&
              value instanceof Object &&
              !(value instanceof GObject) &&
              !(value instanceof Pattern) &&
              !(value instanceof Array)
            ) {
              value = extend(true, {}, value);
            }
            fields["$" + name] = value;
          }
        }
      }
    }
    return PropertiesMixin;
  },
);

/** Whether the node mixes in GNode.Properties. */
export function hasProperties(node: Node): node is PropertiesNode {
  return node.hasMixin(Properties);
}
