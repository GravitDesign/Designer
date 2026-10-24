// Old: designer.browser.dev.js module 1514 (zip.js v1 core, Gildas Lormeau).
//
// ZIP reading and writing with callbacks: readers (text, data URI, Blob),
// writers (text, data URI, Blob), createReader and createWriter. The
// multi-file export writes its ZIP through this (FMT-EXPORT-048).
//
// The old app set zip.useWebWorkers = false and never shipped the zip.js
// worker scripts (FMT-WORKER-015), so the worker code paths are left out:
// data always goes through the codec on the main thread in 512 KB chunks,
// with a setTimeout between chunks, as before.
//
// Every entry, stored or deflated, directories included, gets the flags
// 0x0808 (data descriptor and UTF-8 names) and local time; the method is
// 8 (deflate) unless the entry is stored (dontDeflate, level 0 or a
// directory).

import { Deflater, Inflater, type ZipCodec } from "./pako-codec.ts";

export type ErrorCallback = (error: unknown) => void;
type ProgressCallback = (loaded: number, total: number) => void;

const ERR_BAD_FORMAT = "File format is not recognized.";
const ERR_READ = "Error while reading zip file.";
const ERR_WRITE = "Error while writing zip file.";
const ERR_READ_DATA = "Error while reading file data.";
const ERR_WRITE_DATA = "Error while writing file data.";
const ERR_DUPLICATED_NAME = "File already exists.";
const ERR_ENCRYPTED = "File contains encrypted entry.";
const ERR_ZIP64 = "File is using Zip64 (4gb+ file size).";
const ERR_CRC = "CRC failed.";

const CHUNK_SIZE = 524288;

/** CP437 for bytes 128..255 of names without the UTF-8 flag (as zip.js maps them). */
const CP437 =
  "ÇüéâäàåçêëèïîìÄÅ" +
  "ÉæÆôöòûùÿÖÜø£Ø×ƒ" +
  "áíóúñÑªº¿®¬½¼¡«»" +
  "___¦¦ÁÂÀ©¦¦++¢¥++--+-+ãÃ++--¦-+¤" +
  "ðÐÊËÈiÍÎÏ++__¦Ì_ÓßÔÒõÕ" +
  "µþÞÚÛÙýÝ¯´­±_¾¶§÷¸" +
  "°¨·¹³²_ ";

/** The table zip.js uses to decode non-UTF-8 names (exposed for tests). */
export const CP437_TABLE = CP437;

class Crc32 {
  crc = -1;

  static readonly table: number[] = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        if (1 & c) c = (c >>> 1) ^ 3988292384;
        else c >>>= 1;
      }
      table[i] = c;
    }
    return table;
  })();

  append(data: Uint8Array): void {
    let crc = 0 | this.crc;
    const table = Crc32.table;
    for (let offset = 0, length = 0 | data.length; offset < length; offset++) {
      crc = (crc >>> 8) ^ (table[255 & (crc ^ (data[offset] as number))] as number);
    }
    this.crc = crc;
  }

  get(): number {
    return ~this.crc;
  }
}

/** The stored-entry codec: passes data through. */
class NoopCodec implements ZipCodec {
  append(data: Uint8Array): Uint8Array {
    return data;
  }

  flush(): Uint8Array | undefined {
    return undefined;
  }
}

interface DataHelper {
  buffer: ArrayBuffer;
  array: Uint8Array;
  view: DataView;
}

function getDataHelper(byteLength: number, bytes?: ArrayLike<number>): DataHelper {
  const buffer = new ArrayBuffer(byteLength);
  const array = new Uint8Array(buffer);
  if (bytes) array.set(bytes, 0);
  return { buffer, array, view: new DataView(buffer) };
}

// Readers

export abstract class Reader {
  size = 0;
  abstract init(callback: () => void, onerror: ErrorCallback): void;
  abstract readUint8Array(
    index: number,
    length: number,
    callback: (array: Uint8Array) => void,
    onerror: ErrorCallback,
  ): void;
}

function blobSlice(blob: Blob, index: number, length: number): Blob {
  if (index < 0 || length < 0 || index + length > blob.size) {
    throw new RangeError("offset:" + index + ", length:" + length + ", size:" + blob.size);
  }
  return blob.slice(index, index + length);
}

export class BlobReader extends Reader {
  constructor(private readonly blob: Blob) {
    super();
  }

