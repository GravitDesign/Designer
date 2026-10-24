// Old: chunk.vendor.js module 562 (sketchparser).
import type { SketchFile } from "./sketch-file.ts";

/** The base of every importer object: the JSON it reads and the file it came from. */
export class SketchParser<D = unknown> {
  declare _data: D;
  declare _file: SketchFile;

  // Effects are made without a file (`new SketchBlurEffect(data)`).
  constructor(data: D, file?: SketchFile) {
    this._data = data;
    this._file = file as SketchFile;
  }

  /** A shallow copy that shares the data and the file. */
  clone(): this {
    const copy = Object.create(Object.getPrototypeOf(this) as object) as this;
    copy._data = this._data;
    copy._file = this._file;
    return copy;
  }

  parse(...args: unknown[]): void {
    void args;
    throw new Error("Not implemented");
  }

  _getReference(name: string): Promise<Blob> {
    return this._file.getReference(name);
  }
}
