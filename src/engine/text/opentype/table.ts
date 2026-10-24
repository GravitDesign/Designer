// Old: chunk.vendor.js module 115 (opentype.js table.js, unchanged).
// Table metadata for the font writer: a table is a list of typed fields,
// and each field's value is also kept as a property of the table object.

import * as check from "./check.ts";
import type { FeatureRecord, LangSysTable, ScriptRecord } from "./parse.ts";
import { encode, sizeOf } from "./types.ts";
import type { TypedValue } from "./types.ts";

export interface Field extends TypedValue {
  name: string;
}

/**
 * A table to write. Field values can be changed through the properties
 * named like the fields (or the options given to the constructor) before
 * encoding.
 */
export class Table {
  [field: string]: unknown;
  declare tableName: string;
  declare fields: Field[];

  constructor(tableName: string, fields: Field[], options?: Record<string, unknown>) {
    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i] as Field;
      this[field.name] = field.value;
    }

    this.tableName = tableName;
    this.fields = fields;
    if (options) {
      const optionKeys = Object.keys(options);
      for (let i = 0; i < optionKeys.length; i += 1) {
        const k = optionKeys[i] as string;
        const v = options[k];
        if (this[k] !== undefined) {
          this[k] = v;
        }
      }
    }
  }

  /** The table's bytes. */
  encode(): number[] {
    return encode.TABLE(this as unknown as Parameters<typeof encode.TABLE>[0]);
  }

  /** The table's size in bytes. */
  sizeOf(): number {
    return sizeOf.TABLE(this as unknown as Parameters<typeof sizeOf.TABLE>[0]);
  }
}

/** Records are encoded like tables. */
export { Table as Record };

/** A count field followed by one USHORT field per item. */
export function ushortList(itemName: string, list: number[], count?: number): Field[] {
  if (count === undefined) {
    count = list.length;
  }
  const fields = new Array<Field>(list.length + 1);
  fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
  for (let i = 0; i < list.length; i++) {
    fields[i + 1] = { name: itemName + i, type: "USHORT", value: list[i] };
  }
  return fields;
}

/** A count field followed by one subtable per record, made by itemCallback. */
export function tableList<T>(
  itemName: string,
  records: T[],
  itemCallback: (record: T, index: number) => Table,
): Field[] {
  const count = records.length;
  const fields = new Array<Field>(count + 1);
  fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
  for (let i = 0; i < count; i++) {
    fields[i + 1] = { name: itemName + i, type: "TABLE", value: itemCallback(records[i] as T, i) };
  }
  return fields;
}

/** A count field followed by the fields itemCallback gives for each record. */
export function recordList<T>(
  itemName: string,
  records: T[],
  itemCallback: (record: T, index: number) => Field[],
): Field[] {
  const count = records.length;
  let fields: Field[] = [];
  fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
  for (let i = 0; i < count; i++) {
    fields = fields.concat(itemCallback(records[i] as T, i));
  }
  return fields;
}

/** A coverage table. Only format 1 can be written. */
export class Coverage extends Table {
  constructor(coverageTable: { format: number; glyphs?: number[] }) {
    if (coverageTable.format !== 1) {
      check.assert(false, "Can't create coverage table format 2 yet.");
    }
    super(
      "coverageTable",
      [{ name: "coverageFormat", type: "USHORT", value: 1 } as Field].concat(
        ushortList("glyph", coverageTable.glyphs as number[]),
      ),
    );
  }
}

function langSysFields(langSys: LangSysTable): Field[] {
  return [
    { name: "lookupOrder", type: "USHORT", value: 0 } as Field,
    { name: "reqFeatureIndex", type: "USHORT", value: langSys.reqFeatureIndex },
  ].concat(ushortList("featureIndex", langSys.featureIndexes));
}

/** A script list. Every script needs a default language system. */
export class ScriptList extends Table {
  constructor(scriptListTable: ScriptRecord[]) {
    super(
      "scriptListTable",
      recordList("scriptRecord", scriptListTable, function (scriptRecord, i) {
        const script = scriptRecord.script as NonNullable<ScriptRecord["script"]>;
        const defaultLangSys = script.defaultLangSys;
        check.assert(
          !!defaultLangSys,
          "Unable to write GSUB: script " + scriptRecord.tag + " has no default language system.",
        );
        return [
          { name: "scriptTag" + i, type: "TAG", value: scriptRecord.tag },
          {
            name: "script" + i,
            type: "TABLE",
            value: new Table(
              "scriptTable",
              [
                {
                  name: "defaultLangSys",
                  type: "TABLE",
                  value: new Table("defaultLangSys", langSysFields(defaultLangSys)),
                } as Field,
              ].concat(
                recordList("langSys", script.langSysRecords, function (langSysRecord, i) {
                  const langSys = langSysRecord.langSys as LangSysTable;
                  return [
                    { name: "langSysTag" + i, type: "TAG", value: langSysRecord.tag },
                    {
                      name: "langSys" + i,
                      type: "TABLE",
                      value: new Table("langSys", langSysFields(langSys)),
                    },
                  ];
                }),
              ),
            ),
          },
        ];
      }),
    );
  }
}

/** A feature list. */
export class FeatureList extends Table {
  constructor(featureListTable: FeatureRecord[]) {
    super(
      "featureListTable",
      recordList("featureRecord", featureListTable, function (featureRecord, i) {
        const feature = featureRecord.feature as NonNullable<FeatureRecord["feature"]>;
        return [
          { name: "featureTag" + i, type: "TAG", value: featureRecord.tag },
          {
            name: "feature" + i,
            type: "TABLE",
            value: new Table(
              "featureTable",
              [
                { name: "featureParams", type: "USHORT", value: feature.featureParams } as Field,
              ].concat(ushortList("lookupListIndex", feature.lookupListIndexes)),
            ),
          },
        ];
      }),
    );
  }
}

/** A lookup with subtables, as LookupList writes it. */
export interface WritableLookup<Subtable> {
  lookupType: number;
  lookupFlag: number;
  subtables: Subtable[];
}

/** A lookup list; subtableMakers[lookupType] writes one subtable. */
export class LookupList<Subtable> extends Table {
  constructor(
    lookupListTable: WritableLookup<Subtable>[],
    subtableMakers: ReadonlyArray<((subtable: Subtable, index: number) => Table) | undefined>,
  ) {
    super(
      "lookupListTable",
      tableList("lookup", lookupListTable, function (lookupTable) {
        const subtableCallback = subtableMakers[lookupTable.lookupType];
        check.assert(
          !!subtableCallback,
          "Unable to write GSUB lookup type " + lookupTable.lookupType + " tables.",
        );
        return new Table(
          "lookupTable",
          [
            { name: "lookupType", type: "USHORT", value: lookupTable.lookupType } as Field,
            { name: "lookupFlag", type: "USHORT", value: lookupTable.lookupFlag },
          ].concat(tableList("subtable", lookupTable.subtables, subtableCallback)),
        );
      }),
    );
  }
}