  init(callback: () => void): void {
    this.size = this.blob.size;
    callback();
  }

  readUint8Array(
    index: number,
    length: number,
    callback: (array: Uint8Array) => void,
    onerror: ErrorCallback,
  ): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      callback(new Uint8Array((event.target as FileReader).result as ArrayBuffer));
    };
    reader.onerror = onerror;
    try {
      reader.readAsArrayBuffer(blobSlice(this.blob, index, length));
    } catch (error) {
      onerror(error);
    }
  }
}

export class TextReader extends Reader {
  private blobReader: BlobReader | null = null;

  constructor(private readonly text: string) {
    super();
  }

  init(callback: () => void, onerror: ErrorCallback): void {
    const blob = new Blob([this.text], { type: "text/plain" });
    this.blobReader = new BlobReader(blob);
    this.blobReader.init(() => {
      this.size = (this.blobReader as BlobReader).size;
      callback();
    });
    void onerror;
  }

  readUint8Array(
    index: number,
    length: number,
    callback: (array: Uint8Array) => void,
    onerror: ErrorCallback,
  ): void {
    (this.blobReader as BlobReader).readUint8Array(index, length, callback, onerror);
  }
}

export class Data64URIReader extends Reader {
  private dataStart = 0;

  constructor(private readonly dataURI: string) {
    super();
  }

  init(callback: () => void): void {
    let dataEnd = this.dataURI.length;
    while ("=" == this.dataURI.charAt(dataEnd - 1)) dataEnd--;
    this.dataStart = this.dataURI.indexOf(",") + 1;
    this.size = Math.floor(0.75 * (dataEnd - this.dataStart));
    callback();
  }

  readUint8Array(index: number, length: number, callback: (array: Uint8Array) => void): void {
    const data = getDataHelper(length);
    const start = 4 * Math.floor(index / 3);
    const end = 4 * Math.ceil((index + length) / 3);
    const bytes = atob(this.dataURI.substring(start + this.dataStart, end + this.dataStart));
    const delta = index - 3 * Math.floor(start / 4);
    for (let i = delta; i < delta + length; i++) data.array[i - delta] = bytes.charCodeAt(i);
    callback(data.array);
  }
}

// Writers

export abstract class Writer<T = unknown> {
  data: T | undefined;
  abstract init(callback: () => void, onerror?: ErrorCallback): void;
  abstract writeUint8Array(array: Uint8Array, callback: () => void, onerror?: ErrorCallback): void;
  getData(callback: (data: T) => void, onerror?: ErrorCallback): void {
    void onerror;
    callback(this.data as T);
  }
}

export class TextWriter extends Writer<string> {
  private blob: Blob = new Blob([], { type: "text/plain" });

  constructor(private readonly encoding?: string) {
    super();
  }

  init(callback: () => void): void {
    this.blob = new Blob([], { type: "text/plain" });
    callback();
  }

  writeUint8Array(array: Uint8Array, callback: () => void): void {
    this.blob = new Blob([this.blob, array as Uint8Array<ArrayBuffer>], { type: "text/plain" });
    callback();
  }

  override getData(callback: (data: string) => void, onerror?: ErrorCallback): void {
    const reader = new FileReader();
    reader.onload = (event) => {
      callback((event.target as FileReader).result as string);
    };
    if (onerror) reader.onerror = onerror;
    reader.readAsText(this.blob, this.encoding);
  }
}

export class Data64URIWriter extends Writer<string> {
  private uri = "";
  private pending = "";

  constructor(private readonly contentType?: string) {
    super();
  }

  init(callback: () => void): void {
    this.uri += "data:" + (this.contentType || "") + ";base64,";
    callback();
  }

  writeUint8Array(array: Uint8Array, callback: () => void): void {
    const pendingLength = this.pending.length;
    let bytes = this.pending;
    this.pending = "";
    let i: number;
    for (i = 0; i < 3 * Math.floor((pendingLength + array.length) / 3) - pendingLength; i++) {
      bytes += String.fromCharCode(array[i] as number);
    }
    for (; i < array.length; i++) this.pending += String.fromCharCode(array[i] as number);
    if (bytes.length > 2) this.uri += btoa(bytes);
    else this.pending = bytes;
    callback();
  }

  override getData(callback: (data: string) => void): void {
    callback(this.uri + btoa(this.pending));
  }
}

