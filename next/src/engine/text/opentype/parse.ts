// Old: chunk.vendor.js module 89 (opentype.js parse.js).
// Gravit change: the fork has no Parser.prototype.parseList32 (and nothing
// calls Parser.list32), so both are left out here.

import * as check from "./check.ts";

/** Reads one value with `this` bound to a Parser; the Parser.* statics are of this type. */
export type ParseFn<T> = (this: Parser) => T;

/** Field name to field parser, read in key order. */
export type RecordDescription = Record<string, ParseFn<unknown>>;

export type ParsedRecord<D extends RecordDescription> = { [K in keyof D]: ReturnType<D[K]> };

export interface CoverageFormat1 {
  format: 1;
  glyphs: number[];
}

export interface CoverageRange {
  start: number;
  end: number;
  index: number;
}

export interface CoverageFormat2 {
  format: 2;
  ranges: CoverageRange[];
}

export type Coverage = CoverageFormat1 | CoverageFormat2;

export interface ClassDefFormat1 {
  format: 1;
  startGlyph: number;
  classes: number[];
}

export interface ClassRange {
  start: number;
  end: number;
  classId: number;
}

export interface ClassDefFormat2 {
  format: 2;
  ranges: ClassRange[];
}

export type ClassDef = ClassDefFormat1 | ClassDefFormat2;

export interface LangSysTable {
  reserved: number;
  reqFeatureIndex: number;
  featureIndexes: number[];
}

export interface LangSysRecord {
  tag: string;
  langSys: LangSysTable | undefined;
}

export interface ScriptTable {
  defaultLangSys: LangSysTable | undefined;
  langSysRecords: LangSysRecord[];
}

export interface ScriptRecord {
  tag: string;
  script: ScriptTable | undefined;
}

export interface FeatureTable {
  featureParams: number;
  lookupListIndexes: number[];
}

export interface FeatureRecord {
  tag: string;
  feature: FeatureTable | undefined;
}

export interface LookupTable<Subtable> {
  lookupType: number;
  lookupFlag: number;
  subtables: (Subtable | undefined)[];
  markFilteringSet: number | undefined;
}

export interface FeatureVariationRecord {
  conditionSetOffset: number;
  featureTableSubstitutionOffset: number;
}

/** A GPOS value record. Device table offsets are skipped. */
export interface ValueRecord {
  xPlacement?: number;
  yPlacement?: number;
  xAdvance?: number;
  yAdvance?: number;
  xPlaDevice?: undefined;
  yPlaDevice?: undefined;
  xAdvDevice?: undefined;
  yAdvDevice?: undefined;
}

/** Retrieves an unsigned byte. */
export function getByte(dataView: DataView, offset: number): number {
  return dataView.getUint8(offset);
}

export const getCard8 = getByte;

/** Retrieves an unsigned big endian 16-bit short. */
export function getUShort(dataView: DataView, offset: number): number {
  return dataView.getUint16(offset, false);
}

export const getCard16 = getUShort;

/** Retrieves a signed big endian 16-bit short. */
export function getShort(dataView: DataView, offset: number): number {
  return dataView.getInt16(offset, false);
}

/** Retrieves an unsigned big endian 32-bit long. */
export function getULong(dataView: DataView, offset: number): number {
  return dataView.getUint32(offset, false);
}

/** Retrieves a signed 16.16 fixed-point number. The fraction is divided by 65535, as in opentype.js. */
export function getFixed(dataView: DataView, offset: number): number {
  const decimal = dataView.getInt16(offset, false);
  const fraction = dataView.getUint16(offset + 2, false);
  return decimal + fraction / 65535;
}

/** Retrieves a 4-character tag such as a table name. */
export function getTag(dataView: DataView, offset: number): string {
  let tag = "";
  for (let i = offset; i < offset + 4; i += 1) {
    tag += String.fromCharCode(dataView.getInt8(i));
  }
  return tag;
}

/** Retrieves an offset of offSize (1 to 4) bytes. */
export function getOffset(dataView: DataView, offset: number, offSize: number): number {
  let v = 0;
  for (let i = 0; i < offSize; i += 1) {
    v <<= 8;
    v += dataView.getUint8(offset + i);
  }
  return v;
}

