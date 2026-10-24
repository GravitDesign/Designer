// Old: designer.browser.dev.js module 1515 (zip.js v1 zip-fs.js).
//
// An in-memory file tree that exports to (or imports from) a ZIP. The
// export dialog's ZipDirectory builds one per multi-file export and calls
// exportBlob (FMT-EXPORT-048).
//
// Left out: the FileSystem API helpers (addFileEntry, getFileEntry,
// exportFileEntry). The last two used zip.FileWriter, which the old app
// didn't ship, so they threw; nothing called any of them.

import type { Writer } from "./zip.ts";
import {
  BlobReader,
  BlobWriter,
  Data64URIReader,
  Data64URIWriter,
  Reader,
  TextReader,
  TextWriter,
  zip,
  type ErrorCallback,
  type ZipEntry,
  type ZipWriter,
} from "./zip.ts";

type ProgressCallback = (loaded: number, total: number) => void;

type ReaderClass = new (data: never, onerror?: ErrorCallback) => Reader;
type WriterClass = abstract new (...args: never[]) => Writer;

/** What a file entry is made from: its data and how to read (and write) it. */
export interface ZipEntryParams {
  data?: unknown;
  Reader?: ReaderClass;
  Writer?: WriterClass;
  zipVersion?: number;
  getData?: ZipFileEntry["getData"];
}

/** Reads an entry of an imported ZIP: inflates it into a Blob on first read. */
class ZipBlobReader extends Reader {
  checkCrc32 = false;
  data: Blob | undefined;
  private blobReader: BlobReader | null = null;

  constructor(private readonly entry: ZipEntry) {
    super();
  }

  init(callback: () => void): void {
    this.size = this.entry.uncompressedSize;
    callback();
  }

  readUint8Array(
    index: number,
    length: number,
    callback: (array: Uint8Array) => void,
    onerror: ErrorCallback,
  ): void {
    const read = (): void => {
      (this.blobReader as BlobReader).readUint8Array(index, length, callback, onerror);
    };
    if (this.data) read();
    else {
      this.entry.getData(
        new BlobWriter(),
        (blob) => {
          this.data = blob;
          this.blobReader = new BlobReader(blob);
          read();
        },
        null,
        this.checkCrc32,
      );
    }
  }
}

function getTotalSize(entry: ZipEntryBase): number {
  let size = 0;
  const process = (child: ZipEntryBase): void => {
    size += child.uncompressedSize || 0;
    child.children.forEach(process);
  };
  process(entry);
  return size;
}

/** Makes a reader for every file below `entry` and stores the file sizes. */
function initReaders(entry: ZipEntryBase, onend: () => void, onerror: ErrorCallback): void {
  let index = 0;
  const next = (): void => {
    index++;
    if (index < entry.children.length) process(entry.children[index] as ZipEntryBase);
    else onend();
  };
  const process = (child: ZipEntryBase): void => {
    if (child.directory) initReaders(child, next, onerror);
    else {
      const file = child as ZipFileEntry;
      const ReaderType = file.Reader as ReaderClass;
      file.reader = new ReaderType(file.data as never, onerror);
      file.reader.init(() => {
        file.uncompressedSize = (file.reader as Reader).size;
        next();
      }, onerror);
    }
  };
  if (entry.children.length) process(entry.children[index] as ZipEntryBase);
  else onend();
}

function detach(entry: ZipEntryBase): void {
  const children = (entry.parent as ZipEntryBase).children;
  children.forEach((child, index) => {
    if (child.id == entry.id) children.splice(index, 1);
  });
}

function exportEntries(
  zipWriter: ZipWriter,
  entry: ZipEntryBase,
  onend: () => void,
  onprogress: ProgressCallback | null | undefined,
  totalSize: number,
): void {
  let currentIndex = 0;
  const process = (parent: ZipEntryBase, done: () => void): void => {
    let childIndex = 0;
    const exportChild = (): void => {
      const child = parent.children[childIndex];
      if (!child) {
        done();
        return;
      }
      zipWriter.add(
        child.getFullname(),
        (child as ZipFileEntry).reader,
        () => {
          currentIndex += child.uncompressedSize || 0;
          process(child, () => {
            childIndex++;
            exportChild();
          });
        },
        (index) => {
          if (onprogress) onprogress(currentIndex + index, totalSize);
        },
        { directory: child.directory, version: child.zipVersion },
      );
    };
    exportChild();
  };
  process(entry, onend);
}

function addChild(
  parent: ZipEntryBase,
  name: string,
  params: ZipEntryParams | null,
  directory?: boolean,
): ZipEntryBase {
  if (parent.directory) {
    return directory
      ? new ZipDirectoryEntry(parent.fs, name, params, parent)
      : new ZipFileEntry(parent.fs, name, params, parent);
  }
  throw "Parent entry is not a directory.";
}

abstract class ZipEntryBase {
  fs: FS;
  name: string | undefined;
  id: number;
  parent: ZipEntryBase | undefined;
  children: ZipEntryBase[];
  zipVersion: number;
  uncompressedSize: number;
  directory = false;