export class BlobWriter extends Writer<Blob> {
  private parts: Uint8Array<ArrayBuffer>[] = [];

  constructor(private readonly contentType?: string) {
    super();
  }

  init(callback: () => void): void {
    callback();
  }

  writeUint8Array(array: Uint8Array, callback: () => void): void {
    this.parts.push(array as Uint8Array<ArrayBuffer>);
    callback();
  }

  override getData(callback: (data: Blob) => void): void {
    callback(new Blob(this.parts, { type: this.contentType }));
  }
}

/**
 * Runs `size` bytes from `reader` (from `offset`) through `codec` into
 * `writer`, 512 KB at a time, with a CRC of the input or the output.
 */
function launchProcess(
  codec: ZipCodec,
  reader: Reader,
  writer: Writer,
  offset: number,
  size: number,
  crcType: "input" | "output" | "none",
  onprogress: ProgressCallback | null | undefined,
  onend: (outputSize: number, crc: number) => void,
  onreaderror: ErrorCallback,
  onwriteerror: ErrorCallback,
): void {
  let chunkIndex = 0;
  let outputSize = 0;
  const crcInput = "input" === crcType;
  const crcOutput = "output" === crcType;
  const crc = new Crc32();
  const step = (): void => {
    const index = CHUNK_SIZE * chunkIndex;
    if (index < size) {
      reader.readUint8Array(
        offset + index,
        Math.min(CHUNK_SIZE, size - index),
        (inputData) => {
          let outputData: Uint8Array | undefined;
          try {
            outputData = codec.append(inputData, (loaded) => {
              if (onprogress) onprogress(index + loaded, size);
            });
          } catch (error) {
            onreaderror(error);
            return;
          }
          if (outputData) {
            outputSize += outputData.length;
            writer.writeUint8Array(
              outputData,
              () => {
                chunkIndex++;
                setTimeout(step, 1);
              },
              onwriteerror,
            );
            if (crcOutput) crc.append(outputData);
          } else {
            chunkIndex++;
            setTimeout(step, 1);
          }
          if (crcInput) crc.append(inputData);
          if (onprogress) onprogress(index, size);
        },
        onreaderror,
      );
    } else {
      let outputData: Uint8Array | undefined;
      try {
        outputData = codec.flush();
      } catch (error) {
        onreaderror(error);
        return;
      }
      if (outputData) {
        if (crcOutput) crc.append(outputData);
        outputSize += outputData.length;
        writer.writeUint8Array(
          outputData,
          () => {
            onend(outputSize, crc.get());
          },
          onwriteerror,
        );
      } else onend(outputSize, crc.get());
    }
  };
  step();
}

function decodeASCII(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = 255 & text.charCodeAt(i);
    out += code > 127 ? (CP437[code - 128] as string) : String.fromCharCode(code);
  }
  return out;
}

function decodeUTF8(text: string): string {
  return decodeURIComponent(escape(text));
}

function encodeUTF8(text: string): string {
  return unescape(encodeURIComponent(text));
}

function getString(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i] as number);
  return out;
}

function getBytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
  return out;
}

/** The DOS date of a local file header or central directory entry, as a Date (local time). */
function getDate(timeRaw: number): Date | undefined {
  const date = (4294901760 & timeRaw) >> 16;
  const time = 65535 & timeRaw;
  try {
    return new Date(
      1980 + ((65024 & date) >> 9),
      ((480 & date) >> 5) - 1,
      31 & date,
      (63488 & time) >> 11,
      (2016 & time) >> 5,
      2 * (31 & time),
      0,
    );
  } catch {
    return undefined;
  }
}

/** An entry of a ZIP being read. */
export class ZipEntry {
  version = 0;
  bitFlag = 0;
  compressionMethod = 0;
  lastModDateRaw = 0;
  lastModDate: Date | undefined;
  crc32 = 0;
  compressedSize = 0;
  uncompressedSize = 0;
  filenameLength = 0;
  extraFieldLength = 0;
  commentLength = 0;
  directory = false;
  offset = 0;
  filename = "";
  comment = "";

  constructor(
    private readonly reader: Reader,
    private readonly onerror: ErrorCallback,
  ) {}

