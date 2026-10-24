// Old: chunk.vendor.js module 1450 (GPDFInvokeResource).
import { PDFObject } from "./pdf-object.ts";
import { PDFOperators } from "./operators.ts";
import type { PDFOutput } from "./output.ts";
import type { PDFResource } from "./resource.ts";

/** `/name Do`: draws an XObject resource. */
export class PDFInvokeResource extends PDFObject {
  declare _resource: PDFResource | null;

  constructor(resource: PDFResource) {
    super();
    this._resource = resource;
  }

  override write(output: PDFOutput): void {
    output.write("/" + (this._resource as PDFResource).getName() + " " + PDFOperators.Do);
  }

  override toString(): string {
    return "[Object GPDFInvokeResource]";
  }
}

PDFInvokeResource.prototype._resource = null;