  constructor(
    fs: FS,
    name: string | undefined,
    params: ZipEntryParams | null,
    parent?: ZipEntryBase,
  ) {
    if (fs.root && parent && parent.getChildByName(name as string)) {
      throw "Entry filename already exists.";
    }
    if (!params) params = {};
    this.fs = fs;
    this.name = name;
    this.id = fs.entries.length;
    this.parent = parent;
    this.children = [];
    this.zipVersion = params.zipVersion || 20;
    this.uncompressedSize = 0;
    fs.entries.push(this);
    if (parent) parent.children.push(this);
  }

  moveTo(target: ZipEntryBase): void {
    if (!target.directory) throw "Target entry is not a directory.";
    if (target.isDescendantOf(this)) throw "Entry is a ancestor of target entry.";
    if (this != target) {
      if (target.getChildByName(this.name as string)) throw "Entry filename already exists.";
      detach(this);
      this.parent = target;
      target.children.push(this);
    }
  }

  /** The path from the root, "/"-separated (the root's own name is undefined). */
  getFullname(): string {
    let fullname = this.name as string;
    let entry = this.parent;
    while (entry) {
      fullname = (entry.name ? entry.name + "/" : "") + fullname;
      entry = entry.parent;
    }
    return fullname;
  }

  isDescendantOf(ancestor: ZipEntryBase): boolean {
    let entry = this.parent;
    while (entry && entry.id != ancestor.id) entry = entry.parent;
    return !!entry;
  }

  getChildByName(name: string): ZipEntryBase | undefined {
    for (const child of this.children) if (child.name == name) return child;
    return undefined;
  }
}

export class ZipFileEntry extends ZipEntryBase {
  Reader: ReaderClass | undefined;
  Writer: WriterClass | undefined;
  data: unknown;
  reader: Reader | undefined;

  constructor(
    fs: FS,
    name: string | undefined,
    params: ZipEntryParams | null,
    parent?: ZipEntryBase,
  ) {
    super(fs, name, params, parent);
    // The old constructor read params.Reader without a default (init's
    // `params || {}` only replaced init's own copy), so a missing params
    // threw this TypeError after the entry had joined fs.entries and its
    // parent's children. Nothing in the app adds an entry without params.
    if (!params) {
      throw new TypeError("Cannot read properties of " + String(params) + " (reading 'Reader')");
    }
    this.Reader = params.Reader;
    this.Writer = params.Writer;
    this.data = params.data;
    if (params.getData) this.getData = params.getData;
  }

  /**
   * The entry's content through `writer` (as is when the writer type
   * matches what was added).
   */
  getData<T>(
    writer: Writer<T> | null | undefined,
    onend: (data: T) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    if (!writer || (writer.constructor == this.Writer && this.data)) {
      onend(this.data as T);
      return;
    }
    if (!this.reader) {
      const ReaderType = this.Reader as ReaderClass;
      this.reader = new ReaderType(this.data as never, onerror);
    }
    const reader = this.reader;
    reader.init(() => {
      writer.init(() => {
        bufferedCopy(reader, writer, onend, onprogress, onerror);
      }, onerror);
    }, onerror as ErrorCallback);
  }

  getText(
    onend: (text: string) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
    encoding?: string,
  ): void {
    this.getData(new TextWriter(encoding), onend, onprogress, onerror);
  }

  getBlob(
    mimeType: string | undefined,
    onend: (blob: Blob) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.getData(new BlobWriter(mimeType), onend, onprogress, onerror);
  }

  getData64URI(
    mimeType: string | undefined,
    onend: (uri: string) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.getData(new Data64URIWriter(mimeType), onend, onprogress, onerror);
  }
}

function bufferedCopy<T>(
  reader: Reader,
  writer: Writer<T>,
  onend: (data: T) => void,
  onprogress: ProgressCallback | null | undefined,
  onerror: ErrorCallback | undefined,
): void {
  let chunkIndex = 0;
  const step = (): void => {
    const index = 524288 * chunkIndex;
    if (onprogress) onprogress(index, reader.size);
    if (index < reader.size) {
      reader.readUint8Array(
        index,
        Math.min(524288, reader.size - index),
        (array) => {
          writer.writeUint8Array(new Uint8Array(array), () => {
            chunkIndex++;
            step();
          });
        },
        onerror as ErrorCallback,
      );
    } else writer.getData(onend);
  };
  step();
}

export class ZipDirectoryEntry extends ZipEntryBase {
  constructor(
    fs: FS,
    name: string | undefined,
    params: ZipEntryParams | null,
    parent?: ZipEntryBase,
  ) {
    super(fs, name, params, parent);
    this.directory = true;
  }

  addDirectory(name: string): ZipDirectoryEntry {
    return addChild(this, name, null, true) as ZipDirectoryEntry;
  }