/** Retrieves the bytes from startOffset up to (not including) endOffset. */
export function getBytes(dataView: DataView, startOffset: number, endOffset: number): number[] {
  const bytes: number[] = [];
  for (let i = startOffset; i < endOffset; i += 1) {
    bytes.push(dataView.getUint8(i));
  }
  return bytes;
}

/** Converts a list of bytes to a string, one char per byte. */
export function bytesToString(bytes: ArrayLike<number>): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) {
    s += String.fromCharCode(bytes[i] as number);
  }
  return s;
}

const typeOffsets = {
  byte: 1,
  uShort: 2,
  short: 2,
  uLong: 4,
  fixed: 4,
  longDateTime: 8,
  tag: 4,
};

export type SkipType = keyof typeof typeOffsets;

/**
 * A stateful big endian reader over a DataView. Every parse* call reads at
 * offset + relativeOffset and advances relativeOffset.
 */
export class Parser {
  data: DataView;
  offset: number;
  relativeOffset: number;

  constructor(data: DataView, offset: number) {
    this.data = data;
    this.offset = offset;
    this.relativeOffset = 0;
  }

  parseByte(): number {
    const v = this.data.getUint8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
  }

  parseChar(): number {
    const v = this.data.getInt8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
  }

  parseCard8(): number {
    return this.parseByte();
  }

  parseUShort(): number {
    const v = this.data.getUint16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
  }

  parseCard16(): number {
    return this.parseUShort();
  }

  parseSID(): number {
    return this.parseUShort();
  }

  parseOffset16(): number {
    return this.parseUShort();
  }

  parseShort(): number {
    const v = this.data.getInt16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
  }

  parseF2Dot14(): number {
    const v = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
    this.relativeOffset += 2;
    return v;
  }