  /** Inflates (or copies) the entry into `writer`; checks the CRC with `checkCrc32`. */
  getData<T>(
    writer: Writer<T>,
    onend: (data: T) => void,
    onprogress?: ProgressCallback | null,
    checkCrc32?: boolean,
  ): void {
    const reader = this.reader;
    const onerror = this.onerror;
    const testCrc32 = (crc: number): boolean => {
      const data = getDataHelper(4);
      data.view.setUint32(0, crc);
      return this.crc32 == data.view.getUint32(0);
    };
    const getWriterData = (uncompressedSize: number, crc: number): void => {
      void uncompressedSize;
      if (checkCrc32 && !testCrc32(crc)) onerror(ERR_CRC);
      else {
        writer.getData((data) => {
          onend(data);
        });
      }
    };
    const onreaderror = (error?: unknown): void => {
      onerror(error || ERR_READ_DATA);
    };
    const onwriteerror = (error?: unknown): void => {
      onerror(error || ERR_WRITE_DATA);
    };
    reader.readUint8Array(
      this.offset,
      30,
      (bytes) => {
        const data = getDataHelper(bytes.length, bytes);
        if (1347093252 != data.view.getUint32(0)) {
          onerror(ERR_BAD_FORMAT);
          return;
        }
        readCommonHeader(this, data, 4, false, onerror);
        const dataOffset = this.offset + 30 + this.filenameLength + this.extraFieldLength;
        writer.init(() => {
          if (0 === this.compressionMethod) {
            launchProcess(
              new NoopCodec(),
              reader,
              writer,
              dataOffset,
              this.compressedSize,
              "input",
              onprogress,
              getWriterData,
              onreaderror,
              onwriteerror,
            );
          } else {
            launchProcess(
              new Inflater(),
              reader,
              writer,
              dataOffset,
              this.compressedSize,
              checkCrc32 ? "output" : "none",
              onprogress,
              getWriterData,
              onreaderror,
              onwriteerror,
            );
          }
        }, onwriteerror);
      },
      onreaderror,
    );
  }
}

function readCommonHeader(
  entry: ZipEntry,
  data: DataHelper,
  index: number,
  centralDirectory: boolean,
  onerror: ErrorCallback,
): void {
  entry.version = data.view.getUint16(index, true);
  entry.bitFlag = data.view.getUint16(index + 2, true);
  entry.compressionMethod = data.view.getUint16(index + 4, true);
  entry.lastModDateRaw = data.view.getUint32(index + 6, true);
  entry.lastModDate = getDate(entry.lastModDateRaw);
  if (1 == (1 & entry.bitFlag)) {
    onerror(ERR_ENCRYPTED);
    return;
  }
  if (centralDirectory || 8 != (8 & entry.bitFlag)) {
    entry.crc32 = data.view.getUint32(index + 10, true);
    entry.compressedSize = data.view.getUint32(index + 14, true);
    entry.uncompressedSize = data.view.getUint32(index + 18, true);
  }
  if (4294967295 === entry.compressedSize || 4294967295 === entry.uncompressedSize) {
    onerror(ERR_ZIP64);
    return;
  }
  entry.filenameLength = data.view.getUint16(index + 22, true);
  entry.extraFieldLength = data.view.getUint16(index + 24, true);
}

export interface ZipReader {
  getEntries(callback: (entries: ZipEntry[]) => void): void;
  close(callback?: () => void): void;
}