  addText(name: string, text: string): ZipFileEntry {
    return addChild(this, name, {
      data: text,
      Reader: TextReader,
      Writer: TextWriter,
    }) as ZipFileEntry;
  }

  addBlob(name: string, blob: Blob): ZipFileEntry {
    return addChild(this, name, {
      data: blob,
      Reader: BlobReader,
      Writer: BlobWriter,
    }) as ZipFileEntry;
  }

  addData64URI(name: string, dataURI: string): ZipFileEntry {
    return addChild(this, name, {
      data: dataURI,
      Reader: Data64URIReader,
      Writer: Data64URIWriter,
    }) as ZipFileEntry;
  }

  addData(name: string, params: ZipEntryParams): ZipFileEntry {
    return addChild(this, name, params) as ZipFileEntry;
  }

  importBlob(blob: Blob, onend: () => void, onerror?: ErrorCallback): void {
    this.importZip(new BlobReader(blob), onend, onerror);
  }

  importText(text: string, onend: () => void, onerror?: ErrorCallback): void {
    this.importZip(new TextReader(text), onend, onerror);
  }

  importData64URI(dataURI: string, onend: () => void, onerror?: ErrorCallback): void {
    this.importZip(new Data64URIReader(dataURI), onend, onerror);
  }

  exportBlob(
    onend: (blob: Blob) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.exportZip(
      new BlobWriter("application/zip"),
      onend as (data: unknown) => void,
      onprogress,
      onerror,
    );
  }

  exportText(
    onend: (text: string) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.exportZip(new TextWriter(), onend as (data: unknown) => void, onprogress, onerror);
  }

  exportData64URI(
    onend: (uri: string) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.exportZip(
      new Data64URIWriter("application/zip"),
      onend as (data: unknown) => void,
      onprogress,
      onerror,
    );
  }

  importZip(reader: Reader, onend: () => void, onerror?: ErrorCallback): void {
    zip.createReader(
      reader,
      (zipReader) => {
        zipReader.getEntries((entries) => {
          entries.forEach((entry) => {
            // eslint-disable-next-line @typescript-eslint/no-this-alias -- the walk starts at this directory
            let parent: ZipEntryBase = this;
            const path = entry.filename.split("/");
            const name = path.pop() as string;
            path.forEach((pathPart) => {
              parent =
                parent.getChildByName(pathPart) ||
                new ZipDirectoryEntry(this.fs, pathPart, null, parent);
            });
            if (!entry.directory) {
              addChild(parent, name, {
                data: entry,
                Reader: ZipBlobReader as unknown as ReaderClass,
              });
            }
          });
          onend();
        });
      },
      onerror,
    );
  }

  exportZip(
    writer: Writer,
    onend: (data: unknown) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    initReaders(
      this,
      () => {
        zip.createWriter(
          writer,
          (zipWriter) => {
            exportEntries(
              zipWriter,
              this,
              () => {
                zipWriter.close(onend);
              },
              onprogress,
              getTotalSize(this),
            );
          },
          onerror,
        );
      },
      onerror as ErrorCallback,
    );
  }
}

function resetFS(fs: FS): void {
  fs.entries = [];
  fs.root = new ZipDirectoryEntry(fs, undefined, null);
}

/** zip.fs.FS: the tree, by id in `entries`, from `root`. */
export class FS {
  entries: (ZipEntryBase | null)[] = [];
  root!: ZipDirectoryEntry;

  constructor() {
    resetFS(this);
  }

  remove(entry: ZipEntryBase): void {
    detach(entry);
    this.entries[entry.id] = null;
  }

  find(fullname: string): ZipEntryBase | undefined {
    const path = fullname.split("/");
    let entry: ZipEntryBase | undefined = this.root;
    for (let i = 0; entry && i < path.length; i++) entry = entry.getChildByName(path[i] as string);
    return entry;
  }

  getById(id: number): ZipEntryBase | null | undefined {
    return this.entries[id];
  }

  importBlob(blob: Blob, onend: () => void, onerror?: ErrorCallback): void {
    resetFS(this);
    this.root.importBlob(blob, onend, onerror);
  }

  importText(text: string, onend: () => void, onerror?: ErrorCallback): void {
    resetFS(this);
    this.root.importText(text, onend, onerror);
  }

  importData64URI(dataURI: string, onend: () => void, onerror?: ErrorCallback): void {
    resetFS(this);
    this.root.importData64URI(dataURI, onend, onerror);
  }

  exportBlob(
    onend: (blob: Blob) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.root.exportBlob(onend, onprogress, onerror);
  }

  exportText(
    onend: (text: string) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.root.exportText(onend, onprogress, onerror);
  }

  exportData64URI(
    onend: (uri: string) => void,
    onprogress?: ProgressCallback | null,
    onerror?: ErrorCallback,
  ): void {
    this.root.exportData64URI(onend, onprogress, onerror);
  }
}

export type { ZipEntryBase };

/** zip.getMimeType: every entry is application/octet-stream. */
export function getMimeType(): string {
  return "application/octet-stream";
}
