// Old: chunk.vendor.js module 1141 (sketchdocument).
import type { SketchMetaData } from "./sketch-data.ts";
import { SketchParser } from "./sketch-parser.ts";

/** meta.json: the Sketch version that saved the file. */
export class SketchDocument extends SketchParser<SketchMetaData> {
  declare version: number | null;

  override parse(): void {
    this.version = parseFloat(this._data.appVersion as string);
  }
}

SketchDocument.prototype.version = null;
