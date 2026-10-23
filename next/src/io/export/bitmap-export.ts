// Old: chunk.vendor.js module 798 (GBitmapExport).
//
// PNG/JPEG export of a node: the size spec parser ("2x", "512w", "128h",
// "100x50", "300dpi"), the exported pixel area and the clamp to the
// largest canvas the browser allows.

import { Platform } from "../../engine/core/platform.ts";
import { extend, parseNumber } from "../../engine/core/util.ts";
import { Length } from "../../engine/math/length.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Bitmap } from "../../engine/paint/bitmap.ts";
import type { PaintStyle } from "../../engine/paint/paint-canvas.ts";

/** What the bitmap exporter needs of a node (an element or a scene). */
export interface BitmapExportNode {
  _getBitmapPaintArea(): Rect;
  getSelfCanvasUsedArea(): Rect;
  accept(visitor: (node: unknown) => unknown): unknown;
  toBitmap(
    width?: number | null,
    height?: number | null,
    mode?: number | null,
    background?: PaintStyle | null,
    configuration?: Record<string, unknown> | null,
    dpi?: number | null,
    backgroundOpacity?: number | null,
    area?: Rect | null,
  ): Bitmap | null;
}

export interface MaximumCanvasSize {
  width: number;
  height: number;
  area: number;
}

