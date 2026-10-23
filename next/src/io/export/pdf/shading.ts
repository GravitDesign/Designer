// Old: chunk.vendor.js module 1146 (the PDF shading base).
import type { PDFColorSpace } from "./color-spaces.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";

/** `<</ShadingType n/ColorSpace ...>>`. */
export class PDFShading extends PDFDictionary {
  static Type = { AXIAL: 2, RADIAL: 3 } as const;

  declare _hasTransparency: boolean;

  /**
   * Fills the dictionary; the gradient subclasses call it only once they
   * know their transform is usable (see PDFGradientShading).
   */
  _initShading(type: number, colorSpace: PDFColorSpace): void {
    this.put("/ShadingType", type);
    this.put("/ColorSpace", colorSpace.name);
  }

  hasTransparency(): boolean {
    return this._hasTransparency;
  }

  isValid(): boolean {
    return true;
  }
}

PDFShading.prototype._hasTransparency = false;
