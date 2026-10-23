// Old: chunk.vendor.js module 726 (GOpenTypeUtil).
/**
 * Reads what the font lists need from font files without parsing them
 * fully: family, weight and style from the name table, and the single
 * fonts inside a TrueType collection (.ttc) or a Mac resource-fork suitcase.
 *
 * The reader keeps the old one's mistakes because they decide which name a
 * font is listed under (see getOpenTypeInfo and _getOpenTypeInfo). The most
 * visible one: the weight comes from the subfamily name only, so OpenSans
 * SemiBoldItalic ("Open Sans Semibold", subfamily "Italic") counts as 400.
 */
import { Font } from "./font.ts";

/** The parsed value of a struct field: a number, a string, a nested struct or a list. */
type StructValue = number | string | StructFields | StructValue[] | undefined;
interface StructFields {
  [field: string]: StructValue;
}

/** The parent chain a node is parsed in; pointers use it to find their base. */
interface ParseContext {
  parent: StructNode;
  one_up: ParseContext | null;
}

/**
 * One piece of a binary layout. `_parse` reads the value at `offset` and
 * stores the bytes it covers in `size[0]`. Nodes are shared module-level
 * objects and remember where they were last parsed (`_position`), which
 * pointers relative to a parent rely on.
 */
class StructNode {
  _size = -1;
  parent: StructNode | null = null;
  _position = 0;

  _parse(
    _view: DataView,
    offset: number,
    _context: ParseContext | null,
    _fields: StructFields | null,
    size: number[],
  ): StructValue {
    this._position = offset;
    size[0] = this._size;
    return undefined;
  }
}

/** An integer: 1, 2, 3 or 4 bytes unsigned, or -2 for a signed 16-bit value. */
class Primitive extends StructNode {
  __size: number;

  constructor(size: number) {
    super();
    this.__size = size;
    this._size = Math.abs(size);
  }

  override _parse(
    view: DataView,
    offset: number,
    _context: ParseContext | null,
    _fields: StructFields | null,
    size: number[],
  ): number {
    size[0] = this._size;
    switch (this.__size) {
      case -2:
        return view.getInt16(offset);
      case 1:
        return view.getUint8(offset);
      case 2:
        return view.getUint16(offset);
      case 3:
        // Reads four bytes, so a 24-bit value in the last three bytes throws.
        return view.getUint32(offset) >> 8;
      case 4:
        return view.getUint32(offset);
      default:
        return 0;
    }
  }

  getSize(): number {
    return this._size;
  }
}

/** Skipped bytes: `count` primitives. */
class Reserved extends StructNode {
  _primitive: Primitive;

  constructor(primitive: Primitive, count: number) {
    super();
    this._primitive = primitive;
    this._size = count * primitive.getSize();
  }
}

/** Named fields in order. */
class Struct extends StructNode {
  _data: Record<string, StructNode>;

  constructor(data: Record<string, StructNode>) {
    super();
    this._data = data;
  }

  override _parse(
    view: DataView,
    offset: number,
    context: ParseContext | null,
    _fields: StructFields | null,
    size: number[],
  ): StructFields {
    const names = Object.keys(this._data);
    const fields: StructFields = {};
    const fieldSize = [0];
    let total = 0;
    this._position = offset;
    const own: ParseContext = { parent: this, one_up: context };
    for (let i = 0; i < names.length; i++) {
      const name = names[i] as string;
      const node = this._data[name] as StructNode;
      fields[name] = node._parse(view, offset, own, fields, fieldSize);
      total += fieldSize[0] as number;
      offset += fieldSize[0] as number;
    }
    this._size = total;
    size[0] = total;
    return fields;
  }
}

/** A list whose length is an earlier field of the same struct. */
class List extends StructNode {
  _snode: StructNode;
  _numField: string;
  _sizeTrf: ((count: number) => number) | null;

  constructor(node: StructNode, countField: string, transformCount?: (count: number) => number) {
    super();
    this._snode = node;
    this._numField = countField;
    this._sizeTrf = transformCount || null;
  }

