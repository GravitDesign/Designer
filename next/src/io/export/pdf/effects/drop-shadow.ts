// Old: chunk.vendor.js module 1448 (GPDFDropShadowEffect).
import { VertexSource } from "../../../../engine/geometry/vertex-source.ts";
import { Point } from "../../../../engine/math/point.ts";
import { Rect } from "../../../../engine/math/rect.ts";
import { Transform } from "../../../../engine/math/transform.ts";
import { Canvas2DPaintCanvas, type PaintStyle } from "../../../../engine/paint/paint-canvas.ts";
import { PaintContext } from "../../../../engine/paint/paint-context.ts";
import type { PaintConfiguration } from "../../../../engine/paint/paint-configuration.ts";
import { ScenePaintConfiguration } from "../../../../engine/paint/scene-paint-configuration.ts";
import type { Node } from "../../../../engine/scene/node.ts";
import { BlurEffect } from "../../../../engine/style/effects/blur-effect.ts";
import type { DropShadowEffect } from "../../../../engine/style/effects/drop-shadow-effect.ts";
import type { Pattern } from "../../../../engine/style/pattern.ts";
import { Stylable } from "../../../../engine/style/stylable.ts";
import { PDFGraphics } from "../content-stream.ts";
import { PDFConcatMatrix } from "../op-cm.ts";
import type { PDFPaintContext } from "../pdf-paint-context.ts";

/** The effect properties the shadows read. */
export interface ShadowProperties {
  $pat: Pattern | null;
  $opc: number;
  $r: number;
  $x: number;
  $y: number;
}

/** The node calls the shadows make. */
export interface ShadowNode extends Node {
  $_op: number;
  getPaintBBox(): Rect;
  paint(context: PaintContext): void;
  getPaintLayers(): { getFillLayers(visible: boolean): { $_op: number }[] } | null;
}

/** A canvas positioned at `origin` and scaled, ready to paint into. */
export function preparedCanvas(
  width: number,
  height: number,
  origin: Point,
  scale: number,
): Canvas2DPaintCanvas {
  const canvas = new Canvas2DPaintCanvas();
  canvas.resize(width, height);
  canvas.prepare();
  canvas.setOrigin(origin);
  canvas.setOffset(origin);
  canvas.setScale(scale);
  return canvas;
}

/** A plain full paint context over `canvas`, without effects or annotations. */
export function shadowPaintContext(canvas: Canvas2DPaintCanvas, clipArea?: Rect): PaintContext {
  const context = new PaintContext();
  context.canvas = canvas;
  const configuration = new ScenePaintConfiguration();
  configuration.paintMode = ScenePaintConfiguration.PaintMode.Full;
  configuration.paintSharp = false;
  configuration.annotations = false;
  context.configuration = configuration as unknown as PaintConfiguration;
  if (clipArea) configuration.clipArea = clipArea;
  configuration.clipDirty = false;
  configuration.enableFxCache = false;
  configuration.defaultEffectDetailLevel = 1;
  configuration.ignoreEffects = true;
  return context;
}

/** Fills a canvas with the shadow pattern over what it shows. */
export function fillWithPattern(
  canvas: Canvas2DPaintCanvas,
  pattern: Pattern,
  opacity: number,
): void {
  const visible = (canvas.getTransform(false).inverted() as Transform).mapRect(
    new Rect(0, 0, canvas.getWidth(), canvas.getHeight()),
  );
  const paint = canvas.createPatternPaint(pattern, visible);
  if (!paint) return;
  if (paint.transform) {
    const previous = canvas.setTransform(canvas.getTransform(true).preMultiplied(paint.transform));
    canvas.fillRect(0, 0, 1, 1, paint.paint as PaintStyle, opacity);
    canvas.setTransform(previous);
  } else {
    canvas.fillRect(
      visible.getX(),
      visible.getY(),
      visible.getWidth(),
      visible.getHeight(),
      paint.paint as PaintStyle,
      opacity,
    );
  }
}

