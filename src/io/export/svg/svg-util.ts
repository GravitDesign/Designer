// Old: chunk.vendor.js module 438 (SVG helpers shared by the exporter and the importer).
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { each } from "../../../engine/core/util.ts";
import type { Polygon } from "../../../engine/scene/polygon.ts";
import { SvgElement, type SvgNode } from "./svg-dom.ts";

/** What setAttributeId and exportAttributes read from a node. */
export interface SvgNamedNode {
  getProperty(name: string, custom?: boolean): unknown;
  getNodeNameTranslated(): string;
}

/** The export options these helpers read. */
export interface SvgIdOptions {
  layerNamesAsId?: boolean;
}

/** An element as the importer passes it: a DOM element or a tag name. */
type ElementLike = { nodeName?: string } | null | undefined;

const SHAPE_ELEMENTS = ["circle", "ellipse", "line", "mesh", "path", "polygon", "polyline", "rect"];

const FILLED_ELEMENTS = [
  "altGlyph",
  "circle",
  "ellipse",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "textPath",
  "tref",
  "tspan",
];

export const SvgUtil = {
  /** Pixels of blur radius per SVG stdDeviation. */
  PIXEL_RATE_STDDEVIATION: 2.3290429691304455,

  createIdUrl(id: string | null): string {
    return "url(#" + id + ")";
  },

  /** A polygon that is a plain polygon (no star points, no rounded corners) becomes `<polygon>`. */
  isPolygonNative(polygon: Polygon): boolean {
    return (
      !!polygon.isPlainEdges() && 0 == polygon.getProperty("icr") && 0 == polygon.getProperty("ocr")
    );
  },

  /** Removes the mask elements below `node` (a removal skips the next sibling, as in the old loop). */
  removeDefs(node: SvgNode): void {
    for (let i = 0; i < node.childNodes.length; i++) {
      SvgUtil.removeDefs(node.childNodes[i] as SvgNode);
    }
    if (node instanceof SvgElement && "mask" === node.tagName) {
      (node.parentElement as SvgElement).removeChild(node);
    }
  },

  /** Replaces the fill and stroke in the style attributes of `node` and its descendants. */
  replaceFillAndStroke(node: SvgNode, fill: string, stroke: string): void {
    if (node instanceof SvgElement) {
      let style = node.getAttribute("style");
      if (style) {
        style = style.replace(/fill:[^;]+;/, "fill:" + fill + ";");
        style = style.replace(/stroke:[^;]+;/, "stroke:" + stroke + ";");
        node.setAttribute("style", style);
      }
      each(node.childNodes, (_index, child) => {
        SvgUtil.replaceFillAndStroke(child, fill, stroke);
      });
    }
  },

  replaceFill(element: SvgElement, fill: string): void {
    let style = element.getAttribute("style");
    if (style) {
      style = style.replace(/fill:[^;]+;/, "fill:" + fill + ";");
      element.setAttribute("style", style);
    }
    if (element.getAttribute("fill")) element.setAttribute("fill", fill);
  },

  pixelToStdDeviation(pixels: number): number {
    if (isNaN(pixels)) throw "Invalid format for pixel!";
    return pixels / SvgUtil.PIXEL_RATE_STDDEVIATION;
  },

  stdDeviationToPixel(deviation: number): number {
    if (isNaN(deviation)) throw "Invalid format for stdDeviation!";
    return deviation * SvgUtil.PIXEL_RATE_STDDEVIATION;
  },

  isElementShape(element: ElementLike): boolean {
    return !!(element && element.nodeName && SHAPE_ELEMENTS.includes(element.nodeName));
  },

  /** Black for the SVG elements that fill by default, false otherwise. */
  getDefaultFillForElement(
    element: string | ElementLike,
  ): RGBColor | false | undefined | null | "" {
    if ("string" == typeof element) return FILLED_ELEMENTS.includes(element) && RGBColor.BLACK;
    return (
      element && element.nodeName && FILLED_ELEMENTS.includes(element.nodeName) && RGBColor.BLACK
    );
  },

  /** `element` (if it is a shape or text) and every shape or text below it, depth first. */
  filterClipPathElements(element: SvgElement): SvgElement[] {
    let out: SvgElement[] = [];
    if (SvgUtil.isElementShape(element) || "text" === element.nodeName) out.push(element);
    const children = element.children;
    if (children && children.length > 0) {
      each(children, (_index, child) => {
        out = out.concat(SvgUtil.filterClipPathElements(child));
      });
    }
    return out;
  },

  /** With layerNamesAsId the node's name becomes the id; otherwise the group is marked to keep. */
  setAttributeId(element: SvgElement, node: SvgNamedNode, options: SvgIdOptions): void {
    if (options.layerNamesAsId) {
      element.setAttribute("id", node.getProperty("name") || node.getNodeNameTranslated());
    } else {
      element._keepIt = true;
    }
  },

  /** With layerNamesAsId, the attributes the SVG importer kept ("svgattrs") are written back. */
  exportAttributes(element: SvgElement, node: SvgNamedNode, options: SvgIdOptions): void {
    if (options.layerNamesAsId) {
      const attributes = node.getProperty("svgattrs", true) as Record<string, unknown> | null;
      if (attributes) {
        Object.keys(attributes).forEach((name) => {
          element.setAttribute(name, attributes[name]);
        });
      }
    }
  },
};