  override _parse(
    view: DataView,
    offset: number,
    context: ParseContext | null,
    fields: StructFields | null,
    size: number[],
  ): StructValue[] {
    this._position = offset;
    let count = (fields as StructFields)[this._numField] as number;
    if (this._sizeTrf) count = this._sizeTrf(count);
    if (count > 256) throw new Error("Something might be wrong");
    const items: StructValue[] = [];
    const itemSize = [0];
    let total = 0;
    const own: ParseContext = { parent: this, one_up: context };
    for (let i = 0; i < count; i++) {
      items.push(this._snode._parse(view, offset, own, fields, itemSize));
      offset += itemSize[0] as number;
      total += itemSize[0] as number;
    }
    size[0] = total;
    return items;
  }
}

/**
 * A NUL-terminated string of a fixed length (a negative length reads up to
 * 512 bytes), or a Pascal string when the length is a primitive.
 */
class StructString extends StructNode {
  _pascalString = false;
  _length: number | Primitive;

  constructor(length: number | Primitive) {
    super();
    this._length = length;
    if (length instanceof StructNode) this._pascalString = true;
  }

  override _parse(
    view: DataView,
    offset: number,
    context: ParseContext | null,
    fields: StructFields | null,
    size: number[],
  ): string {
    this._position = offset;
    let length: number;
    let text = "";
    let prefixSize: number[] | null = null;
    if (this._pascalString) {
      prefixSize = [0];
      length = (this._length as Primitive)._parse(view, offset, context, fields, prefixSize);
      offset += prefixSize[0] as number;
    } else {
      length = (this._length as number) < 0 ? 512 : (this._length as number);
    }
    for (let i = 0; i < length && offset < view.byteLength; i++, offset++) {
      const byte = view.getUint8(offset);
      if (byte === 0) break;
      text += String.fromCharCode(byte);
    }
    size[0] = prefixSize ? length + (prefixSize[0] as number) : length;
    return text;
  }
}

/**
 * An offset (a primitive) to another node. `type` says what it is relative
 * to: "relative" (the struct it is in), "parent", "parent.parent", ... (that
 * many contexts further up), "absolute" or "immediate" (the offset field
 * itself). With a string instead of a node it returns the address.
 */
class Pointer extends StructNode {
  _type: string;
  _snode: StructNode | string;
  _primitive: Primitive;

  constructor(primitive: Primitive, node: StructNode | string, type?: string) {
    super();
    this._type = type || "relative";
    this._snode = node;
    this._primitive = primitive;
    this._size = primitive.getSize();
  }

  override _parse(
    view: DataView,
    offset: number,
    context: ParseContext | null,
    fields: StructFields | null,
    size: number[],
  ): StructValue {
    super._parse(view, offset, context, fields, size);
    const value = this._primitive._parse(view, offset, context, fields, size);
    if (this._type && this._type.startsWith("parent")) {
      const levels = this._type.split(".").length;
      let base = context;
      for (let i = 0; i < levels; i++) base = (base as ParseContext).one_up;
      if (!base || !base.parent) throw new Error("Invalid file structure");
      offset = base.parent._position + value;
    } else if (this._type === "absolute") {
      offset = value;
    } else if (this._type === "immediate") {
      offset += value;
    } else {
      offset = (context as ParseContext).parent._position + value;
    }
    return typeof this._snode === "string"
      ? offset
      : this._snode._parse(view, offset, context, fields, [0]);
  }
}

const UINT8 = new Primitive(1);
const UINT16 = new Primitive(2);
const UINT24 = new Primitive(3);
const UINT32 = new Primitive(4);
const INT16 = new Primitive(-2);

/** A resource name in a Mac resource fork. */
const PASCAL_STRING = new StructString(UINT8);

/** A Mac resource fork: reference list entry, type list entry, type list, map, header. */
const RESOURCE_REFERENCE = new Struct({
  id: UINT16,
  nameOffset: INT16,
  attr: UINT8,
  dataOffset: UINT24,
  handle: UINT32,
});
const RESOURCE_TYPE = new Struct({
  name: new StructString(4),
  maxTypeIndex: UINT16,
  refList: new Pointer(
    UINT16,
    new List(RESOURCE_REFERENCE, "maxTypeIndex", (count) => count + 1),
    "parent.parent",
  ),
});
const RESOURCE_TYPE_LIST = new Struct({
  length: UINT16,
  types: new List(RESOURCE_TYPE, "length", (count) => count + 1),
});
const RESOURCE_MAP = new Struct({
  reserved: new Reserved(UINT8, 24),
  typeList: new Pointer(UINT16, RESOURCE_TYPE_LIST),
  nameListOffset: new Pointer(UINT16, "void"),
});
const RESOURCE_FORK = new Struct({
  dataOffset: UINT32,
  map: new Pointer(UINT32, RESOURCE_MAP),
  dataLength: UINT32,
  mapLength: UINT32,
});

