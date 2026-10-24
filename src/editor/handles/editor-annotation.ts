// Old: chunk.vendor.js module 81 (GEditorAnnotation).
import type { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { EditorOptions } from "../editor-options.ts";

/** Handle shapes paintAnnotation draws. Anything else paints no outline. */
export type AnnotationType = "rect" | "circle" | "diamond" | string;

/**
 * Painted handles by shape, size, colours and options. Every handle of the
 * same look is drawn once into a small canvas and blitted from then on.
 */
const handleCache: Record<string, HTMLCanvasElement> = {};

function createHandleImage(
  type: AnnotationType,
  size: number,
  outlineColor: Color | null | undefined,
  fillColor: Color | null | undefined,
  outlineWidth: number | null | undefined,
  shadowColor: string | null | undefined,
  outsideStroke: boolean | null | undefined,
): HTMLCanvasElement {
  let key = type.toString() + "_" + size.toString();
  let outlineCss: string | null = null;
  let fillCss: string | null = null;
  if (outlineColor) key += "_" + (outlineCss = outlineColor.toScreenCSS());
  if (fillColor) key += "_" + (fillCss = fillColor.toScreenCSS());
  if (outlineWidth) key += "_" + String(outlineWidth);
  if (shadowColor) key += "_" + shadowColor;
  if (outsideStroke) key += "_" + String(outsideStroke);
  const cached = handleCache[key];
  if (cached) return cached;

  const fullSize = size;
  let lineWidth = 0;
  // The canvas size is taken from the size before the outline shrinks it.
  let canvasSize = size + 2 + 4 * EditorAnnotation.SHADOW_SIZE;
  if (outlineCss) {
    size -= 2 * (lineWidth = outlineWidth || EditorOptions.outlineWidth);
    if (!("rect" === type || outlineCss !== RGBColor.WHITE.toScreenCSS() || outsideStroke)) {
      lineWidth += 0.5;
      size += 1;
      canvasSize += 2;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = fillCss || "transparent";
  ctx.strokeStyle = outlineCss || "transparent";
  ctx.lineWidth = lineWidth;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  let radius = size / 2;
  if (lineWidth > 0 && lineWidth % 2 != 0) radius += 0.5;

  const tracePath = (target: CanvasRenderingContext2D, r: number): void => {
    target.beginPath();
    switch (type) {
      case "rect":
        target.moveTo(centerX - r, centerY - r);
        target.lineTo(centerX + r, centerY - r);
        target.lineTo(centerX + r, centerY + r);
        target.lineTo(centerX - r, centerY + r);
        break;
      case "circle":
        target.arc(centerX, centerY, r, 0, 2 * Math.PI, false);
        break;
      case "diamond":
        target.moveTo(centerX - r - 1, centerY);
        target.lineTo(centerX, centerY - r - 1);
        target.lineTo(centerX + r + 1, centerY);
        target.lineTo(centerX, centerY + r + 1);
    }
    target.closePath();
  };

  tracePath(ctx, radius);
  if (fillCss) {
    const shadow = shadowColor || EditorAnnotation.SHADOW_COLOR;
    if (EditorAnnotation.SHADOW_SIZE && shadow) {
      ctx.shadowColor = shadow;
      ctx.shadowBlur = EditorAnnotation.SHADOW_SIZE * (lineWidth || 1);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.fill();
  }
  if (outlineCss) {
    ctx.shadowColor = "transparent";
    ctx.stroke();
  }
  if (outsideStroke) {
    // Clears the inside of the outline again and fills it with the fill
    // colour, so the outline sits outside the handle's size.
    const mask = document.createElement("canvas");
    mask.width = canvasSize;
    mask.height = canvasSize;
    const maskCtx = mask.getContext("2d") as CanvasRenderingContext2D;
    tracePath(
      maskCtx,
      (outlineCss && lineWidth ? Math.max(fullSize - lineWidth, size) : fullSize) / 2,
    );
    maskCtx.lineWidth = 2;
    maskCtx.stroke();
    maskCtx.globalCompositeOperation = PaintCanvas.CompositeOperator.DestinationOut;
    maskCtx.fill(PaintCanvas.FillRule.EvenOdd);
    maskCtx.fillStyle = fillCss as string;
    maskCtx.globalCompositeOperation = PaintCanvas.CompositeOperator.SourceIn;
    maskCtx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(mask, 0, 0);
  }
  handleCache[key] = canvas;
  return canvas;
}

/** Paints editor handles (annotations) and measures them. */
export const EditorAnnotation = {
  SHADOW_SIZE: 2,
  SHADOW_COLOR: "rgba(0,0,0,0.75)",

  /**
   * Paints one handle centred on `center` (mapped through `transform`
   * when given), snapped to whole pixels. `inverted` swaps the outline
   * and fill colours.
   */
  paintAnnotation(
    context: PaintContext,
    transform: Transform | null | undefined,
    center: Point | null,
    type: AnnotationType,
    inverted: unknown,
    size: number,
    outlineColor?: Color | object | null,
    fillColor?: Color | object | null,
    outlineWidth?: number | null,
    shadowColor?: string | null,
    outsideStroke?: unknown,
  ): void {
    if (inverted) {
      const swap = outlineColor;
      outlineColor = fillColor;
      fillColor = swap;
    }
    const image = createHandleImage(
      type,
      size,
      outlineColor as Color | null | undefined,
      fillColor as Color | null | undefined,
      outlineWidth,
      shadowColor,
      outsideStroke as boolean | null | undefined,
    );
    let point = center as Point;
    if (transform) point = transform.mapPoint(point);
    const x = Math.floor(point.getX() - image.width / 2);
    const y = Math.floor(point.getY() - image.height / 2);
    (context.canvas as PaintCanvas).drawImage(image, x, y, true);
  },

  /**
   * The pixel box a handle of `size` covers at `center` (default 0,0,
   * mapped through `transform`), one pixel larger on every side; with
   * `withPaintMargin` grown by half the paint margin (shadow).
   */
  getAnnotationBBox(
    transform: Transform | null | undefined,
    center: Point | null | undefined,
    size: number,
    withPaintMargin?: boolean,
  ): Rect {
    center = center || new Point(0, 0);
    if (transform) center = transform.mapPoint(center);
    const x = Math.floor(center.getX()) + 0.5;
    const y = Math.floor(center.getY()) + 0.5;
    let box = new Rect(x - size / 2 - 1, y - size / 2 - 1, size + 2, size + 2);
    if (withPaintMargin) {
      const margin = this.getAnnotationPaintMargin(size) / 2;
      box = box.expanded(margin, margin, margin, margin);
    }
    return box;
  },

  /** How far a handle's paint (with its shadow) reaches beyond `size`. */
  getAnnotationPaintMargin(size: number): number {
    return size + 4 + EditorAnnotation.SHADOW_SIZE * EditorOptions.outlineWidth * 4;
  },
};
