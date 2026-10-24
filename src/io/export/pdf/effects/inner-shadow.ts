// Old: chunk.vendor.js module 1449 (GPDFInnerShadowEffect).
import { Color } from "../../../../engine/color/color.ts";
import { VertexSource } from "../../../../engine/geometry/vertex-source.ts";
import { Point } from "../../../../engine/math/point.ts";
import { Rect } from "../../../../engine/math/rect.ts";
import { Transform } from "../../../../engine/math/transform.ts";
import { Canvas2DPaintCanvas, type PaintStyle } from "../../../../engine/paint/paint-canvas.ts";
import { CompoundPath } from "../../../../engine/scene/compound-path.ts";
import { CompoundShape } from "../../../../engine/scene/compound-shape.ts";
import { Image } from "../../../../engine/scene/image.ts";
import { BlurEffect } from "../../../../engine/style/effects/blur-effect.ts";
import type { InnerShadowEffect } from "../../../../engine/style/effects/inner-shadow-effect.ts";
import { ColorSpaces } from "../color-spaces.ts";
import { PDFGraphics, PDFStroke } from "../content-stream.ts";
import { PDFFillPaint } from "../fill-pattern.ts";
import { PDFInvokeResource } from "../invoke-resource.ts";
import { PDFObjectCollection } from "../object-collection.ts";
import { PDFConcatMatrix } from "../op-cm.ts";
import { PDFOperators } from "../operators.ts";
import type { PDFCanvasContext } from "../pdf-canvas.ts";
import type { PDFPaintContext } from "../pdf-paint-context.ts";
import type { PDFObject } from "../pdf-object.ts";
import { PDFStrokePaint } from "../stroke-pattern.ts";
import {
  fillWithPattern,
  preparedCanvas,
  shadowPaintContext,
  type ShadowNode,
  type ShadowProperties,
} from "./drop-shadow.ts";

/** The node calls of the inner shadow besides the drop shadow's. */
interface InnerShadowNode extends ShadowNode {
  $pat?: unknown;
  hasStyleFill(): boolean;
}

/**
 * An inner shadow, for images and filled nodes. The vector form was meant
 * for sharp shadows in a plain color, but it tests the node's `$pat`,
 * which nodes don't have, so every inner shadow is rendered as an image:
 * the shadow color outside the offset shape, blurred, cut to the shape.
 */
export class PDFInnerShadowEffect {
  render(
    context: PDFPaintContext,
    node: InnerShadowNode,
    effect: InnerShadowEffect & ShadowProperties,
  ): void {
    if (effect.$pat && 0 !== effect.$opc && (node instanceof Image || node.hasStyleFill())) {
      if (!(effect.$r > 0) && node.hasMixin(VertexSource) && node.$pat instanceof Color) {
        this._createVectorShadow(context, node, effect);
      } else this._createBitmapShadow(context, node, effect);
    }
  }

  _createBitmapShadow(
    context: PDFPaintContext,
    node: InnerShadowNode,
    effect: InnerShadowEffect & ShadowProperties,
  ): void {
    const scale = context.canvas.getScale() as number;
    const padding = (effect.getAbsoluteEffectPadding() as unknown as number[]).map((value) =>
      Math.ceil(value * scale),
    );
    const box = node.getPaintBBox();
    let extents = context.canvas.getPaintExtents(box, true, padding);
    let finalExtents = context.canvas.getFinalExtents(extents);
    const translation = context.canvas.getTransform().getTranslation();
    const target = new Point(-finalExtents.getX(), -finalExtents.getY());
    const correction = context.canvas.getTranslateCorrection(translation, target);
    const inverseScale = 1 / scale;
    const dx = correction.getX() * inverseScale;
    const dy = correction.getY() * inverseScale;
    const corrected = box
      .translated(dx, dy)
      .expanded(inverseScale, inverseScale, inverseScale, inverseScale);
    extents = context.canvas.getPaintExtents(corrected, true, padding);
    finalExtents = context.canvas.getFinalExtents(extents).toRoundedPrecision();
    const area = new Rect(
      finalExtents.getX(),
      finalExtents.getY(),
      Math.ceil(finalExtents.getWidth()),
      Math.ceil(finalExtents.getHeight()),
    );
    const topLeft = area.getSide(Rect.Side.TOP_LEFT);
    const source = preparedCanvas(area.getWidth(), area.getHeight(), topLeft, scale);
    const sourceContext = shadowPaintContext(source);
    const shadow = preparedCanvas(area.getWidth(), area.getHeight(), topLeft, scale);
    let color: HTMLCanvasElement;
    try {
      node.paint(sourceContext);
      fillWithPattern(shadow, effect.$pat as NonNullable<ShadowProperties["$pat"]>, effect.$opc);
      const filled = shadow.getBitmap().getHTMLElement();
      color = document.createElement("canvas");
      color.width = shadow.getWidth();
      color.height = shadow.getHeight();
      (color.getContext("2d") as CanvasRenderingContext2D).drawImage(filled, 0, 0);
      const offsetX = effect.$x * scale;
      const offsetY = effect.$y * scale;
      shadow.drawCanvas(
        source,
        offsetX,
        offsetY,
        1,
        Canvas2DPaintCanvas.CompositeOperator.DestinationOut,
      );
      Canvas2DPaintCanvas.disableFilters();
      try {
        const blur = new BlurEffect();
        blur.setAffectedByGLBug(true);
        blur.$r = effect.$r;
        blur.render(shadow, null, null, scale, area, node);
      } finally {
        Canvas2DPaintCanvas.enableFilters();
      }
      shadow.drawCanvas(source, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationIn);
    } finally {
      source.finish();
      shadow.finish();
    }
    const canvasContext = context.canvas.getContext();
    const mask = shadow.getBitmap().getHTMLElement();
    const resource = canvasContext.createPNGImageResource(color, mask);
    const pageArea = area.scaled(1 / scale, 1 / scale);
    const matrix = new Transform(
      pageArea.getWidth(),
      0,
      0,
      pageArea.getHeight(),
      pageArea.getX(),
      canvasContext._y(pageArea.getY()) - pageArea.getHeight(),
    );
    const graphics = new PDFGraphics(canvasContext.getDocument());
    graphics.add(new PDFConcatMatrix(matrix));
    graphics.add(new PDFInvokeResource(resource));
    canvasContext.getGraphics().add(graphics);
  }