/** A TrueType collection header. */
const COLLECTION_HEADER = new Struct({
  name: new StructString(4),
  version: UINT32,
  numFonts: UINT32,
  offsets: new List(UINT32, "numFonts"),
});

const TYPE_COLLECTION = 0;
const TYPE_RESOURCE_FORK = 1;
const TYPE_SINGLE = 2;

/** One font found in a file. `buffer` is null when only the names were asked for. */
export interface FontFileEntry {
  buffer: ArrayBuffer | DataView | null;
  family: string;
  weight: number;
  style: string;
  subfamily: string | undefined;
  displayname: string | undefined;
}

/** What getOpenTypeInfo reads from the name table. */
export interface OpenTypeInfo {
  name: string;
  weight: number;
  style: string;
  /** Typographic family (name id 16). */
  displayname: string | undefined;
  /** Typographic subfamily (name id 17). */
  subfamily: string | undefined;
}

interface ResourceReference extends StructFields {
  nameOffset: number;
  dataOffset: number;
}
interface ResourceType extends StructFields {
  name: string;
  refList: ResourceReference[];
}
interface ParsedResourceFork extends StructFields {
  dataOffset: number;
  map: { typeList: { types: ResourceType[] }; nameListOffset: number };
}
interface ParsedCollection extends StructFields {
  name: string;
  offsets: number[];
}

/** Finds the fonts in a font file (a single font, a collection or a resource fork). */
export class OpenTypeParser {
  _buffer: DataView | null = null;
  _type: number | null = null;
  _pos = 0;
  _parsedStruct: ParsedCollection | ParsedResourceFork | null = null;

  /** Typed arrays and DataViews are read from the start of their whole buffer. */
  constructor(data?: ArrayBuffer | ArrayBufferView | null) {
    if (data) {
      let buffer: ArrayBufferLike;
      if (data instanceof ArrayBuffer) {
        buffer = data;
      } else {
        if (!(data.buffer instanceof ArrayBuffer)) {
          console.warn("Invalid font buffer given");
          return;
        }
        buffer = data.buffer;
      }
      this._buffer = new DataView(buffer);
      this._checkType();
    }
  }

  _parse(node: StructNode): StructValue {
    return node._parse(this._buffer as DataView, 0, null, null, [0]);
  }