  parseULong(): number {
    const v = getULong(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
  }

  parseOffset32(): number {
    return this.parseULong();
  }

  parseFixed(): number {
    const v = getFixed(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
  }

  parseString(length: number): string {
    const dataView = this.data;
    const offset = this.offset + this.relativeOffset;
    let string = "";
    this.relativeOffset += length;
    for (let i = 0; i < length; i++) {
      string += String.fromCharCode(dataView.getUint8(offset + i));
    }
    return string;
  }

  parseTag(): string {
    return this.parseString(4);
  }

  /**
   * LONGDATETIME is 64 bits; only the low 32 bits are read and turned from
   * seconds since 1904 into seconds since 1970.
   */
  parseLongDateTime(): number {
    let v = getULong(this.data, this.offset + this.relativeOffset + 4);
    v -= 2082844800;
    this.relativeOffset += 8;
    return v;
  }

  /**
   * major + minor / minorBase / 10. The default minorBase 0x1000 reads
   * 0xN000 as N; tables that store N directly pass 1.
   */
  parseVersion(minorBase?: number): number {
    const major = getUShort(this.data, this.offset + this.relativeOffset);
    const minor = getUShort(this.data, this.offset + this.relativeOffset + 2);
    this.relativeOffset += 4;
    if (minorBase === undefined) minorBase = 0x1000;
    return major + minor / minorBase / 10;
  }

  skip(type: SkipType, amount?: number): void {
    if (amount === undefined) {
      amount = 1;
    }
    this.relativeOffset += typeOffsets[type] * amount;
  }

  /** A list of 32-bit unsigned integers; the count is read first when not given. */
  parseULongList(count?: number): number[] {
    if (count === undefined) {
      count = this.parseULong();
    }
    const offsets = new Array<number>(count);
    const dataView = this.data;
    let offset = this.offset + this.relativeOffset;
    for (let i = 0; i < count; i++) {
      offsets[i] = dataView.getUint32(offset);
      offset += 4;
    }
    this.relativeOffset += count * 4;
    return offsets;
  }

  /** A list of 16-bit unsigned integers; the count is read first when not given. */
  parseUShortList(count?: number): number[] {
    if (count === undefined) {
      count = this.parseUShort();
    }
    const offsets = new Array<number>(count);
    const dataView = this.data;
    let offset = this.offset + this.relativeOffset;
    for (let i = 0; i < count; i++) {
      offsets[i] = dataView.getUint16(offset);
      offset += 2;
    }
    this.relativeOffset += count * 2;
    return offsets;
  }

  parseOffset16List(count?: number): number[] {
    return this.parseUShortList(count);
  }

  parseShortList(count: number): number[] {
    const list = new Array<number>(count);
    const dataView = this.data;
    let offset = this.offset + this.relativeOffset;
    for (let i = 0; i < count; i++) {
      list[i] = dataView.getInt16(offset);
      offset += 2;
    }
    this.relativeOffset += count * 2;
    return list;
  }

  parseByteList(count: number): number[] {
    const list = new Array<number>(count);
    const dataView = this.data;
    let offset = this.offset + this.relativeOffset;
    for (let i = 0; i < count; i++) {
      list[i] = dataView.getUint8(offset++);
    }
    this.relativeOffset += count;
    return list;
  }

  /** A list of items read by itemCallback; the 16-bit count is read first when not given. */
  parseList<T>(itemCallback: ParseFn<T>): T[];
  parseList<T>(count: number | undefined, itemCallback: ParseFn<T>): T[];
  parseList<T>(countOrCallback: number | undefined | ParseFn<T>, maybeCallback?: ParseFn<T>): T[] {
    let count: number;
    let itemCallback: ParseFn<T>;
    if (!maybeCallback) {
      itemCallback = countOrCallback as ParseFn<T>;
      count = this.parseUShort();
    } else {
      itemCallback = maybeCallback;
      count = countOrCallback as number;
    }
    const list = new Array<T>(count);
    for (let i = 0; i < count; i++) {
      list[i] = itemCallback.call(this);
    }
    return list;
  }

  /** A list of records; the 16-bit count is read first when not given. */
  parseRecordList<D extends RecordDescription>(recordDescription: D): ParsedRecord<D>[];
  parseRecordList<D extends RecordDescription>(
    count: number | undefined,
    recordDescription: D,
  ): ParsedRecord<D>[];
  parseRecordList<D extends RecordDescription>(
    countOrDescription: number | undefined | D,
    maybeDescription?: D,
  ): ParsedRecord<D>[] {
    if (!maybeDescription) {
      return this.readRecords(this.parseUShort(), countOrDescription as D);
    }
    return this.readRecords(countOrDescription as number, maybeDescription);
  }

  /** Like parseRecordList with a 32-bit count. */
  parseRecordList32<D extends RecordDescription>(recordDescription: D): ParsedRecord<D>[];
  parseRecordList32<D extends RecordDescription>(
    count: number | undefined,
    recordDescription: D,
  ): ParsedRecord<D>[];
  parseRecordList32<D extends RecordDescription>(
    countOrDescription: number | undefined | D,
    maybeDescription?: D,
  ): ParsedRecord<D>[] {
    if (!maybeDescription) {
      return this.readRecords(this.parseULong(), countOrDescription as D);
    }
    return this.readRecords(countOrDescription as number, maybeDescription);
  }

  private readRecords<D extends RecordDescription>(
    count: number,
    recordDescription: D,
  ): ParsedRecord<D>[] {
    const records = new Array<ParsedRecord<D>>(count);
    const fields = Object.keys(recordDescription);
    for (let i = 0; i < count; i++) {
      const rec: Record<string, unknown> = {};
      for (let j = 0; j < fields.length; j++) {
        const fieldName = fields[j] as string;
        const fieldType = recordDescription[fieldName] as ParseFn<unknown>;
        rec[fieldName] = fieldType.call(this);
      }
      records[i] = rec as ParsedRecord<D>;
    }
    return records;
  }

  /**
   * A structure: either a function that reads it, or a description object
   * read field by field. An undefined description fails like the old
   * Object.keys(undefined) when it is reached.
   */
  parseStruct<T>(description: ParseFn<T>): T;
  parseStruct<D extends RecordDescription>(description: D): ParsedRecord<D>;
  parseStruct(description: ParseFn<unknown> | RecordDescription | undefined): unknown;
  parseStruct(description: ParseFn<unknown> | RecordDescription | undefined): unknown {
    if (typeof description === "function") {
      return description.call(this);
    }
    if (description === undefined) {
      throw new TypeError("Cannot convert undefined or null to object");
    }
    const fields = Object.keys(description);
    const struct: Record<string, unknown> = {};
    for (let j = 0; j < fields.length; j++) {
      const fieldName = fields[j] as string;
      const fieldType = description[fieldName] as ParseFn<unknown>;
      struct[fieldName] = fieldType.call(this);
    }
    return struct;
  }

  /**
   * A GPOS value record. valueFormat is read when not given; format 0
   * returns undefined instead of an empty object.
   */
  parseValueRecord(valueFormat?: number): ValueRecord | undefined {
    if (valueFormat === undefined) {
      valueFormat = this.parseUShort();
    }
    if (valueFormat === 0) {
      return undefined;
    }
    const valueRecord: ValueRecord = {};
    if (valueFormat & 0x0001) valueRecord.xPlacement = this.parseShort();
    if (valueFormat & 0x0002) valueRecord.yPlacement = this.parseShort();
    if (valueFormat & 0x0004) valueRecord.xAdvance = this.parseShort();
    if (valueFormat & 0x0008) valueRecord.yAdvance = this.parseShort();
    // Device and VariationIndex tables are not supported: keep the key, skip the offset.
    if (valueFormat & 0x0010) {
      valueRecord.xPlaDevice = undefined;
      this.parseShort();
    }
    if (valueFormat & 0x0020) {
      valueRecord.yPlaDevice = undefined;
      this.parseShort();
    }
    if (valueFormat & 0x0040) {
      valueRecord.xAdvDevice = undefined;
      this.parseShort();
    }
    if (valueFormat & 0x0080) {
      valueRecord.yAdvDevice = undefined;
      this.parseShort();
    }
    return valueRecord;
  }

  /** A list of value records; format and count are read first. */
  parseValueRecordList(): (ValueRecord | undefined)[] {
    const valueFormat = this.parseUShort();
    const valueCount = this.parseUShort();
    const values = new Array<ValueRecord | undefined>(valueCount);
    for (let i = 0; i < valueCount; i++) {
      values[i] = this.parseValueRecord(valueFormat);
    }
    return values;
  }

  /** Follows a 16-bit offset from this.offset; a NULL offset gives undefined. */
  parsePointer<T>(description: ParseFn<T>): T | undefined;
  parsePointer<D extends RecordDescription>(description: D): ParsedRecord<D> | undefined;
  parsePointer(description: ParseFn<unknown> | RecordDescription | undefined): unknown;
  parsePointer(description: ParseFn<unknown> | RecordDescription | undefined): unknown {
    const structOffset = this.parseOffset16();
    if (structOffset > 0) {
      return new Parser(this.data, this.offset + structOffset).parseStruct(description);
    }
    return undefined;
  }

  /** Follows a 32-bit offset from this.offset; a NULL offset gives undefined. */
  parsePointer32<T>(description: ParseFn<T>): T | undefined;
  parsePointer32<D extends RecordDescription>(description: D): ParsedRecord<D> | undefined;
  parsePointer32(description: ParseFn<unknown> | RecordDescription | undefined): unknown {
    const structOffset = this.parseOffset32();
    if (structOffset > 0) {
      return new Parser(this.data, this.offset + structOffset).parseStruct(description);
    }
    return undefined;
  }

  /**
   * A list of offsets to lists. Without itemCallback each list is a list of
   * ushorts; with it each list is a list of offsets to items read by
   * itemCallback. NULL offsets give undefined entries.
   */
  parseListOfLists(): (number[] | undefined)[];
  parseListOfLists<T>(itemCallback: ParseFn<T>): (T[] | undefined)[];
  parseListOfLists<T>(itemCallback?: ParseFn<T>): (T[] | number[] | undefined)[] {
    const offsets = this.parseOffset16List();
    const count = offsets.length;
    const relativeOffset = this.relativeOffset;
    const list = new Array<T[] | number[] | undefined>(count);
    for (let i = 0; i < count; i++) {
      const start = offsets[i] as number;
      if (start === 0) {
        list[i] = undefined;
        continue;
      }
      this.relativeOffset = start;
      if (itemCallback) {
        const subOffsets = this.parseOffset16List();
        const subList = new Array<T>(subOffsets.length);
        for (let j = 0; j < subOffsets.length; j++) {
          this.relativeOffset = start + (subOffsets[j] as number);
          subList[j] = itemCallback.call(this);
        }
        list[i] = subList;
      } else {
        list[i] = this.parseUShortList();
      }
    }
    this.relativeOffset = relativeOffset;
    return list;
  }

  /** A coverage table of GSUB, GPOS or GDEF. */
  parseCoverage(): Coverage {
    const startOffset = this.offset + this.relativeOffset;
    const format = this.parseUShort();
    const count = this.parseUShort();
    if (format === 1) {
      return {
        format: 1,
        glyphs: this.parseUShortList(count),
      };
    } else if (format === 2) {
      const ranges = new Array<CoverageRange>(count);
      for (let i = 0; i < count; i++) {
        ranges[i] = {
          start: this.parseUShort(),
          end: this.parseUShort(),
          index: this.parseUShort(),
        };
      }
      return {
        format: 2,
        ranges: ranges,
      };
    }
    throw new Error("0x" + startOffset.toString(16) + ": Coverage format must be 1 or 2.");
  }

  /** A class definition table of GSUB, GPOS or GDEF. */
  parseClassDef(): ClassDef {
    const startOffset = this.offset + this.relativeOffset;
    const format = this.parseUShort();
    if (format === 1) {
      return {
        format: 1,
        startGlyph: this.parseUShort(),
        classes: this.parseUShortList(),
      };
    } else if (format === 2) {
      return {
        format: 2,
        ranges: this.parseRecordList({
          start: Parser.uShort,
          end: Parser.uShort,
          classId: Parser.uShort,
        }),
      };
    }
    throw new Error("0x" + startOffset.toString(16) + ": ClassDef format must be 1 or 2.");
  }

  parseScriptList(): ScriptRecord[] {
    const langSysTable = {
      reserved: Parser.uShort,
      reqFeatureIndex: Parser.uShort,
      featureIndexes: Parser.uShortList,
    };
    return (
      this.parsePointer(
        Parser.recordList({
          tag: Parser.tag,
          script: Parser.pointer({
            defaultLangSys: Parser.pointer(langSysTable),
            langSysRecords: Parser.recordList({
              tag: Parser.tag,
              langSys: Parser.pointer(langSysTable),
            }),
          }),
        }),
      ) || []
    );
  }

  parseFeatureList(): FeatureRecord[] {
    return (
      this.parsePointer(
        Parser.recordList({
          tag: Parser.tag,
          feature: Parser.pointer({
            featureParams: Parser.offset16,
            lookupListIndexes: Parser.uShortList,
          }),
        }),
      ) || []
    );
  }

  /**
   * The lookup list; lookupTableParsers[lookupType] reads one subtable.
   * A NULL lookup offset (invalid per the spec) would give an undefined
   * entry, which the old code never checks for either.
   */
  parseLookupList<Subtable>(
    lookupTableParsers: ReadonlyArray<ParseFn<Subtable> | undefined>,
  ): LookupTable<Subtable>[] {
    return (
      (this.parsePointer(
        Parser.list(
          Parser.pointer(function (this: Parser): LookupTable<Subtable> {
            const lookupType = this.parseUShort();
            check.argument(
              1 <= lookupType && lookupType <= 9,
              "GPOS/GSUB lookup type " + lookupType + " unknown.",
            );
            const lookupFlag = this.parseUShort();
            const useMarkFilteringSet = lookupFlag & 0x10;
            const subtableParser = lookupTableParsers[lookupType];
            return {
              lookupType: lookupType,
              lookupFlag: lookupFlag,
              subtables: this.parseList(function (this: Parser): Subtable | undefined {
                return this.parsePointer(subtableParser) as Subtable | undefined;
              }),
              markFilteringSet: useMarkFilteringSet ? this.parseUShort() : undefined,
            };
          }),
        ),
      ) as LookupTable<Subtable>[] | undefined) || []
    );
  }

  parseFeatureVariationsList(): FeatureVariationRecord[] {
    return (
      this.parsePointer32(function (this: Parser): FeatureVariationRecord[] {
        const majorVersion = this.parseUShort();
        const minorVersion = this.parseUShort();
        check.argument(
          majorVersion === 1 && minorVersion < 1,
          "GPOS/GSUB feature variations table unknown.",
        );
        return this.parseRecordList32({
          conditionSetOffset: Parser.offset32,
          featureTableSubstitutionOffset: Parser.offset32,
        });
      }) || []
    );
  }

  // Static helpers used as field parsers in record descriptions. They are
  // called with `this` set to a Parser.

  static list<T>(itemCallback: ParseFn<T>): ParseFn<T[]>;
  static list<T>(count: number | undefined, itemCallback: ParseFn<T>): ParseFn<T[]>;
  static list<T>(
    countOrCallback: number | undefined | ParseFn<T>,
    itemCallback?: ParseFn<T>,
  ): ParseFn<T[]> {
    return function (this: Parser): T[] {
      if (itemCallback === undefined) {
        return this.parseList(countOrCallback as ParseFn<T>);
      }
      return this.parseList(countOrCallback as number | undefined, itemCallback);
    };
  }

  static recordList<D extends RecordDescription>(recordDescription: D): ParseFn<ParsedRecord<D>[]>;
  static recordList<D extends RecordDescription>(
    count: number | undefined,
    recordDescription: D,
  ): ParseFn<ParsedRecord<D>[]>;
  static recordList<D extends RecordDescription>(
    countOrDescription: number | undefined | D,
    recordDescription?: D,
  ): ParseFn<ParsedRecord<D>[]> {
    return function (this: Parser): ParsedRecord<D>[] {
      if (recordDescription === undefined) {
        return this.parseRecordList(countOrDescription as D);
      }
      return this.parseRecordList(countOrDescription as number | undefined, recordDescription);
    };
  }

  static recordList32<D extends RecordDescription>(
    recordDescription: D,
  ): ParseFn<ParsedRecord<D>[]>;
  static recordList32<D extends RecordDescription>(
    count: number | undefined,
    recordDescription: D,
  ): ParseFn<ParsedRecord<D>[]>;
  static recordList32<D extends RecordDescription>(
    countOrDescription: number | undefined | D,
    recordDescription?: D,
  ): ParseFn<ParsedRecord<D>[]> {
    return function (this: Parser): ParsedRecord<D>[] {
      if (recordDescription === undefined) {
        return this.parseRecordList32(countOrDescription as D);
      }
      return this.parseRecordList32(countOrDescription as number | undefined, recordDescription);
    };
  }

  static pointer<T>(description: ParseFn<T>): ParseFn<T | undefined>;
  static pointer<D extends RecordDescription>(description: D): ParseFn<ParsedRecord<D> | undefined>;
  static pointer(description: ParseFn<unknown> | RecordDescription): ParseFn<unknown> {
    return function (this: Parser): unknown {
      return this.parsePointer(description);
    };
  }

  static pointer32<T>(description: ParseFn<T>): ParseFn<T | undefined>;
  static pointer32<D extends RecordDescription>(
    description: D,
  ): ParseFn<ParsedRecord<D> | undefined>;
  static pointer32(description: ParseFn<unknown> | RecordDescription): ParseFn<unknown> {
    return function (this: Parser): unknown {
      return this.parsePointer32(description as RecordDescription);
    };
  }

  static tag: ParseFn<string> = function (this: Parser) {
    return this.parseTag();
  };
  static byte: ParseFn<number> = function (this: Parser) {
    return this.parseByte();
  };
  static uShort: ParseFn<number> = function (this: Parser) {
    return this.parseUShort();
  };
  static offset16: ParseFn<number> = Parser.uShort;
  static uShortList: ParseFn<number[]> = function (this: Parser) {
    return this.parseUShortList();
  };
  static uLong: ParseFn<number> = function (this: Parser) {
    return this.parseULong();
  };
  static offset32: ParseFn<number> = Parser.uLong;
  static uLongList: ParseFn<number[]> = function (this: Parser) {
    return this.parseULongList();
  };
  static coverage: ParseFn<Coverage> = function (this: Parser) {
    return this.parseCoverage();
  };
  static classDef: ParseFn<ClassDef> = function (this: Parser) {
    return this.parseClassDef();
  };
}
