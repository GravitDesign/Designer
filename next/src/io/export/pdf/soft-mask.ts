// Old: chunk.vendor.js module 1413 (the PDF soft mask).
import { PDFDictionary } from "./pdf-dictionary.ts";

export interface SoftMaskOptions {
  subType?: string;
  stream?: unknown;
}

/** `<</Type /Mask/S /Luminosity/G form>>`. */
export class PDFSoftMask extends PDFDictionary {
  static SubType = { ALPHA: "Alpha", LUMINOSITY: "Luminosity" } as const;

  constructor(options: SoftMaskOptions) {
    super();
    if (!options.subType) throw "GPDFSoftMask.SubType is required";
    if (!options.stream) throw "GPDFStream is required";
    this.put("/Type", "/Mask");
    this.put("/S", "/" + options.subType);
    this.put("/G", options.stream);
  }
}