  /**
   * The fonts in the file. With `all` every font, else only the first one
   * that matches family, style and weight. With `namesOnly` the entries
   * carry no buffer and collection offsets are left alone. The buffers of
   * a collection are copies whose table offsets are made relative to the
   * single font.
   */
  getFont(
    family: string,
    style: string | null | undefined,
    weight: number | string | null | undefined,
    all?: boolean,
    namesOnly?: boolean,
  ): FontFileEntry[] {
    const found: FontFileEntry[] = [];
    weight = parseInt(weight as string) || 400;
    style = style || Font.Style.Normal;
    const view = this._buffer as DataView;
    const matches = (info: OpenTypeInfo | null): info is OpenTypeInfo =>
      !!info &&
      (!!all ||
        (info.name === family &&
          parseInt(info.weight as unknown as string) === parseInt(weight as unknown as string) &&
          info.style === style));
    const entry = (info: OpenTypeInfo, buffer: ArrayBuffer | DataView | null): FontFileEntry => ({
      buffer,
      family: info.name,
      weight: info.weight,
      style: info.style,
      subfamily: info.subfamily,
      displayname: info.displayname,
    });
    switch (this._type) {
      case TYPE_COLLECTION: {
        const offsets = (this._parsedStruct as ParsedCollection).offsets.slice();
        offsets.sort((a, b) => a - b);
        for (let i = 0; i < offsets.length; i++) {
          const offset = offsets[i] as number;
          const font = namesOnly
            ? new DataView(view.buffer, offset)
            : (view.buffer as ArrayBuffer).slice(offset);
          const info = OpenTypeUtil.getOpenTypeInfo(font, offset);
          if (!namesOnly) OpenTypeUtil.patchOffsets(font, offset);
          if (matches(info)) {
            found.push(entry(info, namesOnly ? null : font));
            if (!all) return found;
          }
        }
        break;
      }
      case TYPE_RESOURCE_FORK: {
        const fork = this._parsedStruct as ParsedResourceFork;
        const types = fork.map.typeList.types;
        let sfnt: ResourceType | null = null;
        for (let i = 0; i < types.length; i++) {
          const type = types[i] as ResourceType;
          const references = type.refList;
          for (let j = 0; j < references.length; j++) {
            const reference = references[j] as ResourceReference;
            reference.name =
              reference.nameOffset >= 0
                ? PASCAL_STRING._parse(
                    view,
                    reference.nameOffset + fork.map.nameListOffset,
                    null,
                    null,
                    [0],
                  )
                : (null as unknown as undefined);
          }
          if (type.name === "sfnt") sfnt = type;
        }
        if (sfnt) {
          const dataOffsets: number[] = [];
          const references = sfnt.refList;
          for (let i = 0; i < references.length; i++) {
            dataOffsets.push((references[i] as ResourceReference).dataOffset);
          }
          dataOffsets.sort((a, b) => a - b);
          for (let i = 0; i < dataOffsets.length; i++) {
            // Each resource starts with its 4-byte length.
            const start = fork.dataOffset + (dataOffsets[i] as number) + 4;
            const font = new DataView(view.buffer, start);
            const info = OpenTypeUtil.getOpenTypeInfo(font, 0);
            if (matches(info)) {
              found.push(entry(info, namesOnly ? null : font));
              if (!all) return found;
            }
          }
        }
        break;
      }
      case TYPE_SINGLE: {
        const info = OpenTypeUtil.getOpenTypeInfo(view);
        if (matches(info)) {
          found.push(entry(info, namesOnly ? null : (view.buffer as ArrayBuffer)));
        }
        break;
      }
    }
    return found;
  }

  /** A single font if its first cmap record is one the engine reads, else a collection or resource fork. */
  _checkType(): void {
    if (OpenTypeUtil._getOpenTypeInfo(this._buffer as DataView, 0, true)) {
      this._type = TYPE_SINGLE;
      return;
    }
    let parsed: StructValue;
    try {
      parsed = this._parse(COLLECTION_HEADER);
    } catch {
      // Not a collection.
    }
    if (parsed && (parsed as ParsedCollection).name === "ttcf") {
      this._type = TYPE_COLLECTION;
      this._parsedStruct = parsed as ParsedCollection;
      return;
    }
    try {
      parsed = this._parse(RESOURCE_FORK);
      if (parsed) {
        const types = (parsed as ParsedResourceFork).map.typeList.types;
        for (let i = 0; i < types.length; i++) {
          if ((types[i] as ResourceType).name === "sfnt") {
            this._type = TYPE_RESOURCE_FORK;
            this._parsedStruct = parsed as ParsedResourceFork;
            return;
          }
        }
      }
    } catch {
      // Not a resource fork either.
    }
    this._type = -1;
  }
}

/** Windows language ids the name reader knows (the first, 1025, is skipped by mistake). */
const WINDOWS_LANGUAGES = [
  1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040,
  1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1056,
  1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1066, 1067, 1068, 1069, 1070, 1071, 1074, 1076,
  1077, 1078, 1079, 1080, 1081, 1082, 1083, 1086, 1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094,
  1095, 1096, 1097, 1098, 1099, 1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1110, 1111,
  1114, 1115, 1117, 1118, 1121, 1122, 1123, 1124, 1125, 1128, 1130, 1131, 1132, 1133, 1134, 1135,
  1136, 1144, 1146, 1148, 1150, 1152, 1153, 1154, 1155, 1156, 1157, 1158, 1159, 1160, 1164, 2049,
  2052, 2055, 2057, 2058, 2060, 2064, 2067, 2068, 2070, 2074, 2077, 2092, 2094, 2107, 2108, 2110,
  2115, 2117, 2128, 2141, 2143, 2155, 3073, 3076, 3079, 3081, 3082, 3084, 3098, 3131, 3179, 4097,
  4100, 4103, 4105, 4106, 4108, 4122, 4155, 5121, 5124, 5127, 5129, 5130, 5132, 5146, 5179, 6145,
  6153, 6154, 6156, 6170, 6203, 7169, 7177, 7178, 7194, 7227, 8193, 8201, 8202, 8218, 8251, 9217,
  9225, 9226, 9275, 10241, 10249, 10250, 11265, 11273, 11274, 12289, 12297, 12298, 13313, 13321,
  13322, 14337, 14346, 15361, 15370, 16385, 16393, 16394, 17417, 17418, 18441, 18442, 19466, 20490,
  21514,
];