function createZipReader(
  reader: Reader,
  callback: (zipReader: ZipReader) => void,
  onerror: ErrorCallback,
): void {
  const seekEOCDR = (eocdrCallback: (view: DataView) => void): void => {
    const doSeek = (length: number, eocdrNotFound: () => void): void => {
      reader.readUint8Array(
        reader.size - length,
        length,
        (bytes) => {
          for (let i = bytes.length - 22; i >= 0; i--) {
            if (
              80 === bytes[i] &&
              75 === bytes[i + 1] &&
              5 === bytes[i + 2] &&
              6 === bytes[i + 3]
            ) {
              eocdrCallback(new DataView(bytes.buffer, i, 22));
              return;
            }
          }
          eocdrNotFound();
        },
        () => {
          onerror(ERR_READ);
        },
      );
    };
    // The end of central directory record is 22 bytes, plus up to 64 KB of comment.
    if (reader.size < 22) onerror(ERR_BAD_FORMAT);
    else {
      doSeek(22, () => {
        doSeek(Math.min(65558, reader.size), () => {
          onerror(ERR_BAD_FORMAT);
        });
      });
    }
  };
  const zipReader: ZipReader = {
    getEntries(entriesCallback) {
      seekEOCDR((eocdr) => {
        const dataLength = eocdr.getUint32(16, true);
        const fileslength = eocdr.getUint16(8, true);
        if (dataLength < 0 || dataLength >= reader.size) {
          onerror(ERR_BAD_FORMAT);
          return;
        }
        reader.readUint8Array(
          dataLength,
          reader.size - dataLength,
          (bytes) => {
            let index = 0;
            const entries: ZipEntry[] = [];
            const data = getDataHelper(bytes.length, bytes);
            for (let i = 0; i < fileslength; i++) {
              const entry = new ZipEntry(reader, onerror);
              if (1347092738 != data.view.getUint32(index)) {
                onerror(ERR_BAD_FORMAT);
                return;
              }
              readCommonHeader(entry, data, index + 6, true, onerror);
              entry.commentLength = data.view.getUint16(index + 32, true);
              entry.directory = 16 == (16 & data.view.getUint8(index + 38));
              entry.offset = data.view.getUint32(index + 42, true);
              const filename = getString(
                data.array.subarray(index + 46, index + 46 + entry.filenameLength),
              );
              entry.filename =
                2048 == (2048 & entry.bitFlag) ? decodeUTF8(filename) : decodeASCII(filename);
              if (!entry.directory && "/" == entry.filename.charAt(entry.filename.length - 1)) {
                entry.directory = true;
              }
              const comment = getString(
                data.array.subarray(
                  index + 46 + entry.filenameLength + entry.extraFieldLength,
                  index + 46 + entry.filenameLength + entry.extraFieldLength + entry.commentLength,
                ),
              );
              entry.comment =
                2048 == (2048 & entry.bitFlag) ? decodeUTF8(comment) : decodeASCII(comment);
              entries.push(entry);
              index += 46 + entry.filenameLength + entry.extraFieldLength + entry.commentLength;
            }
            entriesCallback(entries);
          },
          () => {
            onerror(ERR_READ);
          },
        );
      });
    },
    close(closeCallback) {
      if (closeCallback) closeCallback();
    },
  };
  callback(zipReader);
}

export interface ZipAddOptions {
  directory?: boolean;
  level?: number;
  version?: number;
  lastModDate?: Date;
  comment?: string;
}

export interface ZipWriter {
  add(
    name: string,
    reader: Reader | null | undefined,
    onend: () => void,
    onprogress?: ProgressCallback | null,
    options?: ZipAddOptions,
  ): void;
  close(callback: (data: unknown) => void): void;
}

interface WrittenFile {
  headerArray: Uint8Array;
  directory: boolean | undefined;
  filename: number[];
  offset: number;
  comment: number[];
}

