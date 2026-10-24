// Old: chunk.vendor.js module 1423 (the PDF document body).
import { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import type { Point } from "../../../engine/math/point.ts";
import type { PDFFontDocument } from "./cid-font-type.ts";
import { PDFFontFactory } from "./font-factory.ts";
import { PDFFontResource } from "./font-resource.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFInfo } from "./info.ts";
import type { PDFMediaBox } from "./media-box.ts";
import { PDFPageContents } from "./object-store.ts";
import type { PDFOutput } from "./output.ts";
import { PDFPage } from "./page.ts";
import { PDFPages } from "./pages.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFResourceGroup } from "./resource.ts";
import { PDFResources } from "./resources.ts";
import { PDFTrailer } from "./trailer.ts";
import { PDFIndirectObject } from "./xref-entry.ts";
import { PDFXref } from "./xref.ts";

/** What the body needs from the document that owns it. */
export interface PDFBodyDocument extends PDFFontDocument {
  isCompress(): boolean;
}

/**
 * The numbered objects of the file and the current page. Numbers are
 * handed out in creation order (page tree 1, info 2, catalog 3); objects
 * are written sorted by number, then the xref table and the trailer.
 */
export class PDFBody {
  declare _doc: PDFBodyDocument;
  declare pageSize: PDFMediaBox | null;
  declare referenceNumber: number;
  declare pageTree: PDFIndirectObject<PDFPages>;
  declare info: PDFIndirectObject<PDFInfo>;
  declare catalog: PDFIndirectObject<PDFDictionary>;
  declare fonts: Record<string, PDFFontResource>;
  declare references: PDFIndirectObject[];
  declare currentPage: PDFIndirectObject<PDFPage>;

  constructor(document: PDFBodyDocument, author?: string | null, title?: string | null) {
    this._doc = document;
    this.referenceNumber = 1;
    this.pageTree = this.getIndirectObject(new PDFPages());
    this.info = this.getIndirectObject(new PDFInfo(author, title));
    this.catalog = this.getIndirectObject(new PDFDictionary());
    this.catalog.getPDFObject().put("/Type", "/Catalog");
    this.catalog.getPDFObject().put("/Pages", new PDFIndirectReference(this.pageTree));
    this.fonts = {};
    this.references = [];
    this.addIndirectObject(this.pageTree);
    this.addIndirectObject(this.catalog);
    this.addIndirectObject(this.info);
  }

  getInfo(): PDFInfo {
    return this.info.getPDFObject();
  }

  setPageOrigin(origin: Point): void {
    this.currentPage.getPDFObject().setPageOrigin(origin);
  }

  getPageOrigin(): Point {
    return this.currentPage.getPDFObject().getPageOrigin();
  }

  getPageSize(): PDFMediaBox {
    return this.currentPage.getPDFObject().getPageSize();
  }

  getPage(index: number): PDFPage | null {
    return this.pageTree.getPDFObject().getPage(index);
  }

  /** Starts a page: contents and resources are numbered before the page, but listed after it. */
  newPage(width: number, height: number): PDFPage {
    const contents = this.getIndirectObject(new PDFPageContents());
    const resources = this.getIndirectObject(new PDFResources());
    this.currentPage = this.getIndirectObject(new PDFPage(contents, resources, width, height));
    this.currentPage.getPDFObject().put("/Parent", new PDFIndirectReference(this.pageTree));
    this.pageTree.getPDFObject().addPage(new PDFIndirectReference(this.currentPage));
    this.addIndirectObject(this.currentPage);
    this.addIndirectObject(contents);
    this.addIndirectObject(resources);
    return this.currentPage.getPDFObject();
  }

  add(object: unknown, index?: number | null): void {
    this.currentPage.getPDFObject().add(object, index);
  }

  addIndirectObject(object: PDFIndirectObject): void {
    this.references.push(object);
  }

  removeIndirectObject(object: PDFIndirectObject | null | undefined): void {
    let found = -1;
    if (
      object &&
      this.references.some((reference, i) => {
        if (reference.number === object.number && reference.type === object.type) {
          found = i;
          return true;
        }
        return false;
      })
    ) {
      this.references.splice(found, 1);
    }
  }

  getIndirectObject<T extends PDFObject>(object: T): PDFIndirectObject<T> {
    return new PDFIndirectObject(0, this.referenceNumber++, object);
  }

  getCurrentResources(): PDFResources {
    return this.currentPage.getPDFObject().getResources();
  }

  /**
   * The resource of an engine font, made once per document (keyed by
   * PostScript name, or family for embedded fonts) and added to the
   * current page's fonts on first use there.
   */
  getFontResource(font: unknown): PDFFontResource {
    if (!(font instanceof OpenTypeFont)) throw "Unsupported font " + String(font);
    let key = (font._openTypeFont.names as unknown as { postScriptName: { en: string } })
      .postScriptName.en;
    if (font.isEmbedded()) key = font.getFamily();
    let resource = this.fonts[key];
    if (!resource) {
      const name = "F" + Object.keys(this.fonts).length;
      const fontObject = PDFFontFactory.createFont(this._doc, font, name);
      resource = new PDFFontResource(new PDFIndirectReference(fontObject));
      this.fonts[key] = resource;
    }
    const group = this.currentPage
      .getPDFObject()
      .getResources()
      .getGroup(PDFResourceGroup.Types.FONT);
    if (!group.get("/" + resource.getName())) group.add(resource);
    return resource;
  }

  write(output: PDFOutput): void {
    this.references.sort((a, b) => a.number - b.number);
    for (const reference of this.references) {
      reference.offset = output.getPosition();
      reference.write(output);
      output.writeln();
    }
    const xref = new PDFXref(this.references);
    xref.write(output);
    new PDFTrailer(
      new PDFIndirectReference(this.catalog),
      new PDFIndirectReference(this.info),
      this.references,
    ).write(output);
    output.writeln("startxref");
    output.writeln(xref.offset);
  }
}

Object.assign(PDFBody.prototype, {
  _doc: null,
  pageSize: null,
  referenceNumber: null,
  pageTree: null,
  info: null,
  catalog: null,
  fonts: null,
  references: null,
});