/** The English variants among the Windows language ids. */
const WINDOWS_ENGLISH = [
  1033, 2057, 3081, 4105, 5129, 6153, 7177, 8201, 9225, 10249, 11273, 12297, 13321, 16393, 17417,
  18441,
];

/** The upper halves (0x80-0xFF) of the Mac single-byte encodings the reader can decode. */
const MAC_ENCODINGS: Record<string, string> = {
  "x-mac-croatian":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø¿¡¬√ƒ≈Ć«Č… ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ",
  "x-mac-cyrillic":
    "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњјЅ¬√ƒ≈∆«»… ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю",
  "x-mac-gaelic":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæøṁṖṗɼƒſṠ«»… ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ",
  "x-mac-greek":
    "Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩάΝ¬ΟΡ≈Τ«»… ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ­",
  "x-mac-icelandic":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "x-mac-inuit":
    "ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗᓘᓚᓛᓪᔨᔩᔪᔫᔭ… ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł",
  "x-mac-ce":
    "ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅņŃ¬√ńŇ∆«»… ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ",
  macintosh:
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "x-mac-romanian":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ",
  "x-mac-turkish":
    "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ",
};

/** Mac encoding names by Macintosh encoding id. */
const MAC_ENCODING_BY_ID: Record<number, string> = {
  0: "macintosh",
  1: "x-mac-japanese",
  2: "x-mac-chinesetrad",
  3: "x-mac-korean",
  6: "x-mac-greek",
  7: "x-mac-cyrillic",
  9: "x-mac-devanagai",
  10: "x-mac-gurmukhi",
  11: "x-mac-gujarati",
  12: "x-mac-oriya",
  13: "x-mac-bengali",
  14: "x-mac-tamil",
  15: "x-mac-telugu",
  16: "x-mac-kannada",
  17: "x-mac-malayalam",
  18: "x-mac-sinhalese",
  19: "x-mac-burmese",
  20: "x-mac-khmer",
  21: "x-mac-thai",
  22: "x-mac-lao",
  23: "x-mac-georgian",
  24: "x-mac-armenian",
  25: "x-mac-chinesesimp",
  26: "x-mac-tibetan",
  27: "x-mac-mongolian",
  28: "x-mac-ethiopic",
  29: "x-mac-ce",
  30: "x-mac-vietnamese",
  31: "x-mac-extarabic",
};

/** Mac languages whose names use an encoding other than their script's. */
const MAC_ENCODING_BY_LANGUAGE: Record<number, string> = {
  15: "x-mac-icelandic",
  17: "x-mac-turkish",
  18: "x-mac-croatian",
  24: "x-mac-ce",
  25: "x-mac-ce",
  26: "x-mac-ce",
  27: "x-mac-ce",
  28: "x-mac-ce",
  30: "x-mac-icelandic",
  37: "x-mac-romanian",
  38: "x-mac-ce",
  39: "x-mac-ce",
  40: "x-mac-ce",
  143: "x-mac-inuit",
  146: "x-mac-gaelic",
};

/** The encoding of a name record, or undefined to skip it. */
function nameEncoding(
  platformId: number,
  encodingId: number,
  languageId: number,
): string | undefined {
  switch (platformId) {
    case 0:
      return "utf16";
    case 1:
      return MAC_ENCODING_BY_LANGUAGE[languageId] || MAC_ENCODING_BY_ID[encodingId];
    case 3:
      if (encodingId === 1 || encodingId === 10) return "utf16";
  }
  return undefined;
}

/** A name slot: one English and one other-language record per name id. */
interface NameRecordSlots {
  en?: NameRecord;
  oth?: NameRecord;
}
interface NameRecord {
  encoding: string;
  stringLen: number;
  stringOff: number;
}

