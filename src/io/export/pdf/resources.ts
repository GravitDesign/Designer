// Old: chunk.vendor.js module 1438 (the PDF page resources).
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFResourceGroup, type PDFResource, type PDFResourceType } from "./resource.ts";

/** A page's resource dictionary, one group per kind, created on first use. */
export class PDFResources extends PDFDictionary {
  add<T extends PDFObject>(
    type: PDFResourceType,
    resource: PDFResource<T> | PDFIndirectReference<T>,
  ): PDFResource<T> {
    return this.getGroup(type).add(resource);
  }

  getGroup(type: PDFResourceType): PDFResourceGroup {
    let group = this.get("/" + type.name) as PDFResourceGroup | null;
    if (!group) {
      group = new PDFResourceGroup(type);
      this.put("/" + type.name, group);
    }
    return group;
  }
}
