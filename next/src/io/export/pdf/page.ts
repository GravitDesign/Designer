// Old: chunk.vendor.js module 1439 (the PDF page).
import { Point } from "../../../engine/math/point.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFMediaBox } from "./media-box.ts";
import { PDFConcatMatrix } from "./op-cm.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFObject } from "./pdf-object.ts";
import type { PDFPageContents } from "./object-store.ts";
import type { PDFResource, PDFResourceType } from "./resource.ts";
import type { PDFResources } from "./resources.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/** A page: its contents, resources and boxes, and the page origin of its drawing. */
export class PDFPage extends PDFDictionary {
  contents: PDFIndirectObject<PDFPageContents>;
  resources: PDFIndirectObject<PDFResources>;
  declare _origin: Point;
  lastObject: unknown;

  constructor(
    contents: PDFIndirectObject<PDFPageContents>,
    resources: PDFIndirectObject<PDFResources>,
    width: number,
    height: number,
  ) {
    super();
    this.contents = contents;
    this.resources = resources;
    this._origin = new Point(0, 0);
    this.put("/Type", "/Page");
    this.put("/Contents", new PDFIndirectReference(contents));
    this.put("/Resources", new PDFIndirectReference(resources));
    this.put("/MediaBox", new PDFMediaBox(0, 0, width, height));
    this.lastObject = null;
  }

  setBleedBox(box: Rect): void {
    this.put("/BleedBox", new PDFMediaBox(box.getX(), box.getY(), box.getWidth(), box.getHeight()));
  }

  /** Moves the drawing by `origin`: a `cm` in front of everything on the page. */
  setPageOrigin(origin: Point): void {
    this._origin = origin;
    const transform = new Transform().translated(origin.getX(), origin.getY());
    this.add(new PDFConcatMatrix(transform), 0);
  }

  getPageOrigin(): Point {
    return this._origin;
  }

  add(object: unknown, index?: number | null): void {
    this.lastObject = object;
    this.contents.getPDFObject().add(object, index);
  }

  getPageSize(): PDFMediaBox {
    return this.get("/MediaBox") as PDFMediaBox;
  }

  getResources(): PDFResources {
    return this.resources.getPDFObject();
  }

  addResource<T extends PDFObject>(
    type: PDFResourceType,
    resource: PDFResource<T> | PDFIndirectReference<T>,
  ): void {
    this.getResources().add(type, resource);
  }

  getContents(): PDFPageContents {
    return this.contents.getPDFObject();
  }
}