/**
 * Which slot ("en" or "oth") a name record goes into, or undefined to skip
 * it. A later record overwrites an earlier one in the same slot. Mac
 * language ids from 152 up fall through to the Windows rules, and the
 * Windows check `indexOf(...)` is only false for 1025 (index 0), so ids it
 * doesn't list count too.
 */
function nameSlot(
  platformId: number,
  languageId: number,
  languageTags: string[] | null,
  existing: NameRecordSlots | undefined,
): "en" | "oth" | undefined {
  switch (platformId) {
    case 0:
      if (languageId === 65535) return "oth";
      if (languageTags) {
        const tag = languageTags[languageId];
        if (tag) {
          if (tag === "en") return tag;
          if (!existing) return tag.indexOf("en") === 0 ? "en" : "oth";
          if (tag.indexOf("en") < 0) return "oth";
          if (!existing.en) return "en";
        }
      }
      break;
    // @ts-expect-error -- falls through to the Windows rules, as before.
    case 1:
      if (languageId === 0) return "en";
      if (languageId < 152) return "oth";
    // falls through
    case 3:
      if (WINDOWS_LANGUAGES.indexOf(languageId)) {
        if (languageId === 1033) return "en";
        if (!existing) return WINDOWS_ENGLISH.indexOf(languageId) >= 0 ? "en" : "oth";
        if (WINDOWS_ENGLISH.indexOf(languageId) < 0) return "oth";
        if (!existing.en) return "en";
      }
  }
  return undefined;
}

/** Name ids getOpenTypeInfo reads. */
const NAME_ID = {
  COPYRIGHT: 0,
  FAMILY: 1,
  SUBFAMILY: 2,
  FONTID: 3,
  NAME: 4,
  VERSION: 5,
  POSTSCRIPTID: 6,
  TRADEMARK: 7,
  TYPO_FAMILY: 16,
  TYPO_SUBFAMILY: 17,
};

/** The names by name id (0 for ids 0-7 that weren't found), and "<wght>_<ital>" from STAT. */
type RawOpenTypeInfo = [Array<string | 0> | null, string];

function toDataView(data: ArrayBuffer | ArrayBufferView | DataView): DataView {
  if (data instanceof DataView) return data;
  return new DataView(((data as ArrayBufferView).buffer || data) as ArrayBuffer);
}

