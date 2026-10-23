// Old: chunk.vendor.js module 852 (SVG formatting helpers of the exporter).
import { map } from "../../../engine/core/util.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Image } from "../../../engine/scene/image.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Slice } from "../../../engine/scene/slice.ts";
import type { Element } from "../../../engine/scene/element.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { serializeToString, type SvgElement, type SvgNode } from "./svg-dom.ts";

/** A node with a property that holds a color pattern (a paint layer: "_pt" and "_op"). */
interface PatternHolder {
  getProperty(name: string): unknown;
}

interface ScreenColor {
  toScreen(): number[];
}

/** What hasEffects reads: the element with the paint context the exporter attached. */
interface EffectsElement {
  _paintContext: { configuration: { isOutline(context: unknown): boolean } };
  $_stop: number;
  _effects: { getLayersEffects(layers: unknown, visibleOnly: boolean): unknown[][] | null } | null;
  getStyleLayers(): unknown;
}

export const SvgFormat = {
  /** Whether the element paints any visible effect (unused by the exporter itself). */
  hasEffects(element: EffectsElement): boolean {
    const context = element._paintContext;
    let found = false;
    const layers = element.getStyleLayers();
    if (context.configuration.isOutline(context)) {
      // nothing
    } else if (element.$_stop > 0) {
      const effects = element._effects ? element._effects.getLayersEffects(layers, true) : null;
      if (effects) {
        for (let i = 0; i < effects.length; ++i) {
          const list = effects[i];
          if (list) for (let j = 0; j < list.length; ++j) found = true;
        }
      }
    }
    return found;
  },

  containsImages(node: Node): boolean {
    if (node instanceof Image) return true;
    const children = (node as unknown as { getChildren(): Node[] }).getChildren();
    for (let i = 0; i < children.length; i++) {
      if (true == SvgFormat.containsImages(children[i] as Node)) return true;
    }
    return false;
  },

  formatHTMLTags(attributes: Record<string, unknown>): string {
    return map(attributes, (value, name) => name + '="' + value + '"').join(" ");
  },

  addAttributes(element: SvgElement, attributes: Record<string, unknown>): void {
    map(attributes, (value, name) => {
      element.setAttribute(name, value);
    });
  },

  formatCSSTags(properties: Record<string, unknown>): string {
    return map(properties, (value, name) => name + ":" + value + ";").join("");
  },

  /** "rgba(r,g,b,opacity)" of the "_<prefix>pt" pattern and "_<prefix>op" opacity. */
  formatRGBA(node: PatternHolder, prefix: string): string {
    let values: unknown[] | null = SvgFormat.extractRGBA(node, prefix);
    return values && (values = values.slice(0, 4)) ? "rgba(" + values.join(",") + ")" : "";
  },

  extractRGBA(node: PatternHolder, prefix: string): number[] {
    prefix = "_" + prefix;
    const pattern = node.getProperty(prefix + "pt") as ScreenColor | null;
    if (null === pattern) return [0, 0, 0, 0];
    const values = pattern.toScreen().slice(0, 3);
    values.push(node.getProperty(prefix + "op") as number);
    return values;
  },

  /** "rgb(r,g,b)" of the "_<prefix>pt" pattern. */
  formatRGB(node: PatternHolder, prefix: string): string {
    let values: number[] | null = SvgFormat.extractRGB(node, prefix);
    return values && (values = values.slice(0, 3)) ? "rgb(" + values.join(",") + ")" : "";
  },

  extractRGB(node: PatternHolder, prefix: string): number[] {
    prefix = "_" + prefix;
    const pattern = node.getProperty(prefix + "pt") as ScreenColor | null;
    return null === pattern ? [0, 0, 0] : pattern.toScreen().slice(0, 3);
  },

  propertiesFromGeometry(element: Element): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const box = element.getGeometryBBox();
    if (box) {
      return { x: box.getX(), y: box.getY(), width: box.getWidth(), height: box.getHeight() };
    }
    console.warn("No GeometryBBox for " + element.toString());
    return { x: 0, y: 0, width: 0, height: 0 };
  },

  /** The serialized document with &, > and < written as character references. */
  xmlToString(node: SvgNode): string {
    let text = serializeToString(node).replace(/&amp;/g, "&#x26;");
    text = text.replace(/&gt;/g, "&#x3E;");
    text = text.replace(/&lt;/g, "&#x3C;");
    return text;
  },

  /** The exported area: the paint box, a slice's bitmap area, or a page's clip box. */
  getBoundingBox(element: Element, includeInvisible?: boolean): Rect | null {
    let box = element.getPaintBBox(null, null, includeInvisible);
    if (!box) return null;
    if (element instanceof Slice) {
      const bitmap = element.toBitmap();
      if (!bitmap) return null;
      const offset = bitmap.getOffset() as { getX(): number; getY(): number };
      box = new Rect(
        offset.getX() + box.getX(),
        offset.getY() + box.getY(),
        bitmap.getWidth(),
        bitmap.getHeight(),
      );
    } else if (element instanceof Page) {
      box = element.getClipBBox() || box;
    }
    return box;
  },
};
