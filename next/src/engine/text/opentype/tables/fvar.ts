// Old: chunk.vendor.js module 994 (opentype.js tables/fvar.js, unchanged).
// The fvar table: the axes and named instances of a variable font.

import * as check from "../check.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";
import type { Field } from "../table.ts";
import type { NameTable } from "./name.ts";

/** A name's translations by language code. */
type Translations = Record<string, string>;

export interface FvarAxis {
  tag: string;
  minValue: number;
  defaultValue: number;
  maxValue: number;
  name: Translations;
}

export interface FvarInstance {
  name: Translations;
  /** Axis tag to value. */
  coordinates: Record<string, number>;
}

export interface FvarTable {
  axes: FvarAxis[];
  instances: FvarInstance[];
}

/** The name id (256 or more) of an equal name, adding the name when there is none. */
function addName(name: Translations, names: NameTable): number {
  const nameString = JSON.stringify(name);
  let nameID = 256;
  for (const nameKey in names) {
    const n = parseInt(nameKey);
    if (!n || n < 256) {
      continue;
    }
    if (JSON.stringify(names[nameKey]) === nameString) {
      return n;
    }
    if (nameID <= n) {
      nameID = n + 1;
    }
  }
  names[nameID] = name;
  return nameID;
}

function makeFvarAxis(n: number, axis: FvarAxis, names: NameTable): Field[] {
  const nameID = addName(axis.name, names);
  return [
    { name: "tag_" + n, type: "TAG", value: axis.tag },
    { name: "minValue_" + n, type: "FIXED", value: axis.minValue << 16 },
    { name: "defaultValue_" + n, type: "FIXED", value: axis.defaultValue << 16 },
    { name: "maxValue_" + n, type: "FIXED", value: axis.maxValue << 16 },
    { name: "flags_" + n, type: "USHORT", value: 0 },
    { name: "nameID_" + n, type: "USHORT", value: nameID },
  ];
}

function parseFvarAxis(data: DataView, start: number, names: NameTable): FvarAxis {
  const p = new Parser(data, start);
  const tag = p.parseTag();
  const minValue = p.parseFixed();
  const defaultValue = p.parseFixed();
  const maxValue = p.parseFixed();
  // Flags; none are defined.
  p.skip("uShort", 1);
  const name = names[p.parseUShort()] || {};
  return { tag, minValue, defaultValue, maxValue, name };
}

function makeFvarInstance(
  n: number,
  inst: FvarInstance,
  axes: FvarAxis[],
  names: NameTable,
): Field[] {
  const nameID = addName(inst.name, names);
  const fields: Field[] = [
    { name: "nameID_" + n, type: "USHORT", value: nameID },
    { name: "flags_" + n, type: "USHORT", value: 0 },
  ];
  for (let i = 0; i < axes.length; ++i) {
    const axisTag = (axes[i] as FvarAxis).tag;
    fields.push({
      name: "axis_" + n + " " + axisTag,
      type: "FIXED",
      value: (inst.coordinates[axisTag] as number) << 16,
    });
  }
  return fields;
}

function parseFvarInstance(
  data: DataView,
  start: number,
  axes: FvarAxis[],
  names: NameTable,
): FvarInstance {
  const p = new Parser(data, start);
  const name = names[p.parseUShort()] || {};
  // Flags; none are defined.
  p.skip("uShort", 1);
  const coordinates: Record<string, number> = {};
  for (let i = 0; i < axes.length; ++i) {
    coordinates[(axes[i] as FvarAxis).tag] = p.parseFixed();
  }
  return { name, coordinates };
}

/** Writes the table; axis and instance names are added to names. */
export function make(fvar: FvarTable, names: NameTable): Table {
  const result = new Table("fvar", [
    { name: "version", type: "ULONG", value: 0x10000 },
    { name: "offsetToData", type: "USHORT", value: 0 },
    { name: "countSizePairs", type: "USHORT", value: 2 },
    { name: "axisCount", type: "USHORT", value: fvar.axes.length },
    { name: "axisSize", type: "USHORT", value: 20 },
    { name: "instanceCount", type: "USHORT", value: fvar.instances.length },
    { name: "instanceSize", type: "USHORT", value: 4 + fvar.axes.length * 4 },
  ]);
  result.offsetToData = result.sizeOf();

  for (let i = 0; i < fvar.axes.length; i++) {
    result.fields = result.fields.concat(makeFvarAxis(i, fvar.axes[i] as FvarAxis, names));
  }
  for (let j = 0; j < fvar.instances.length; j++) {
    result.fields = result.fields.concat(
      makeFvarInstance(j, fvar.instances[j] as FvarInstance, fvar.axes, names),
    );
  }
  return result;
}

export function parse(data: DataView, start: number, names: NameTable): FvarTable {
  const p = new Parser(data, start);
  const tableVersion = p.parseULong();
  check.argument(tableVersion === 0x00010000, "Unsupported fvar table version.");
  const offsetToData = p.parseOffset16();
  // countSizePairs
  p.skip("uShort", 1);
  const axisCount = p.parseUShort();
  const axisSize = p.parseUShort();
  const instanceCount = p.parseUShort();
  const instanceSize = p.parseUShort();

  const axes: FvarAxis[] = [];
  for (let i = 0; i < axisCount; i++) {
    axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize, names));
  }

  const instances: FvarInstance[] = [];
  const instanceStart = start + offsetToData + axisCount * axisSize;
  for (let j = 0; j < instanceCount; j++) {
    instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes, names));
  }
  return { axes: axes, instances: instances };
}