export const OpenTypeUtil = {
  Parser: OpenTypeParser,

  nameId: NAME_ID,

  /** The fonts of a font file, see OpenTypeParser.getFont; null without data. */
  getFont(
    family: string,
    style: string | null | undefined,
    weight: number | string | null | undefined,
    data: ArrayBuffer | ArrayBufferView | null | undefined,
    all?: boolean,
    namesOnly?: boolean,
  ): FontFileEntry[] | null {
    return data ? new OpenTypeParser(data).getFont(family, style, weight, all, namesOnly) : null;
  },

  /**
   * Family, weight and style from the name table. `offset` is where the
   * font starts in the file its table offsets point into (collections).
   * The weight and style come from the subfamily name (id 2) alone; the
   * STAT values _getOpenTypeInfo reads are ignored.
   */
  getOpenTypeInfo(data: ArrayBuffer | ArrayBufferView, offset?: number): OpenTypeInfo | null {
    const raw = OpenTypeUtil._getOpenTypeInfo(data, offset || 0) as RawOpenTypeInfo | undefined;
    const names = raw ? raw[0] : null;
    let family: string | 0 | undefined;
    if (names && (family = names[NAME_ID.FAMILY] || names[NAME_ID.NAME])) {
      let weight: number | null = null;
      let style: string | null = null;
      let subfamily = names[NAME_ID.SUBFAMILY];
      if (subfamily) {
        subfamily = subfamily.toLowerCase();
        if (
          subfamily.indexOf("italic") >= 0 ||
          subfamily.indexOf("oblique") >= 0 ||
          subfamily.indexOf("italique") >= 0
        ) {
          style = Font.Style.Italic;
        }
        if (subfamily.indexOf("bold") >= 0 || subfamily.indexOf("gras") >= 0) {
          weight =
            subfamily.indexOf("extra") >= 0 || subfamily.indexOf("ultra") >= 0
              ? 800
              : subfamily.indexOf("semi") >= 0 || subfamily.indexOf("demi") >= 0
                ? 600
                : 700;
        } else if (subfamily.indexOf("black") >= 0 || subfamily.indexOf("heavy") >= 0) {
          weight = 900;
        } else if (subfamily.indexOf("medium") >= 0) {
          weight = 500;
        } else if (subfamily.indexOf("regular") >= 0 || subfamily.indexOf("normal") >= 0) {
          weight = 400;
        } else if (subfamily.indexOf("light") >= 0) {
          weight = subfamily.indexOf("extra") >= 0 || subfamily.indexOf("ultra") >= 0 ? 200 : 300;
        } else if (subfamily.indexOf("thin") >= 0) {
          weight = 100;
        }
      }
      return {
        name: family,
        weight: weight || 400,
        style: style || Font.Style.Normal,
        displayname: names[NAME_ID.TYPO_FAMILY] as string | undefined,
        subfamily: names[NAME_ID.TYPO_SUBFAMILY] as string | undefined,
      };
    }
    return null;
  },

  /** A table tag at `offset`, lowercased. */
  _readTag(view: DataView, offset: number): string {
    return (
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3))
    ).toLowerCase();
  },

  /** Makes the table offsets of a font cut out of a collection relative to its start. */
  patchOffsets(data: ArrayBuffer | ArrayBufferView, offset: number): void {
    if (!offset) return;
    let view: DataView;
    if (data instanceof DataView) {
      view = data;
    } else {
      try {
        view = toDataView(data);
      } catch {
        // The old code returned an undeclared variable here.
        throw new ReferenceError("retArr is not defined");
      }
    }
    const length = view.byteLength;
    try {
      const tableCount = view.getUint16(4);
      let position = 12;
      for (let i = 0; i < tableCount && length - position >= 16; i++) {
        position += 8;
        view.setUint32(position, view.getUint32(position) - offset);
        position += 8;
      }
    } catch {
      // A truncated table directory stays as far as it was patched.
    }
  },

  /**
   * Reads the table directory and the name (and STAT) table. With
   * `checkCmap` it only answers whether the first cmap encoding record is
   * one the engine reads (true/false), or a truthy list when reading
   * failed. Otherwise it returns the names by id and a "<wght>_<ital>"
   * string from STAT, or undefined when a Mac name uses an encoding it
   * can't decode. Errors while reading are swallowed and return what was
   * read so far.
   */
  _getOpenTypeInfo(
    data: ArrayBuffer | ArrayBufferView,
    offset: number,
    checkCmap?: boolean,
  ): RawOpenTypeInfo | boolean | undefined | never[] {
    let names: Array<string | 0> | null = null;
    let statWeight: string | null = null;
    let statItalic: string | null = null;
    let position: number;
    const length =
      (data as { length?: number }).length || (data as ArrayBuffer | ArrayBufferView).byteLength;
    let view: DataView;
    try {
      view = toDataView(data);
    } catch {
      return !checkCmap && [];
    }
    try {
      position = 4;
      const tableCount = Math.min(256, view.getUint16(position));
      position = 12;
      let nameOffset = 0;
      let statOffset = 0;
      let ltagOffset = 0;
      for (let i = 0; i < tableCount && length - position >= 16; i++) {
        const tag = OpenTypeUtil._readTag(view, position);
        position += 8;
        if (tag === "name") {
          nameOffset = view.getUint32(position) - offset;
        } else if (tag === "stat") {
          statOffset = view.getUint32(position) - offset;
        } else {
          if (checkCmap && tag === "cmap") {
            const cmap = view.getUint32(position) - offset;
            if (view.getUint16(cmap) === 0) {
              const platformId = view.getUint16(cmap + 4);
              const encodingId = view.getUint16(cmap + 6);
              if (platformId === 0) {
                if (encodingId <= 6) return true;
              } else if (platformId === 1) {
                if (encodingId <= 10) return true;
              } else if (platformId === 3 && (encodingId <= 5 || encodingId === 10)) {
                return true;
              }
            }
            return false;
          }
          if (tag === "ltag") ltagOffset = view.getUint32(position) - offset;
        }
        if (nameOffset > 0 && statOffset > 0) break;
        position += 8;
      }
      if (checkCmap) return false;

      // The old ltag reader read its version from offset 0 of the file and
      // then pushed into an undeclared list, so a font with an ltag table
      // whose file starts with 0x00000001 ends the reading here. Otherwise
      // the language tags stay unknown.
      const languageTags: string[] | null = null;
      if (ltagOffset > 0 && view.getUint32(0) === 1) {
        throw new ReferenceError("tags is not defined");
      }

      if (statOffset > 0) {
        position = statOffset + 4;
        const axisRecordSize = view.getUint16(position);
        position += 2;
        const axisCount = view.getUint16(position);
        position += 2;
        const axesOffset = view.getUint32(position);
        position += 4;
        const valueCount = view.getUint16(position);
        position += 2;
        const valuesOffset = view.getUint32(position);
        position = statOffset + valuesOffset;
        const valueOffsets: number[] = [];
        const axisValues: string[] = [];
        for (let i = 0; i < valueCount; i++) {
          valueOffsets[i] = view.getUint16(position);
          position += 2;
        }
        for (let i = 0; i < valueCount; i++) {
          position = statOffset + valuesOffset + (valueOffsets[i] as number) + 2;
          const axisIndex = view.getUint16(position);
          position += 2;
          position += 4;
          axisValues[axisIndex] = (Number(view.getUint32(position)) / 65536).toFixed(0);
          position += 4;
        }
        position = statOffset + axesOffset;
        for (let i = 0; i < axisCount; i++) {
          const tag = OpenTypeUtil._readTag(view, position);
          position += 4;
          if (tag == "wght") statWeight = String(axisValues[i]);
          else if (tag == "ital") statItalic = String(axisValues[i]);
          // Should be (i + 1) records further; every axis after the first
          // reads the tag of the one before it.
          position = statOffset + axesOffset + i * axisRecordSize;
        }
      }

      if (nameOffset > 0) {
        position = nameOffset + 2;
        const recordCount = Math.min(255, view.getUint16(position));
        position += 2;
        const stringsOffset = view.getUint16(position);
        position += 2;
        const records: NameRecordSlots[] = [];
        for (let i = 0; i < recordCount && position < length; i++) {
          const platformId = view.getUint16(position);
          position += 2;
          const encodingId = view.getUint16(position);
          position += 2;
          const languageId = view.getUint16(position);
          position += 2;
          const nameId = view.getUint16(position);
          position += 2;
          if (nameId <= 7 || nameId === NAME_ID.TYPO_FAMILY || nameId === NAME_ID.TYPO_SUBFAMILY) {
            const stringLen = view.getUint16(position);
            position += 2;
            const stringOff = view.getUint16(position);
            position += 2;
            if (stringLen > 0) {
              const existing = records[nameId];
              const slot = nameSlot(platformId, languageId, languageTags, existing);
              const encoding = nameEncoding(platformId, encodingId, languageId);
              if (encoding !== undefined && slot !== undefined) {
                if (!existing) records[nameId] = {};
                (records[nameId] as NameRecordSlots)[slot] = { encoding, stringLen, stringOff };
              }
            }
          } else {
            position += 4;
          }
        }
        for (let i = 0; i < records.length; i++) {
          const slots = records[i];
          if (!slots) continue;
          // The old `(W = W.en) || (W = W.oth)` lost the slots before reading
          // `oth`, so a name id without an English record throws here and
          // ends the reading: other-language names are never used.
          if (!slots.en) throw new TypeError("Cannot read properties of undefined (reading 'oth')");
          const record = slots.en;
          position = record.stringOff + stringsOffset + nameOffset;
          let text = "";
          if (record.encoding === "utf16") {
            const units: number[] = [];
            const count = Math.min(record.stringLen / 2, 255);
            for (let j = 0; j < count && position < length; j++) {
              units[j] = view.getUint16(position);
              position += 2;
            }
            text = String.fromCharCode.apply(null, units);
          } else {
            const table = MAC_ENCODINGS[record.encoding];
            if (table === undefined) return undefined;
            const count = Math.min(record.stringLen, 255);
            for (let j = 0; j < count && position < length; j++) {
              const byte = view.getUint8(position + j);
              if (byte !== 0)
                text += byte <= 127 ? String.fromCharCode(byte) : String(table[byte & 127]);
            }
          }
          if (!names) names = [0, 0, 0, 0, 0, 0, 0, 0];
          names[i] = text;
        }
      }
    } catch {
      // Keep what was read.
    }
    if (statWeight == null) statWeight = "";
    if (statItalic == null) statItalic = "";
    return [names, statWeight + "_" + statItalic];
  },
};
