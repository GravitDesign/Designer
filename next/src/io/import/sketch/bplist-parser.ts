// Old: chunk.vendor.js module 1138 (ns/bplistparser), on designer module
// 1210 (jDataView), which the port replaces with native DataViews.

/** A plist value: null, boolean, number, Date, string, data (a view), array or dict. */
export type PlistValue =
  | null
  | boolean
  | number
  | Date
  | string
  | DataView
  | undefined
  | PlistValue[]
  | { [key: string]: PlistValue };

/**
 * jDataView's slice: negative bounds count from the end, the view shares
 * the buffer, and out-of-range bounds throw.
 */
function slice(view: DataView, start: number, end?: number): DataView {
  const length = view.byteLength;
  const from = start < 0 ? start + length : start;
  let to = undefined === end ? length : end;
  if (to < 0) to += length;
  return new DataView(view.buffer, view.byteOffset + from, to - from);
}

/** Big-endian unsigned integer of the view's bytes, in 32-bit int arithmetic as before. */
function readInt(view: DataView, offset?: number): number {
  let value = 0;
  for (let i = offset || 0; i < view.byteLength; i++) {
    value <<= 8;
    value |= 255 & view.getUint8(i);
  }
  return value;
}

/** jDataView's big-endian getUint64: low word plus 2^32 times the high word. */
function readUint64(view: DataView, offset: number): number {
  const high = view.getUint32(offset, false);
  const low = view.getUint32(offset + 4, false);
  return low + Math.pow(2, 32) * high;
}

/** jDataView's getString: "binary" maps bytes to char codes, other encodings use TextDecoder. */
function readString(view: DataView, encoding?: string): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  const name = "utf8" === encoding ? "utf-8" : encoding || "binary";
  if ("binary" !== name) return new TextDecoder(name).decode(bytes);
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i] as number);
  return text;
}

/** Parses Apple binary property lists ("bplist00"). */
export class BPlistParser {
  parse(input: ArrayBufferView): PlistValue {
    // jDataView copied a typed array into a buffer of its own.
    const source = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const data = new DataView(new Uint8Array(source).buffer);
    if ("bplist" !== readString(slice(data, 0, "bplist".length)))
      throw new Error("Invalid binary plist. Expected 'bplist' at offset 0.");
    const trailer = slice(data, data.byteLength - 32, data.byteLength);
    const offsetSize = trailer.getUint8(6);
    const objectRefSize = trailer.getUint8(7);
    const objectCount = readUint64(trailer, 8);
    const topObject = readUint64(trailer, 16);
    const offsetTableOffset = readUint64(trailer, 24);
    const offsets: number[] = [];
    for (let i = 0; i < objectCount; i++) {
      const entry = slice(
        data,
        offsetTableOffset + i * offsetSize,
        offsetTableOffset + (i + 1) * offsetSize,
      );
      offsets[i] = readInt(entry, 0);
    }

    /** The marker byte's low nibble, or the int object after it when the nibble is 15. */
    const readLength = (
      offset: number,
      nibble: number,
      kind: string,
    ): { length: number; headerSize: number } => {
      let length = nibble;
      let headerSize = 1;
      if (15 == nibble) {
        const marker = data.getUint8(offset + 1);
        const type = (240 & marker) / 16;
        if (1 != type) console.error(kind + "UNEXPECTED LENGTH-INT TYPE! " + type);
        const size = Math.pow(2, 15 & marker);
        headerSize = 2 + size;
        length = readInt(slice(data, offset + 2, offset + 2 + size));
      }
      return { length, headerSize };
    };

    const parseObject = (index: number): PlistValue => {
      const offset = offsets[index] as number;
      const marker = data.getUint8(offset);
      const type = (240 & marker) >> 4;
      const nibble = 15 & marker;

      const parseString = (utf16?: boolean): string => {
        const wide = utf16 ? 1 : 0;
        let encoding = "utf8";
        let length = nibble;
        let headerSize = 1;
        if (15 == nibble) {
          const lengthMarker = data.getUint8(offset + 1);
          const lengthType = (240 & lengthMarker) / 16;
          // The old code called console.err here, which throws a TypeError.
          if (1 != lengthType)
            (console as unknown as { err(message: string): void }).err(
              "UNEXPECTED LENGTH-INT TYPE! " + lengthType,
            );
          const size = Math.pow(2, 15 & lengthMarker);
          headerSize = 2 + size;
          length = readInt(slice(data, offset + 2, offset + 2 + size));
        }
        length *= wide + 1;
        const bytes = slice(data, offset + headerSize, offset + headerSize + length);
        if (wide) {
          // Big-endian UTF-16 to little-endian, in place in the shared buffer.
          for (let i = 0; i < bytes.byteLength; i += 2) {
            const high = bytes.getUint8(i);
            bytes.setUint8(i, bytes.getUint8(i + 1));
            bytes.setUint8(i + 1, high);
          }
          encoding = "ucs-2";
        }
        return readString(bytes, encoding);
      };

      switch (type) {
        case 0:
          switch (nibble) {
            case 0:
              return null;
            case 8:
              return false;
            case 9:
              return true;
            case 15:
              return null;
            default:
              throw new Error("Unhandled simple type 0x" + type.toString(16));
          }
        case 1:
          return readInt(slice(data, offset + 1, offset + 1 + Math.pow(2, nibble)));
        case 8:
          // A UID: the index of an object in $objects.
          return readInt(slice(data, offset + 1, offset + 1 + (nibble + 1)));
        case 2: {
          const size = Math.pow(2, nibble);
          const bytes = slice(data, offset + 1, offset + 1 + size);
          if (4 === size) return bytes.getFloat32(0, false);
          if (8 === size) return bytes.getFloat64(0, false);
          return undefined;
        }
        case 3: {
          if (3 != nibble) console.error("Unknown date type :" + nibble + ". Parsing anyway...");
          const bytes = slice(data, offset + 1, offset + 9);
          return new Date(9783072e5 + 1e3 * bytes.getFloat64(0, false));
        }
        case 4: {
          const { length, headerSize } = readLength(offset, nibble, "0x4: ");
          return slice(data, offset + headerSize, offset + headerSize + length);
        }
        case 5:
          return parseString();
        case 6:
          return parseString(true);
        case 10: {
          const { length, headerSize } = readLength(offset, nibble, "0xa: ");
          const array: PlistValue[] = [];
          for (let i = 0; i < length; i++) {
            const ref = readInt(
              slice(
                data,
                offset + headerSize + i * objectRefSize,
                offset + headerSize + (i + 1) * objectRefSize,
              ),
            );
            array[i] = parseObject(ref);
          }
          return array;
        }
        case 13: {
          const { length, headerSize } = readLength(offset, nibble, "0xD: ");
          const dict: { [key: string]: PlistValue } = {};
          for (let i = 0; i < length; i++) {
            const keyRef = readInt(
              slice(
                data,
                offset + headerSize + i * objectRefSize,
                offset + headerSize + (i + 1) * objectRefSize,
              ),
            );
            const valueRef = readInt(
              slice(
                data,
                offset + headerSize + length * objectRefSize + i * objectRefSize,
                offset + headerSize + length * objectRefSize + (i + 1) * objectRefSize,
              ),
            );
            const key = parseObject(keyRef);
            const value = parseObject(valueRef);
            dict[key as string] = value;
          }
          return dict;
        }
        default:
          throw new Error("Unhandled type 0x" + type.toString(16));
      }
    };

    return parseObject(topObject);
  }
}