function hasCanvasUsedArea(node: unknown): node is { getSelfCanvasUsedArea(): Rect } {
  return (
    typeof node === "object" &&
    node !== null &&
    typeof (node as { getSelfCanvasUsedArea?: unknown }).getSelfCanvasUsedArea === "function"
  );
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old GBitmapExport was a non-instantiable class of statics
export class BitmapExport {
  constructor() {
    throw new Error("This class cannot be instantiated");
  }

  /**
   * Renders `node` for export at `size` (a size spec). `dpi` is the base
   * resolution ("Ndpi" specs multiply it). With `clampToMax` the scale
   * shrinks by 10% steps until the largest canvas any node uses fits the
   * browser's canvas limits.
   */
  static export(
    node: BitmapExportNode,
    size: string | null | undefined,
    backgroundColor: PaintStyle | null | undefined,
    configuration: Record<string, unknown> | null | undefined,
    dpi: number | null | undefined,
    backgroundOpacity: number | null | undefined,
    clampToMax?: boolean,
    area?: Rect | null,
  ): Bitmap | null {
    let paintArea = node._getBitmapPaintArea();
    const effectiveDpi = [0];
    let scale = BitmapExport.convertSizeToScale(
      paintArea.getWidth(),
      paintArea.getHeight(),
      size,
      dpi,
      effectiveDpi,
    );
    if (clampToMax) {
      paintArea = BitmapExport.getMaxCanvasUsedArea(node);
      const width = (paintArea.getWidth() * (effectiveDpi[0] as number)) / Length.DPI;
      const height = (paintArea.getHeight() * (effectiveDpi[0] as number)) / Length.DPI;
      const maximum = BitmapExport.getMaximumCanvasSize();
      while (
        width * scale.getX() > maximum.width ||
        height * scale.getY() > maximum.height ||
        width * height * scale.getX() * scale.getY() > maximum.area
      ) {
        scale = scale.scale(0.9);
      }
    }
    const paintConfiguration = extend({ forceEffectsWhenZoomed: true }, configuration);
    return node.toBitmap(
      scale.getX(),
      scale.getY(),
      2,
      backgroundColor,
      paintConfiguration,
      effectiveDpi[0],
      backgroundOpacity,
      area,
    );
  }

  /** The exported area: the paint box's origin and its size in pixels. */
  static getBitmapPaintArea(
    node: BitmapExportNode,
    size: string | null | undefined,
    dpi?: number | null,
  ): Rect {
    const area = node._getBitmapPaintArea();
    const effectiveDpi = [0];
    const scale = BitmapExport.convertSizeToScale(
      area.getWidth(),
      area.getHeight(),
      size,
      dpi,
      effectiveDpi,
    );
    const width = (area.getWidth() * (effectiveDpi[0] as number)) / Length.DPI;
    const height = (area.getHeight() * (effectiveDpi[0] as number)) / Length.DPI;
    return new Rect(area.getX(), area.getY(), width * scale.getX(), height * scale.getY());
  }

  /** Like getBitmapPaintArea for the node's own canvas area. */
  static getNodeSelfBitmapUsedArea(
    node: BitmapExportNode,
    size: string | null | undefined,
    dpi?: number | null,
  ): Rect {
    const area = node.getSelfCanvasUsedArea();
    const effectiveDpi = [0];
    const scale = BitmapExport.convertSizeToScale(
      area.getWidth(),
      area.getHeight(),
      size,
      dpi,
      effectiveDpi,
    );
    const width = (area.getWidth() * (effectiveDpi[0] as number)) / Length.DPI;
    const height = (area.getHeight() * (effectiveDpi[0] as number)) / Length.DPI;
    return new Rect(area.getX(), area.getY(), width * scale.getX(), height * scale.getY());
  }

  /** The largest width and height of any canvas area in the subtree (at 0, 0). */
  static getMaxCanvasUsedArea(node: BitmapExportNode): Rect {
    let width = 0;
    let height = 0;
    node.accept((visited) => {
      if (hasCanvasUsedArea(visited)) {
        const area = visited.getSelfCanvasUsedArea();
        if (area.getWidth() > width) width = area.getWidth();
        if (area.getHeight() > height) height = area.getHeight();
      }
      return true;
    });
    return new Rect(0, 0, width, height);
  }

  static getMaximumCanvasSize(): MaximumCanvasSize {
    return {
      width: Platform.absoluteMaxImgLinearDimension,
      height: Platform.absoluteMaxImgLinearDimension,
      area: Platform.absoluteMaxImgAreaDots,
    };
  }

  /**
   * The scale for a size spec on an area of `width` x `height`:
   * "Nx" scales, "Nw"/"Nh" fit the width/height, "WxH" scales each axis,
   * "Ndpi" scales by N/72, or, when `dpiOut` is given, keeps the scale at
   * 1 and multiplies `dpiOut[0]` (which starts at `dpi`, default 72).
   * Anything else is 1x. An empty area gives (0, 0).
   */
  static convertSizeToScale(
    width: number,
    height: number,
    size: string | null | undefined,
    dpi?: number | null,
    dpiOut?: number[],
  ): Point {
    if (!width || !height) return new Point(0, 0);
    let scaleX = 1;
    let scaleY = 1;
    if (dpiOut) dpiOut[0] = dpi || Length.DPI;
    if (size) {
      size = size.trim().toLowerCase();
      const value = parseNumber(size);
      if (!Number.isNaN(value) && value > 0) {
        // The unit is what follows the number as JavaScript prints it, so
        // "1.50x" or "1e2x" don't parse as "x".
        const unit = size.substr(value.toString().length);
        switch (unit) {
          case "x":
            scaleX = value;
            scaleY = value;
            break;
          case "w":
            scaleY = scaleX = value / width;
            break;
          case "h":
            scaleX = scaleY = value / height;
            break;
          case "dpi":
            if (dpiOut) {
              const factor = value / Length.DPI;
              scaleX = scaleY = 1;
              dpiOut[0] = (dpiOut[0] as number) * factor;
            } else scaleX = scaleY = value / Length.DPI;
            break;
          default:
            if (unit.length && "x" === unit.charAt(0)) {
              const second = parseNumber(unit.substr(1));
              if (!Number.isNaN(second) && second > 0) {
                scaleX = value / width;
                scaleY = second / height;
              }
            }
        }
      }
    }
    return new Point(scaleX, scaleY);
  }
}
