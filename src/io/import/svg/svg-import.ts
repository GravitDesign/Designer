// Old: chunk.vendor.js module 1390 (GSVGImport).
import pako from "pako";
import { each, extend } from "../../../engine/core/util.ts";
import { Length } from "../../../engine/math/length.ts";
import { Group } from "../../../engine/scene/group.ts";
import { Page } from "../../../engine/scene/page.ts";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { Text } from "../../../engine/text/text.ts";
import {
  SvgParser,
  type ImportNode,
  type SvgDomNode,
  type SvgParserOptions,
} from "./svg-parser.ts";

/** What GSVGImport.import accepts: SVG text, (gzipped) bytes, a Blob or a parsed document. */
export type SvgImportSource =
  string | ArrayBuffer | Uint8Array | Blob | Document | null | undefined;

export interface SvgImportOptions extends SvgParserOptions {
  /** The view port size when the SVG gives none (default 400 x 400). */
  baseWidth?: number;
  baseHeight?: number;
  /** Ignore the SVG's own size and viewBox (the library inserts icons this way). */
  forceBaseSize?: boolean;
  /** Build into this node instead of a new group. */
  target?: ImportNode | null;
}

/** The SVG's size in pixels (from width/height, else the viewBox) and its unit. */
export interface SvgImportInfo {
  width: number | undefined;
  height: number | undefined;
  unit: string | null;
}

/**
 * Called once: with an error (a message string or what was thrown), or
 * with null, the imported node and the size. The node is a group of the
 * content, its only child when there is just one, the original page or
 * elements for SVGs exported with editing data, or null when nothing
 * was imported.
 */
export type SvgImportCallback = (
  error: unknown,
  node?: ImportNode | null,
  info?: SvgImportInfo,
) => void;

/**
 * GSVGImport: turns an SVG into scene nodes. The callback runs once
 * every font the texts need is resolved; fills from gradients and
 * patterns are added after the call returns (they are promises).
 */
export const SVGImport = {
  import(
    source: SvgImportSource,
    options: SvgImportOptions | undefined,
    fontManager: FontManager,
    callback: SvgImportCallback,
  ): void {
    try {
      if ("string" == typeof source) {
        SVGImport.import(
          new DOMParser().parseFromString(source, "text/xml"),
          options,
          fontManager,
          callback,
        );
        return;
      }
      if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        const bytes = source instanceof ArrayBuffer ? new Uint8Array(source) : source;
        if (31 === bytes[0] && 139 === bytes[1] && 8 === bytes[2]) {
          const text = pako.ungzip(bytes, { to: "string" });
          SVGImport.import(text, options, fontManager, callback);
          return;
        }
        SVGImport.import(new Blob([source as BlobPart]), options, fontManager, callback);
        return;
      }
      if (source instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () =>
          SVGImport.import(reader.result as string, options, fontManager, callback);
        reader.readAsText(source);
        return;
      }
      if (!source || !source.documentElement || "svg" !== source.documentElement.nodeName) {
        callback("Invalid svg document.");
        return;
      }
      const settings = extend(
        { baseWidth: 400, baseHeight: 400, forceBaseSize: false },
        options,
      ) as SvgImportOptions & { baseWidth: number; baseHeight: number };
      const parser = new SvgParser(settings, fontManager);
      const root = parser.CreateElement(source.documentElement as unknown as SvgDomNode);
      root.root = true;
      parser.ViewPort.Clear();
      parser.ViewPort.SetCurrent(settings.baseWidth, settings.baseHeight);
      let width: number | undefined;
      let height: number | undefined;
      if (!settings.forceBaseSize && root.attributes.viewBox) {
        const viewBox = (root.attributes.viewBox.value as string).split(" ");
        if (4 === viewBox.length) {
          width = parseFloat(viewBox[2] as string) - parseFloat(viewBox[0] as string);
          height = parseFloat(viewBox[3] as string) - parseFloat(viewBox[1] as string);
          // (The old check `NaN !== width` is always true.)
          if (width >= 0 && height >= 0) parser.ViewPort.SetCurrent(width, height);
        }
      }
      let unit: string | null = null;
      if (
        !settings.forceBaseSize &&
        root.style("width").hasValue() &&
        root.style("height").hasValue()
      ) {
        const pixelWidth = root.style("width").toPixels("x");
        const pixelHeight = root.style("height").toPixels("y");
        const units = root.style("width").getUnits();
        Object.keys(Length.Unit).some((key) => {
          const value = (Length.Unit as Record<string, string>)[key];
          if (value === units) {
            unit = value;
            return true;
          }
          return false;
        });
        parser.ViewPort.Clear();
        parser.ViewPort.SetCurrent(pixelWidth, pixelHeight);
        width = pixelWidth;
        height = pixelHeight;
      }
      // A root whose node is null throws on getFirstChild, as before.
      let node = root.toScene([], settings.target) as ImportNode | null;
      if (!(node as ImportNode).getFirstChild()) node = null;
      if (!settings.target && node && !(node instanceof Page)) {
        if (node.getFirstChild() === node.getLastChild()) {
          const only = node.getFirstChild() as ImportNode;
          node.removeChild(only);
          node = only;
        }
        const content = node;
        each(Object.keys(parser.References), (_index, id) => {
          const path = content.querySingle("[name=" + id + "]");
          if (path) {
            const texts = parser.References[id] as Text[];
            path.setProperty(
              "rtxt",
              texts.map((text) => text.getReferenceId()),
            );
            each(texts, (_i, text) => {
              if (text instanceof Text) text.attachPath(path as never);
            });
          }
        });
        const emptyGroups: ImportNode[] = [];
        content.acceptChildren((child) => {
          if (child instanceof Group && !child.getChildren().length) emptyGroups.push(child);
        });
        each(emptyGroups, (_index, group) => {
          (group.getParent() as ImportNode).removeChild(group);
        });
      }
      parser.waitFor(() => {
        callback(null, node, { width, height, unit });
      });
    } catch (error) {
      console.error(error);
      callback(error);
    }
  },
};
