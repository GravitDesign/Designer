// Old: chunk.vendor.js module 1419 (the PDF shading pattern).
import type { PDFGradientShading } from "./gradient-resource.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFConcatMatrix } from "./op-cm.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/**
 * `<</PatternType 2/Shading ref/Matrix [...]>>` with the shading's page
 * transform. (The old class was a GBaseObject mixing in the dictionary;
 * nothing tells the two apart.)
 */
export class PDFShadingPattern extends PDFDictionary {
  _shading: PDFIndirectObject<PDFGradientShading>;

  constructor(shading: PDFIndirectObject<PDFGradientShading>) {
    super();
    this._shading = shading;
    this.put("/PatternType", 2);
    this.put("/Shading", new PDFIndirectReference(shading));
    this.put(
      "/Matrix",
      new PDFConcatMatrix(
        shading.getPDFObject().transform as NonNullable<PDFGradientShading["transform"]>,
      ).asArray(),
    );
  }

  getShading(): PDFGradientShading {
    return this._shading.getPDFObject();
  }

  override equals(other: unknown): boolean {
    return other instanceof PDFShadingPattern && this._shading.equals(other._shading);
  }
}