function createZipWriter(
  writer: Writer,
  callback: (zipWriter: ZipWriter) => void,
  onerror: ErrorCallback,
  dontDeflate: boolean,
): void {
  const files: Record<string, WrittenFile> = {};
  const filenames: string[] = [];
  let datalength = 0;
  const onwriteerror = (error?: unknown): void => {
    onerror(error || ERR_WRITE);
  };
  const onreaderror = (error?: unknown): void => {
    onerror(error || ERR_READ_DATA);
  };
  const zipWriter: ZipWriter = {
    add(name, reader, onend, onprogress, options) {
      let header: DataHelper;
      let filename: number[];
      const writeHeader = (headerCallback: () => void): void => {
        const opts = options as ZipAddOptions;
        const date = opts.lastModDate || new Date();
        header = getDataHelper(26);
        files[name] = {
          headerArray: header.array,
          directory: opts.directory,
          filename,
          offset: datalength,
          comment: getBytes(encodeUTF8(opts.comment || "")),
        };
        // Version 20, flags 0x0808 (data descriptor, UTF-8 names), big-endian write.
        header.view.setUint32(0, 335546376);
        if (opts.version) header.view.setUint8(0, opts.version);
        if (!dontDeflate && 0 !== opts.level && !opts.directory) header.view.setUint16(4, 2048);
        header.view.setUint16(
          6,
          (((date.getHours() << 6) | date.getMinutes()) << 5) | (date.getSeconds() / 2),
          true,
        );
        header.view.setUint16(
          8,
          ((((date.getFullYear() - 1980) << 4) | (date.getMonth() + 1)) << 5) | date.getDate(),
          true,
        );
        header.view.setUint16(22, filename.length, true);
        const data = getDataHelper(30 + filename.length);
        data.view.setUint32(0, 1347093252);
        data.array.set(header.array, 4);
        data.array.set(filename, 30);
        datalength += data.array.length;
        writer.writeUint8Array(data.array, headerCallback, onwriteerror);
      };
      const writeFooter = (compressedLength?: number, crc32?: number): void => {
        const footer = getDataHelper(16);
        datalength += compressedLength || 0;
        footer.view.setUint32(0, 1347094280);
        if (undefined !== crc32) {
          header.view.setUint32(10, crc32, true);
          footer.view.setUint32(4, crc32, true);
        }
        if (reader) {
          footer.view.setUint32(8, compressedLength as number, true);
          header.view.setUint32(14, compressedLength as number, true);
          footer.view.setUint32(12, reader.size, true);
          header.view.setUint32(18, reader.size, true);
        }
        writer.writeUint8Array(
          footer.array,
          () => {
            datalength += 16;
            onend();
          },
          onwriteerror,
        );
      };
      const writeFile = (): void => {
        options = options || {};
        name = name.trim();
        if (options.directory && "/" != name.charAt(name.length - 1)) name += "/";
        if (Object.prototype.hasOwnProperty.call(files, name)) {
          onerror(ERR_DUPLICATED_NAME);
          return;
        }
        filename = getBytes(encodeUTF8(name));
        filenames.push(name);
        writeHeader(() => {
          if (reader) {
            if (dontDeflate || 0 === (options as ZipAddOptions).level) {
              launchProcess(
                new NoopCodec(),
                reader,
                writer,
                0,
                reader.size,
                "input",
                onprogress,
                writeFooter,
                onreaderror,
                onwriteerror,
              );
            } else {
              // Without workers the level never reaches the codec: pako's default.
              launchProcess(
                new Deflater(),
                reader,
                writer,
                0,
                reader.size,
                "input",
                onprogress,
                writeFooter,
                onreaderror,
                onwriteerror,
              );
            }
          } else writeFooter();
        });
      };
      if (reader) reader.init(writeFile, onreaderror);
      else writeFile();
    },
    close(closeCallback) {
      let length = 0;
      let index = 0;
      for (const name of filenames) {
        const file = files[name] as WrittenFile;
        length += 46 + file.filename.length + file.comment.length;
      }
      const data = getDataHelper(length + 22);
      for (const name of filenames) {
        const file = files[name] as WrittenFile;
        data.view.setUint32(index, 1347092738);
        // Version made by 20 (big-endian write of 0x1400).
        data.view.setUint16(index + 4, 5120);
        data.array.set(file.headerArray, index + 6);
        data.view.setUint16(index + 32, file.comment.length, true);
        if (file.directory) data.view.setUint8(index + 38, 16);
        data.view.setUint32(index + 42, file.offset, true);
        data.array.set(file.filename, index + 46);
        data.array.set(file.comment, index + 46 + file.filename.length);
        index += 46 + file.filename.length + file.comment.length;
      }
      data.view.setUint32(index, 1347093766);
      data.view.setUint16(index + 8, filenames.length, true);
      data.view.setUint16(index + 10, filenames.length, true);
      data.view.setUint32(index + 12, length, true);
      data.view.setUint32(index + 16, datalength, true);
      writer.writeUint8Array(
        data.array,
        () => {
          writer.getData(closeCallback);
        },
        onwriteerror,
      );
    },
  };
  callback(zipWriter);
}

function logError(error: unknown): void {
  console.error(error);
}

/** The old global `zip` object (without the worker settings). */
export const zip = {
  Reader,
  Writer,
  BlobReader,
  Data64URIReader,
  TextReader,
  BlobWriter,
  Data64URIWriter,
  TextWriter,
  Deflater,
  Inflater,
  createReader(
    reader: Reader,
    callback: (zipReader: ZipReader) => void,
    onerror?: ErrorCallback,
  ): void {
    const onError = onerror || logError;
    reader.init(() => {
      createZipReader(reader, callback, onError);
    }, onError);
  },
  createWriter(
    writer: Writer,
    callback: (zipWriter: ZipWriter) => void,
    onerror?: ErrorCallback,
    dontDeflate?: boolean,
  ): void {
    const onError = onerror || logError;
    writer.init(() => {
      createZipWriter(writer, callback, onError, !!dontDeflate);
    }, onError);
  },
};