/**
 * A drop shadow. Blurred shadows (and shadows of nodes that aren't shapes
 * or have no fill opacity) are rendered as an image: the shadow color,
 * masked by the blurred shape. Sharp ones are the shape filled again in
 * the shadow color, offset.
 */
export class PDFDropShadowEffect {
  render(
    context: PDFPaintContext,
    node: ShadowNode,
    effect: DropShadowEffect & ShadowProperties,
  ): void {
    if (!(effect.$pat && 0 !== effect.$opc)) return;
    if (effect.$r > 0 || !node.hasMixin(VertexSource) || !node.$_op) {
      const scale = context.canvas.getScale() as number;
      const box = node.getPaintBBox();
      const width = Math.round(box.getWidth() * scale);
      const height = Math.round(box.getHeight() * scale);
      const origin = new Point(box.getX() * scale, box.getY() * scale);
      const source = preparedCanvas(width, height, origin, scale);
      const sourceContext = shadowPaintContext(source, box);
      const shadow = preparedCanvas(width, height, origin, scale);
      let color: HTMLCanvasElement;
      let mask: HTMLCanvasElement;
      try {
        node.paint(sourceContext);
        fillWithPattern(shadow, effect.$pat, effect.$opc);
        const offsetX = effect.$x * scale;
        const offsetY = effect.$y * scale;
        color = document.createElement("canvas");
        color.width = shadow._canvasContext.canvas.width;
        color.height = shadow._canvasContext.canvas.height;
        (color.getContext("2d") as CanvasRenderingContext2D).drawImage(
          shadow._canvasContext.canvas,
          0,
          0,
        );
        shadow.drawCanvas(
          source,
          offsetX,
          offsetY,
          1,
          Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
        );
        let blurScale = scale;
        if (effect.$r > 150 && (width > 1920 || height > 1080)) blurScale = 150 / effect.$r;
        const extents = node.getPaintBBox().scaled(scale, scale);
        const blur = new BlurEffect();
        blur.$r = effect.$r;
        blur.render(shadow, null, null, blurScale, extents, node);
        mask = shadow._canvasContext.canvas;
      } finally {
        source.finish();
        shadow.finish();
      }
      const x = box.getX();
      const y = box.getY();
      let area = new Rect(x, y, width, height);
      const canvasContext = context.canvas._canvasContext;
      const resource = canvasContext._createImageResource(color, false, mask);
      const inverseScale = 1 / (context.canvas.getScale() as number);
      area = area.scaled(inverseScale, inverseScale);
      area = area.translated(-area.getX(), -area.getY()).translated(x, y);
      const matrix = new Transform(
        area.getWidth(),
        0,
        0,
        area.getHeight(),
        area.getX(),
        canvasContext._y(area.getY()) - area.getHeight(),
      );
      const graphics = new PDFGraphics(canvasContext._doc);
      graphics.add(new PDFConcatMatrix(matrix));
      graphics.add("/" + resource.getName() + " Do");
      canvasContext._graphics.add(graphics);
    } else {
      const box = node.getPaintBBox();
      const canvas = context.canvas.createCanvas(box);
      try {
        let opacity = effect.$opc;
        if (node.hasMixin(Stylable)) {
          const layers = node.getPaintLayers();
          if (layers) {
            const fill = layers.getFillLayers(true)[0];
            if (fill) opacity *= fill.$_op;
          }
        }
        const graphics = canvas.getGraphics();
        const offset = new Transform(1, 0, 0, 1, effect.$x, -effect.$y);
        graphics.add(new PDFConcatMatrix(offset));
        canvas.putVertices(node as unknown as VertexSource);
        canvas.fillVertices(effect.$pat as unknown as PaintStyle, opacity);
      } finally {
        canvas.finish();
      }
    }
  }

  toString(): string {
    return "[Object GPDFDropShadowEffect]";
  }
}
