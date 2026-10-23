// Old: chunk.vendor.js module 1229 (the PDF pattern color space selection).
import type { PDFGradientShading } from "./gradient-resource.ts";
import { OPERATIONFLAG_STROKE } from "./operation-flags.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";
import type { PDFResource } from "./resource.ts";
import type { PDFShadingPattern } from "./shading-pattern.ts";

/** `/Pattern cs /Pn` (CS for strokes); `scn` follows from the paint style. */
export class PDFPatternSelection extends PDFObject {
  _operation: number;
  resource: PDFResource<PDFShadingPattern>;

  constructor(resource: PDFResource<PDFShadingPattern>, operation: number) {
    super();
    this._operation = operation;
    this.resource = resource;
  }

  getShading(): PDFGradientShading {
    return this.resource.getPDFObject().getShading();
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof PDFPatternSelection &&
      this.resource.getPDFObject().equals(other.resource.getPDFObject())
    );
  }

  override write(output: PDFOutput): void {
    output.write("/Pattern");
    output.writeSpace();
    output.write(this._operation & OPERATIONFLAG_STROKE ? "CS" : "cs");
    output.writeSpace();
    output.write("/");
    output.write(this.resource.getName());
  }
}
