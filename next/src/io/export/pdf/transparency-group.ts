// Old: chunk.vendor.js module 1414 (the PDF transparency group form).
import { PDFGroup } from "./group.ts";
import type { PDFArray } from "./pdf-array.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFFormXObject } from "./xobject.ts";

/** A form XObject drawing a content stream as a transparency group. */
export class PDFTransparencyGroup extends PDFFormXObject {
  constructor(content: PDFObject & { getDocument(): unknown }, bbox: PDFArray) {
    super(content.getDocument(), content, new PDFGroup(), bbox);
  }
}
