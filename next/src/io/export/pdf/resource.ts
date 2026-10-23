// Old: chunk.vendor.js module 799 (the PDF resource and resource group).
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFObject } from "./pdf-object.ts";

/** One kind of resource: its dictionary name and the prefix of its entries. */
export interface PDFResourceType {
  name: string;
  prefix: string;
}

const Types = {
  FONT: { name: "Font", prefix: "F" },
  PATTERN: { name: "Pattern", prefix: "P" },
  GSTATE: { name: "ExtGState", prefix: "GS" },
  XOBJECT: { name: "XObject", prefix: "xobj" },
} as const satisfies Record<string, PDFResourceType>;

/** A named reference in a page's resources (`/P1 5 0 R`). */
export class PDFResource<T extends PDFObject = PDFObject> {
  _name: string;
  _indirectReference: PDFIndirectReference<T>;

  constructor(name: string, reference: PDFIndirectReference<T>) {
    this._name = name;
    this._indirectReference = reference;
  }

  getName(): string {
    return this._name;
  }

  getPDFIndirectReference(): PDFIndirectReference<T> {
    return this._indirectReference;
  }

  getPDFObject(): T {
    return this.getPDFIndirectReference().getPDFObject();
  }

  declare static Group: typeof PDFResourceGroup;
}

/**
 * The resources of one kind (`/Font <</F1 ...>>`). A plain reference
 * added to it is named by the prefix and the entry count.
 */
export class PDFResourceGroup extends PDFDictionary {
  _type: PDFResourceType;

  static Types = Types;

  constructor(type: PDFResourceType) {
    super();
    this._type = type;
  }

  getName(): string {
    return this._type.name;
  }

  add<T extends PDFObject>(resource: PDFResource<T> | PDFIndirectReference<T>): PDFResource<T> {
    if (resource instanceof PDFIndirectReference) {
      resource = new PDFResource(this._type.prefix + (this.length() + 1), resource);
    }
    if (!(resource instanceof PDFResource)) throw "Invalid PDF Resource: " + String(resource);
    this.put("/" + resource.getName(), resource.getPDFIndirectReference());
    return resource;
  }
}

PDFResource.Group = PDFResourceGroup;
