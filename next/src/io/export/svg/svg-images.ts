// Old: chunk.vendor.js module 1202 (the SVG export's render context).
//
// Holds the document being built, the element stack the exporter renders
// into (push/pop/peek), the export options and the image dictionary: an
// image from the scene dictionary ("dictionary://<key>") is written once
// as `<image id="img_<key>">` in a trailing `<defs>` and referenced with
// `<use>`. When the last job ends, the document is serialized and handed
// to the result callback.
import type { Rect } from "../../../engine/math/rect.ts";
import type { Image } from "../../../engine/scene/image.ts";
import type { Scene } from "../../../engine/scene/scene.ts";
import { SVG_NAMESPACE, SvgComment, SvgDocument, type SvgElement } from "./svg-dom.ts";
import { SvgFormat } from "./svg-format.ts";
import type { SvgPaintContext } from "./svg-paint-context.ts";

/** The options of an SVG export (GSVGExport.DefaultOptions plus what the callers pass). */
export interface SvgExportOptions {
  forceRoot?: boolean;
  viewBox?: boolean;
  clipToPage?: boolean;
  preserveEditingCapabilities?: boolean;
  layerNamesAsId?: boolean;
  print?: boolean;
  rasterizeUnsupportedObjectsByCDR?: boolean;
  useImageDictionary?: boolean;
  unit?: string;
  dpi?: number;
  includeInvisible?: boolean;
  annotations?: boolean;
  convertTextToPath?: boolean;
  decimalPlacesPrecision?: number | string;
  backgroundColor?: unknown;
  backgroundOpacity?: number;
  sceneBackground?: boolean;
  fullFFName?: boolean;
  projectId?: unknown;
  /** Set while text renders (SvgTextAttributes reads the text's transform from it). */
  origin?: unknown;
  [option: string]: unknown;
}

/** How an export ends: an error (null on success) and the SVG text. */
export type SvgExportResult = (error: unknown, svg?: string) => void;

const SKELETON_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';

/**
 * The document the old code parsed from
 * `<?xml ...?><!-- Generator: Gravitdesign.com --><svg xmlns=... xmlns:xlink= ... style="isolation:isolate"></svg>`.
 */
function createSkeleton(): SvgDocument {
  const document = new SvgDocument();
  document.xmlDeclaration = SKELETON_DECLARATION;
  document.appendChild(new SvgComment(document, " Generator: Gravitdesign.com "));
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("xmlns", SVG_NAMESPACE);
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("style", "isolation:isolate");
  document.appendChild(svg);
  return document;
}

export class SvgRenderContext {
  static XMLNamespaceURI = "http://gravitdesign.com/";

  paintContext: SvgPaintContext;
  projectId: unknown;
  options: SvgExportOptions;
  fnResult: SvgExportResult;
  svgDoc: SvgDocument;
  currentElement: SvgElement;
  /** The exported area, when the export has a view box. */
  viewBox: Rect | null;
  stack: SvgElement[];
  imageDictionary: SvgElement[];
  jobCount = 0;
  /** The translation of the content group of an unbounded scene. */
  globalOffset = { x: 0, y: 0 };
  /** Set by the exporter when the node it just encoded was rasterized. */
  wasRasterized?: boolean;
  /** Set on an infinite scene page that is fixed sized (unused otherwise). */
  _ignoreContents?: boolean;

  constructor(options: SvgExportOptions, paintContext: SvgPaintContext, fnResult: SvgExportResult) {
    this.paintContext = paintContext;
    this.projectId = options.projectId;
    this.options = options;
    this.fnResult = fnResult;
    this.svgDoc = createSkeleton();
    this.currentElement = this.svgDoc.documentElement;
    this.viewBox = null;
    this.stack = [];
    this.imageDictionary = [];
  }

  setDocument(document: SvgDocument): void {
    this.svgDoc = document;
    this.currentElement = document.documentElement;
    this.imageDictionary = [];
  }

  push(element: SvgElement): void {
    this.stack.push(this.currentElement);
    this.currentElement = element;
  }

  pop(): SvgElement {
    this.currentElement = this.stack.pop() as SvgElement;
    return this.currentElement;
  }

  peek(): SvgElement {
    return this.currentElement;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature (the job name)
  beginJob(name?: string): void {
    this.jobCount++;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature (the job name)
  endJob(name?: string): void {
    this.jobCount--;
    if (0 == this.jobCount) this.done();
  }

  /** Appends the image dictionary and hands the serialized document to the callback. */
  done(): void {
    if (this.imageDictionary.length) {
      const defs = this.createSvgElement("defs");
      this.imageDictionary.forEach((image) => {
        defs.appendChild(image);
      });
      this.svgDoc.documentElement.appendChild(defs);
    }
    const text = SvgFormat.xmlToString(this.svgDoc);
    this.fnResult(null, text);
  }

  createSvgElement(name: string): SvgElement {
    return this.svgDoc.createElementNS(SVG_NAMESPACE, name);
  }

  /**
   * The element for an image: an `<image>` with the pixels as a data URL,
   * or for a dictionary image a `<use>` of its one shared `<image>`
   * (holding the dictionary's original data when there is one).
   */
  createImageElement(image: Image): SvgElement {
    const canvas = image.getImageCanvas();
    const scene = image.getScene() as Scene | null;
    if (!canvas || !scene) return this.createSvgElement("image");
    let element: SvgElement;
    const url = image.getProperty("url") as string;
    if (!url.startsWith("dictionary://")) {
      element = this.createSvgElement("image");
      element.setAttribute("width", canvas.width);
      element.setAttribute("height", canvas.height);
      element.setAttribute("xlink:href", canvas.toDataURL());
      return element;
    }
    const id = "img_" + url.slice(13);
    let shared: SvgElement | null = null;
    for (let i = 0; i < this.imageDictionary.length && !shared; i++) {
      if ((this.imageDictionary[i] as SvgElement).getAttribute("id") === id) {
        shared = this.imageDictionary[i] as SvgElement;
      }
    }
    if (!shared) {
      const entry = scene.getDictionary().getEntry(url) as { value?: string } | undefined;
      // Like the old code this throws for a dictionary URL without an entry.
      const data = (entry as { value?: string }).value || canvas.toDataURL();
      element = this.createSvgElement("image");
      element.setAttribute("width", canvas.width);
      element.setAttribute("height", canvas.height);
      element.setAttribute("xlink:href", data);
      element.setAttribute("id", id);
      this.imageDictionary.push(element);
    }
    const use = this.createSvgElement("use");
    use.setAttribute("xlink:href", "#" + id);
    return use;
  }

  /** An element in the Gravit namespace ("gravitDesigner:<name>") with attributes. */
  createInternalSvgElement(name: string, attributes?: Record<string, unknown>): SvgElement {
    const element = this.svgDoc.createElementNS(
      SvgRenderContext.XMLNamespaceURI,
      "gravitDesigner:" + name,
    );
    if (attributes) {
      Object.keys(attributes).forEach((key) => {
        element.setAttribute(key, attributes[key]);
      });
    }
    return element;
  }
}