  _createVectorShadow(
    context: PDFPaintContext,
    node: InnerShadowNode,
    effect: InnerShadowEffect & ShadowProperties,
  ): void {
    const box = node.getPaintBBox();
    const canvas = context.canvas.createCanvas(box);
    try {
      canvas.putVertices(node as unknown as VertexSource);
      let evenOdd = false;
      if (node instanceof CompoundPath || node instanceof CompoundShape) {
        evenOdd = node.getProperty("evenodd") as boolean;
      }
      const graphics = canvas.getGraphics();
      const canvasContext = canvas.getContext();
      const path = (
        graphics.pop() as NonNullable<ReturnType<PDFGraphics["pop"]>>
      ).getValue() as PDFObject;
      const mask = new PDFObjectCollection();
      this._applyOpacityMask(canvasContext, mask, path, evenOdd);
      this._applyGaps(canvasContext, mask, path);
      this._applyTransparency(canvasContext, mask, path, evenOdd, effect);
      let opacity = effect.$opc;
      const fill = (
        node.getPaintLayers() as NonNullable<ReturnType<ShadowNode["getPaintLayers"]>>
      ).getFillLayers(true)[0];
      if (fill) opacity *= fill.$_op;
      const gstate = canvasContext.createSMaskGStateResource(mask);
      graphics.setGStateResource(gstate);
      graphics.add(path);
      const visible = (canvas.getTransform(false).inverted() as Transform).mapRect(
        new Rect(0, 0, canvas.getWidth(), canvas.getHeight()),
      );
      const paint = canvas.createPatternPaint(
        effect.$pat as NonNullable<ShadowProperties["$pat"]>,
        visible,
      ) as NonNullable<ReturnType<Canvas2DPaintCanvas["createPatternPaint"]>>;
      canvas.fillVertices(paint.paint as PaintStyle, opacity);
    } finally {
      canvas.finish();
    }
  }

  _applyOpacityMask(
    context: PDFCanvasContext,
    mask: PDFObjectCollection,
    path: PDFObject,
    evenOdd: boolean,
  ): PDFObjectCollection {
    mask.add(path);
    mask.add(
      new PDFFillPaint({
        transform: context.getTransform(),
        doc: context.getDocument(),
        color: "rgba(0,0,0,1)",
        colorSpace: ColorSpaces.GRAY,
      }),
    );
    mask.add(evenOdd ? PDFOperators.f$ : PDFOperators.f);
    return mask;
  }

  _applyGaps(context: PDFCanvasContext, mask: PDFObjectCollection, path: PDFObject): void {
    const stroke = new PDFStroke();
    stroke.lineWidth = 1;
    stroke.strokeStyle = new PDFStrokePaint({
      transform: context.getTransform(),
      doc: context.getDocument(),
      color: "rgba(0,0,0,1)",
      colorSpace: ColorSpaces.GRAY,
    });
    mask.add(path);
    mask.add(stroke);
  }

  _applyTransparency(
    context: PDFCanvasContext,
    mask: PDFObjectCollection,
    path: PDFObject,
    evenOdd: boolean,
    effect: ShadowProperties,
  ): void {
    mask.add(new PDFConcatMatrix(new Transform(1, 0, 0, 1, effect.$x, -effect.$y)));
    mask.add(path);
    mask.add(
      new PDFFillPaint({
        transform: context.getTransform(),
        doc: context.getDocument(),
        color: "rgba(0,0,0,0)",
        colorSpace: ColorSpaces.GRAY,
      }),
    );
    mask.add(evenOdd ? PDFOperators.f$ : PDFOperators.f);
  }

  toString(): string {
    return "[Object GPDFInnerShadowEffect]";
  }
}
