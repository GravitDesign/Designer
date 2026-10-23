// Old: chunk.vendor.js module 1216 (the PDF 2D context).
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Canvas2DPaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { PathsGraph } from "../../../engine/scene/paths-graph/paths-graph.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { Background } from "../../../engine/style/background.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Raster } from "../../../workers/raster.ts";
import { ZipEncoder } from "../../../workers/zip-encoder.ts";
import { BitmapExport } from "../bitmap-export.ts";
import { JpegEncoder } from "../jpeg-encoder.ts";
import { ColorSpaces, type PDFColorSpace } from "./color-spaces.ts";
import { PDFFill, PDFGraphics, PDFStroke } from "./content-stream.ts";
import { PDFLineDash } from "./dash.ts";
import { PDFDCTDecode } from "./dct-image.ts";
import { PDFExtGState } from "./ext-gstate.ts";
import { PDFFillPaint } from "./fill-pattern.ts";
import { PDFFlateDecode } from "./flate-decode.ts";
import type { PDFCanvasGradient, PDFGradientStop } from "./gradient-resource.ts";
import { PDFGroup } from "./group.ts";
import { PDFGStateReference } from "./gstate-ref.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFLineCap } from "./line-cap.ts";
import { PDFLineJoin } from "./line-join.ts";
import { PDFNodeMarker } from "./marked-content.ts";
import type { PDFMediaBox } from "./media-box.ts";
import { PDFObjectCollection } from "./object-collection.ts";
import { PDFConcatMatrix } from "./op-cm.ts";
import { OPERATIONFLAG_FILL, OPERATIONFLAG_STROKE } from "./operation-flags.ts";
import { PDFOperators } from "./operators.ts";
import { PDFClipPath } from "./path-holder.ts";
import { PDFPath } from "./path-writer.ts";
import type { PDFPaintCanvas } from "./pdf-canvas-bridge.ts";
import type { PDFDocument } from "./pdf-document.ts";
import { PDFImage } from "./pdf-image.ts";
import { PDFArray } from "./pdf-array.ts";
import type { PDFValue } from "./pdf-name.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFRectangle } from "./rect-op.ts";
import { PDFResourceGroup, type PDFResource } from "./resource.ts";
import type { PDFResources } from "./resources.ts";
import { PDFPatternSelection } from "./resource-operation.ts";
import { PDFSoftMask } from "./soft-mask.ts";
import { PDFStrokePaint } from "./stroke-pattern.ts";
import { PDFTransparencyGroup } from "./transparency-group.ts";
import { PDFFormXObject } from "./xobject.ts";

/** A canvas element or anything else with a 2D context and pixels. */
export interface PDFPixelSource {
  width: number;
  height: number;
  getContext(
    type: "2d",
  ): { getImageData(x: number, y: number, w: number, h: number): ImageData } | null;
}

/** The paint layer fields the context reads while a fill or border paints. */
interface LayerWithPattern {
  $_pt: unknown;
}

/** What the bitmap cache holds: the resource made for a bitmap. */
interface CachedBitmap {
  bitmap: PDFPixelSource;
  resource: PDFResource<PDFImage>;
}

/** The context's styles saved by save() and restored by restore(). */
interface SavedStyles {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
}

function pixelsOf(source: PDFPixelSource): Uint8ClampedArray {
  const context = source.getContext("2d") as NonNullable<ReturnType<PDFPixelSource["getContext"]>>;
  return context.getImageData(0, 0, source.width, source.height).data;
}

/** The `addColorStop` the PDF gradients get: the stops are kept for the shading. */
function addColorStop(this: PDFCanvasGradient, offset: number, color: string): void {
  if (!this._stops2) this._stops2 = [];
  (this._stops2 as PDFGradientStop[]).push({ stop: offset, color });
}

/**
 * What the paint canvas draws into instead of a Canvas 2D context: paths
 * become PDF path commands, fills and strokes PDF paint operators (with
 * graphics states for opacity and blend modes, soft masks for transparent
 * gradients), images and rasterized nodes image XObjects. Everything goes
 * into the current graphics block of the document.
 */
export class PDFCanvasContext {
  _doc: PDFDocument;
  _graphics: PDFGraphics;
  _saveRestoreStack: SavedStyles[];
  declare _pageSize: PDFMediaBox | null;
  declare _pageOrigin: Point | null;
  declare _resources: PDFResources | null;
  declare _bitmapCache: CachedBitmap[] | null | undefined;
  declare canvas: PDFPaintCanvas;
  declare _currentPath: PDFPath;
  declare _transform: Transform;

  declare fillStyle: unknown;
  declare strokeStyle: unknown;
  declare lineWidth: number;
  declare globalAlpha: number;
  declare globalCompositeOperation: string;
  declare lineCap: string;
  declare lineJoin: string;
  declare miterLimit: number;
  declare dashArray: number[] | undefined;

  constructor(document: PDFDocument, graphics?: PDFGraphics) {
    this._doc = document;
    this._graphics = graphics || document.createGraphics();
    this._saveRestoreStack = [];
    this._pageSize = this._doc.getPageSize();
    this._pageOrigin = this._doc.getPageOrigin();
    this._resources = document.getCurrentResources();
  }

  createGraphics(): PDFGraphics {
    return new PDFGraphics(this._doc);
  }

  setPageOrigin(origin: Point | null | undefined): void {
    this._pageOrigin = origin || new Point(0, 0);
  }

  /**
   * In a paths graph a border is filled with the border paint after the
   * SourceIn fill: everything after the last path is dropped first.
   */
  _makeFillStyle(): void {
    const paintContext = this.canvas._paintContext;
    if (this.canvas.getCurrentNode() instanceof PathsGraph && paintContext._borderPaintLayer) {
      let last: unknown;
      do {
        if ((last = this._graphics.peek().getValue()) instanceof PDFPath) break;
        this._graphics.pop();
      } while (last);
      const fillStyle = this.fillStyle;
      this.fillStyle = (paintContext._borderPaintLayer as LayerWithPattern).$_pt;
      try {
        this.fill();
      } finally {
        this.fillStyle = fillStyle;
      }
    }
  }

  pop(): PDFValue | undefined {
    return this._graphics.pop();
  }

  peek(): PDFValue {
    return this._graphics.peek();
  }

  getGraphics(): PDFGraphics {
    return this._graphics;
  }

  getDocument(): PDFDocument {
    return this._doc;
  }

  getParent(): PDFCanvasContext | null {
    return this.canvas._parent ? this.canvas._parent._canvasContext : null;
  }

  setClip(clip: PDFObject | null): void {
    this._graphics.setClip(clip);
  }

  _pushStyles(stack: SavedStyles[]): void {
    stack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
    });
  }

  _popStyles(stack: SavedStyles[]): void {
    const saved = stack.pop() as SavedStyles;
    this.fillStyle = saved.fillStyle;
    this.strokeStyle = saved.strokeStyle;
    this.lineWidth = saved.lineWidth;
  }

  /** Visits this context and, unless `visit` returns truthy, the contexts of the sub-canvases. */
  accept(visit: (context: PDFCanvasContext) => unknown): void {
    if (!visit(this) && this.canvas._children) {
      for (const child of this.canvas._children) child._canvasContext.accept(visit);
    }
  }

  /**
   * Draws the current node's image (only images are drawn): the image
   * canvas, downsampled first to the size it is shown at when the
   * document downsamples and the image is shown smaller than it is.
   */
  drawImage(
    image: { width: number; height: number },
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    destX?: number,
    destY?: number,
    destWidth?: number,
    destHeight?: number,
  ): void {
    const node = this.canvas.getCurrentNode();
    if (!(node instanceof Image)) return;
    const jpeg = !!node.getType() && node.getType() === Image.Type.JPEG;
    let source = node.getImageCanvas() as unknown as PDFPixelSource;
    const sourceWidth = source.width;
    const sourceHeight = source.height;
    destWidth = destWidth || width || image.width;
    destHeight = destHeight || height || image.height;
    const imageTransform = node.getImageTransform() || new Transform();
    if (this._doc.isDownsamplingImages()) {
      const maximum = BitmapExport.getMaximumCanvasSize();
      const shown = this._transform.mapRect(new Rect(0, 0, destWidth, destHeight));
      if (
        !shown.isEmpty() &&
        shown.getWidth() < maximum.width &&
        shown.getHeight() < maximum.height &&
        shown.getWidth() * shown.getHeight() < maximum.area
      ) {
        const imageWidth = node.getProperty("iw") as number;
        const imageHeight = node.getProperty("ih") as number;
        if (
          imageWidth &&
          imageHeight &&
          shown.getWidth() < imageWidth &&
          shown.getHeight() < imageHeight
        ) {
          const scale = Math.min(
            shown.getWidth() / source.width,
            shown.getHeight() / source.height,
          );
          const smaller = document.createElement("canvas");
          smaller.width = Math.ceil(source.width * scale);
          smaller.height = Math.ceil(source.height * scale);
          (smaller.getContext("2d") as CanvasRenderingContext2D).drawImage(
            source as unknown as CanvasImageSource,
            0,
            0,
            source.width,
            source.height,
            0,
            0,
            source.width * scale,
            source.height * scale,
          );
          source = smaller;
        }
      }
    }
    const resource = this._createImageResource(source, jpeg);
    if (this._hasBlendMode() || 1 != this.globalAlpha) {
      this._graphics.setGStateResource(
        this._createGStateResource(
          this.globalAlpha,
          OPERATIONFLAG_FILL,
          this.globalCompositeOperation,
        ),
      );
    }
    const draw = new PDFGraphics(this._doc);
    draw.add(new PDFConcatMatrix(new Transform(sourceWidth, 0, 0, sourceHeight, 0, -sourceHeight)));
    draw.add("/" + resource.getName() + " Do");
    this._graphics.add(new PDFConcatMatrix(this._doc.convertToPDFCoordinates(imageTransform)));
    this._graphics.add(draw);
  }

  /**
   * Replaces the drawing of `node` (between its markers, in this context
   * or a sub-canvas) with `bitmap` over `area` (its paint box by default),
   * clipped to `clipBox` when given. The graphics state of the block after
   * the drawing is kept; with `applyNodeStyle` the node's own opacity and
   * blend mode are used when there is none.
   */
  replaceWithBitmap(
    bitmap: PDFPixelSource,
    node: Node,
    area?: Rect | null,
    clipBox?: Rect | null,
    applyNodeStyle?: boolean,
  ): void {
    let resource: PDFResource<PDFImage> | undefined;
    if (this._bitmapCache) {
      this._bitmapCache.some(
        (entry) => entry.bitmap === bitmap && ((resource = entry.resource), true),
      );
    }
    if (!resource) {
      let jpeg = true;
      if (node instanceof Image) jpeg = node.isJPEG();
      resource = this._createImageResource(bitmap, jpeg);
      this._bitmapCache = this._bitmapCache || [];
      this._bitmapCache.push({ bitmap, resource });
    }
    const imageResource = resource;
    area = area || (node as unknown as { getPaintBBox(): Rect }).getPaintBBox();
    const x = area.getX();
    const y = area.getY();
    let box = new Rect(x, y, bitmap.width, bitmap.height);
    const inverseScale = 1 / (this.canvas.getScale() as number);
    box = box.scaled(inverseScale, inverseScale);
    box = box.translated(-box.getX(), -box.getY()).translated(x, y);
    const matrix = new Transform(
      box.getWidth(),
      0,
      0,
      box.getHeight(),
      box.getX(),
      this._y(box.getY()) - box.getHeight(),
    );
    const begin = new PDFNodeMarker(node, PDFNodeMarker.Type.BEGIN);
    const end = new PDFNodeMarker(node, PDFNodeMarker.Type.END);
    this.accept((context) => {
      context._graphics.accept((value, index) => {
        if (!value.equals(begin)) return undefined;
        const replacement = new PDFGraphics(this._doc);
        if (clipBox) {
          replacement.add(
            new PDFClipPath(
              new PDFRectangle(
                clipBox.getX(),
                this._y(clipBox.getY()) - clipBox.getHeight(),
                clipBox.getWidth(),
                clipBox.getHeight(),
              ),
            ),
          );
        }
        replacement.add(new PDFConcatMatrix(matrix));
        replacement.add("/" + imageResource.getName() + " Do");
        context._graphics.add(replacement, index++);
        const next = context._graphics.get(index + 1);
        let gstate: PDFObject | null;
        if (next && next.getValue() instanceof PDFGraphics) {
          if ((gstate = (next.getValue() as PDFGraphics).getGSStateResource())) {
            replacement.setGStateResource(gstate);
          }
        }
        if (applyNodeStyle && !replacement.getGSStateResource() && node.hasMixin(Stylable)) {
          const styled = node as unknown as { getProperty(name: string): unknown };
          const blendMode = styled.getProperty("_sbl") as string;
          const opacity = styled.getProperty("_stop") as number;
          if (this._hasBlendMode(blendMode) || 1 != opacity) {
            replacement.setGStateResource(
              this._createGStateResource(opacity, OPERATIONFLAG_FILL, blendMode),
            );
          }
        }
        let removed: PDFValue | undefined;
        do {
          removed = context._graphics.get(index);
          if (removed) {
            context._graphics.remove(index);
            if (removed.equals(end)) break;
          }
        } while (removed);
        return false;
      });
    });
  }

  createPNGImageResource(
    bitmap: PDFPixelSource,
    mask?: PDFPixelSource | null,
  ): PDFResource<PDFImage> {
    return this._createImageResource(bitmap, false, mask);
  }

  /**
   * An image XObject of the pixels in the document's color space, deflated
   * or (for JPEG sources) JPEG-encoded, with a soft mask from `mask` or
   * from the pixels' alpha when any is below 255. Images larger than
   * 100 x 100 are converted and encoded in the export workers.
   */
  _createImageResource(
    bitmap: PDFPixelSource,
    jpeg: boolean,
    mask?: PDFPixelSource | null,
  ): PDFResource<PDFImage> {
    let colorSpace: PDFColorSpace = this._doc.getColorSpace();
    if (colorSpace != ColorSpaces.CMYK && colorSpace != ColorSpaces.RGB) {
      throw new Error("Unsupported color space");
    }
    if (jpeg && colorSpace === ColorSpaces.RGB) colorSpace = ColorSpaces.RGBA;
    const space = colorSpace;
    let pixels: Uint8ClampedArray | null = pixelsOf(bitmap);
    const maskImage = new PDFImage(bitmap.width, bitmap.height, ColorSpaces.GRAY);
    maskImage.putDictionary("/Interpolate", true);
    const image = this._doc.getIndirectObject(new PDFImage(bitmap.width, bitmap.height, space));
    image.getPDFObject().putDictionary("/Interpolate", true);
    const concurrent = () =>
      this._doc.hasConcurrencyFeature() && bitmap.width > 100 && bitmap.height > 100;
    const resources = this._resources || this._doc.getCurrentResources();
    const jpegSpace = () =>
      space === ColorSpaces.CMYK ? JpegEncoder.ColorSpace.CMYK : JpegEncoder.ColorSpace.RGBA;
    const encode = (data: Uint8ClampedArray, maskData: Uint8ClampedArray | null | undefined) => {
      if (maskData) {
        const maskObject = this._doc.getIndirectObject(maskImage);
        maskImage.setFilter(new PDFFlateDecode(maskData));
        image.getPDFObject().setMask(new PDFIndirectReference(maskObject));
        this._doc.addIndirectObject(maskObject);
        resources.add(PDFResourceGroup.Types.XOBJECT, new PDFIndirectReference(maskObject));
      }
      if (concurrent()) {
        if (jpeg) {
          const job = this._doc.beginJob("Encode JPEG");
          new JpegEncoder()
            .concurrenyEncode(
              this._doc,
              this._doc.getWorkers(),
              data.buffer as ArrayBuffer,
              image.getPDFObject().getWidth(),
              image.getPDFObject().getHeight(),
              jpegSpace(),
              this._doc.getJPEGQuality(),
            )
            .then((buffer) => {
              const filter = new PDFDCTDecode();
              filter.setBuffer(new Uint8Array(buffer));
              image.getPDFObject().setFilter(filter);
              job.done();
            })
            .catch((error: unknown) => job.failed(error));
        } else {
          const job = this._doc.beginJob("Encode ZIP");
          new ZipEncoder()
            .concurrencyEncode(this._doc, this._doc.getWorkers(), data.buffer as ArrayBuffer)
            .then((buffer) => {
              const filter = new PDFFlateDecode();
              filter.setBuffer(new Uint8Array(buffer));
              image.getPDFObject().setFilter(filter);
              job.done();
            })
            .catch((error: unknown) => job.failed(error));
        }
      } else {
        const filter = jpeg
          ? new PDFDCTDecode(
              image.getPDFObject().getWidth(),
              image.getPDFObject().getHeight(),
              new Uint32Array(data.buffer),
              jpegSpace(),
              this._doc.getJPEGQuality(),
            )
          : new PDFFlateDecode(data);
        image.getPDFObject().setFilter(filter);
      }
    };
    if (concurrent()) {
      const rasterize = (maskData?: Uint8ClampedArray | null) => {
        const job = this._doc.beginJob("Raster RGBA");
        new Raster()
          .concurrencyRaster(
            this._doc,
            this._doc.getWorkers(),
            (pixels as Uint8ClampedArray).buffer as ArrayBuffer,
            bitmap.width,
            bitmap.height,
            space,
            !!maskData,
          )
          .then((result) => {
            encode(result[0], maskData || result[1]);
            job.done();
          })
          .catch((error: unknown) => job.failed(error));
        pixels = null;
      };
      if (mask) {
        const job = this._doc.beginJob("Raster mask");
        const maskPixels = pixelsOf(mask);
        new Raster()
          .concurrencyRaster(
            this._doc,
            this._doc.getWorkers(),
            maskPixels.buffer as ArrayBuffer,
            mask.width,
            mask.height,
            ColorSpaces.GRAY,
            false,
          )
          .then((result) => {
            rasterize(result[0]);
            job.done();
          })
          .catch((error: unknown) => job.failed(error));
      } else rasterize();
    } else {
      let maskData: Uint8ClampedArray;
      if (mask) {
        maskData = new Uint8ClampedArray(mask.width * mask.height);
        new Raster().raster(pixelsOf(mask).buffer, ColorSpaces.GRAY, maskData);
      } else maskData = new Uint8ClampedArray(bitmap.width * bitmap.height);
      const data = new Uint8ClampedArray(bitmap.width * bitmap.height * space.length);
      const transparent = new Raster().raster(pixels.buffer, space, data, mask ? null : maskData);
      encode(data, mask || transparent ? maskData : null);
    }
    const resource = resources.add(PDFResourceGroup.Types.XOBJECT, new PDFIndirectReference(image));
    this._doc.addIndirectObject(image);
    return resource;
  }

  /**
   * A sub-canvas composited with an opacity below 1 or a blend mode: its
   * drawing moves into a transparency group form over the page, drawn
   * with a graphics state for the opacity and blend mode.
   */
  drawCanvas(
    canvas: PDFPaintCanvas,
    _x?: number,
    _y?: number,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    if ((null != opacity && opacity < 1) || this._hasBlendMode(compositeOperator)) {
      const gstate = this._createGStateResource(opacity, OPERATIONFLAG_FILL, compositeOperator);
      const content = new PDFGraphics(this._doc);
      content.add(canvas._canvasContext._graphics.clear());
      const origin = this._pageOrigin as Point;
      const matrix = (
        new Transform().translated(origin.getX(), origin.getY()).inverted() as Transform
      ).getMatrix();
      const left = matrix[4] as number;
      const top = matrix[5] as number;
      const pageSize = this._pageSize as PDFMediaBox;
      const bbox = new PDFArray();
      bbox.push(left);
      bbox.push(-Math.abs(top));
      bbox.push(Math.ceil(pageSize.width + Math.abs(left)));
      bbox.push(Math.ceil(pageSize.height + Math.abs(top)));
      const group = new PDFTransparencyGroup(content, bbox);
      const groupObject = this._doc.getIndirectObject(group);
      const resource = this._doc.addResource(
        PDFResourceGroup.Types.XOBJECT,
        new PDFIndirectReference(groupObject),
      );
      this._doc.addIndirectObject(groupObject);
      canvas._canvasContext._graphics.setGStateResource(gstate);
      canvas._canvasContext._graphics.add("/" + resource.getName() + " Do");
    }
  }

  /** A soft mask for a gradient paint with transparent stops: the gradient's alpha as gray. */
  _createStyleSMaskGStateResource(
    paint: PDFFillPaint | PDFStrokePaint,
    operation: number,
  ): PDFGStateReference | undefined {
    const pattern = paint.getPattern();
    if (pattern instanceof PDFPatternSelection) {
      const shading = pattern.getShading();
      if (shading.hasTransparency()) {
        const gradient = shading.getGradient();
        const inverseScale = 1 / (this.canvas.getScale() as number);
        const mask = new PDFObjectCollection();
        mask.add(this._graphics.peek());
        mask.add(
          new PDFFillPaint({
            transform: this.canvas.getTransform().scaled(inverseScale, inverseScale),
            doc: this._doc,
            color: gradient,
            colorSpace: ColorSpaces.GRAY,
          }),
        );
        if (operation & OPERATIONFLAG_FILL) mask.add(PDFOperators.f);
        if (operation & OPERATIONFLAG_STROKE) mask.add(PDFOperators.S);
        return this.createSMaskGStateResource(mask, operation);
      }
    }
    return undefined;
  }

  /**
   * A graphics state with a luminosity soft mask drawn by `content` (a
   * form over the page at the page origin), the current opacity and
   * blend mode.
   */
  createSMaskGStateResource(content: PDFObject, operation?: number): PDFGStateReference {
    const origin = this._pageOrigin as Point;
    const pageSize = this._pageSize as PDFMediaBox;
    const originTransform = new Transform().translated(origin.getX(), origin.getY());
    const bbox = new PDFArray([0, 0]);
    bbox.push(pageSize.width);
    bbox.push(pageSize.height);
    const group = new PDFGroup({ individual: true, colorSpace: ColorSpaces.GRAY });
    const form = this._doc.getIndirectObject(
      new PDFFormXObject(this._doc, content, group, bbox, originTransform),
    );
    const softMask = this._doc.getIndirectObject(
      new PDFSoftMask({
        subType: PDFSoftMask.SubType.LUMINOSITY,
        stream: new PDFIndirectReference(form),
      }),
    );
    const gstate = new PDFExtGState({
      type: PDFResourceGroup.Types.GSTATE.name,
      smask: new PDFIndirectReference(softMask),
      opacity: this.globalAlpha,
      operation,
      origin: originTransform,
      blendMode: this._hasBlendMode() ? this.globalCompositeOperation : null,
    });
    const gstateObject = this._doc.getIndirectObject(gstate);
    const resource = this._doc.addResource(
      PDFResourceGroup.Types.GSTATE,
      new PDFIndirectReference(gstateObject),
    );
    this._doc.addIndirectObject(gstateObject);
    this._doc.addIndirectObject(form);
    this._doc.addIndirectObject(softMask);
    return new PDFGStateReference(resource);
  }

  _createGStateResource(
    opacity: number | null | undefined,
    operation: number,
    blendMode?: string | null,
  ): PDFGStateReference {
    const gstate = new PDFExtGState({
      opacity,
      operation,
      blendMode: this._hasBlendMode(blendMode) ? blendMode : null,
    });
    const gstateObject = this._doc.getIndirectObject(gstate);
    const resource = this._doc.addResource(
      PDFResourceGroup.Types.GSTATE,
      new PDFIndirectReference(gstateObject),
    );
    this._doc.addIndirectObject(gstateObject);
    return new PDFGStateReference(resource);
  }

  /** Texture and angular patterns aren't supported; the fill gets no paint. */
  createPattern(): undefined {
    return undefined;
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): PDFCanvasGradient {
    const gradient = new LinearGradient() as PDFCanvasGradient;
    gradient._x0 = x0;
    gradient._y0 = y0;
    gradient._x1 = x1;
    gradient._y1 = y1;
    gradient.addColorStop = addColorStop;
    return gradient;
  }

  createRadialGradient(
    x0: number,
    y0: number,
    _r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): PDFCanvasGradient {
    const gradient = new RadialGradient(null, r1, x0, y0, x1, y1, null) as PDFCanvasGradient;
    gradient.addColorStop = addColorStop;
    return gradient;
  }

  beginPath(): void {
    this._currentPath = new PDFPath(this._doc);
    this._graphics.add(this._currentPath);
  }

  closePath(): void {
    this._currentPath.close();
  }

  /**
   * Strokes the current path. In a paths graph the border paint comes
   * from the border layer, with the graph's transform.
   */
  stroke(): void {
    if (!this._hasStroke()) return;
    let style = this.strokeStyle;
    let transform = this.canvas.getTransform();
    const node = this.canvas.getCurrentNode();
    const paintContext = this.canvas._paintContext;
    if (node instanceof PathsGraph && paintContext._borderPaintLayer) {
      const paint = node.createShapePaint(
        this as never,
        (paintContext._borderPaintLayer as LayerWithPattern).$_pt as never,
        paintContext._patternBBox || node.getPatternBBox(),
      ) as { transform: Transform | null; paint: unknown };
      if (paint.transform) {
        if (node.$trf) paint.transform = paint.transform.multiplied(node.$trf);
        transform = transform.multiplied(paint.transform);
      }
      style = paint.paint;
    }
    const inverseScale = 1 / (this.canvas.getScale() as number);
    const strokePaint = new PDFStrokePaint({
      transform: transform.scaled(inverseScale, inverseScale),
      doc: this._doc,
      color: style,
    });
    if (!strokePaint.isValid()) {
      console.warn("Invalid stroke style");
      return;
    }
    const stroke = new PDFStroke();
    stroke.strokeStyle = strokePaint;
    stroke.lineWidth = this.lineWidth;
    stroke.miterlimit = this.miterLimit;
    if (this.dashArray && this.dashArray.length) stroke.lineDash = new PDFLineDash(this.dashArray);
    let target = this._graphics;
    if (1 != this.globalAlpha || this._hasBlendMode(this.globalCompositeOperation)) {
      const gstate = this._createGStateResource(
        this.globalAlpha,
        OPERATIONFLAG_STROKE,
        this.globalCompositeOperation,
      );
      const graphics = new PDFGraphics(this._doc);
      graphics.setGStateResource(gstate);
      this._graphics.add(graphics);
      target = graphics;
    }
    if (this.lineCap) {
      const cap = (PDFLineCap.Style as Record<string, number>)[this.lineCap.toUpperCase()];
      if (cap) stroke.lineCap = new PDFLineCap(cap);
    }
    if (this.lineJoin) {
      const join = (PDFLineJoin.Style as Record<string, number>)[this.lineJoin.toUpperCase()];
      if (join) stroke.lineJoin = new PDFLineJoin(join);
    }
    target.add(stroke);
  }

  /**
   * Fills the current path. A node with a background fill drops the path
   * instead (the background shows the page). In a CMYK document a CMYK
   * fill layer is used as is rather than the screen color.
   */
  fill(rule?: string | null): void {
    if (this._isBackgroundFill()) {
      if (this._graphics.peek().getValue() instanceof PDFPath) this._graphics.pop();
      return;
    }
    if (!this._hasFill()) return;
    let style = this.fillStyle;
    const fillLayer = this.canvas._paintContext._fillPaintLayer as LayerWithPattern | undefined;
    if (
      this._doc.getColorSpace() === ColorSpaces.CMYK &&
      fillLayer &&
      fillLayer.$_pt instanceof CMYKColor
    ) {
      style = fillLayer.$_pt;
    }
    const inverseScale = 1 / (this.canvas.getScale() as number);
    const fillPaint = new PDFFillPaint({
      transform: this.canvas.getTransform().scaled(inverseScale, inverseScale),
      doc: this._doc,
      color: style,
    });
    if (!fillPaint.isValid()) {
      console.warn("Invalid fill style");
      return;
    }
    const fill = new PDFFill();
    fill.fillStyle = fillPaint;
    fill.rule = rule;
    let target = this._graphics;
    const mask = this._createStyleSMaskGStateResource(fillPaint, OPERATIONFLAG_FILL);
    if (mask) {
      target = new PDFGraphics(this._doc);
      target.setGStateResource(mask);
      this._graphics.add(target);
    }
    if ((1 != this.globalAlpha || this._hasBlendMode()) && !mask) {
      const gstate = this._createGStateResource(
        this.globalAlpha,
        OPERATIONFLAG_FILL,
        this.globalCompositeOperation,
      );
      target = new PDFGraphics(this._doc);
      target.setGStateResource(gstate);
      this._graphics.add(target);
    }
    target.add(fill);
  }

  _hasFill(): unknown {
    return this._hasStyle(this.fillStyle);
  }

  _hasStroke(): unknown {
    return this._hasStyle(this.strokeStyle);
  }

  _hasStyle(style: unknown): unknown {
    return this.globalAlpha && style && "transparent" !== style;
  }

  _isBackgroundFill(): boolean {
    const node = this.canvas.getCurrentNode();
    if (node && node.hasMixin(Stylable)) {
      const layers = (
        node as unknown as {
          getPaintLayers(): { getFillLayers(visible: boolean): LayerWithPattern[] } | null;
        }
      ).getPaintLayers();
      if (layers) {
        return !!layers.getFillLayers(true).filter((layer) => layer.$_pt instanceof Background)
          .length;
      }
    }
    return false;
  }

  /** Nothing to clear in a PDF. */
  clearRect(): void {}

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this._currentPath.quadraticCurveTo(cx, cy, x, y);
  }

  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
    this._currentPath.bezierCurveTo(x1, y1, x2, y2, x3, y3);
  }

  lineTo(x: number, y: number): void {
    this._currentPath.lineTo(x, y);
  }

  moveTo(x: number, y: number): void {
    this._currentPath.moveTo(x, y);
  }

  /**
   * Source-over: fills the rectangle (as a rectangle shape under the raw
   * canvas transform). Source-in after a fill: the paths graph border
   * fill (see _makeFillStyle). Other operators draw nothing.
   */
  fillRect(x: number, y: number, width: number, height: number): void {
    if (this.globalCompositeOperation === Canvas2DPaintCanvas.CompositeOperator.SourceIn) {
      if (this._graphics.peek().getValue() instanceof PDFFill) this._makeFillStyle();
    } else if (this.globalCompositeOperation == Canvas2DPaintCanvas.CompositeOperator.SourceOver) {
      const rectangle = new Rectangle(x, y, width, height);
      rectangle.transform(this.canvas.getTransform(true));
      this.canvas.putVertices(rectangle);
      this.fill();
    }
  }

  setLineDash(dashes: number[]): void {
    this.dashArray = dashes;
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this._transform = new Transform(a, b, c, d, e, f);
  }

  getTransform(): Transform {
    return this._transform;
  }

  _y(y: number): number {
    return (this._pageSize as PDFMediaBox).relativeY(y);
  }

  /** Whether the operator (the current one by default) is a blend mode other than normal. */
  _hasBlendMode(operator?: string | null): boolean {
    let found: string | undefined;
    const modes = Canvas2DPaintCanvas.BlendMode as Record<string, string>;
    for (const name of Object.keys(modes)) {
      if (modes[name] === (operator || this.globalCompositeOperation)) found = modes[name];
    }
    return !!found && found !== Canvas2DPaintCanvas.BlendMode.Normal;
  }

  save(): void {
    this._pushStyles(this._saveRestoreStack);
  }

  restore(): void {
    this._popStyles(this._saveRestoreStack);
  }

  finish(): void {
    this._doc.popGraphics();
    delete this._bitmapCache;
  }
}

Object.assign(PDFCanvasContext.prototype, {
  _resources: null,
  _pageSize: null,
  _pageOrigin: null,
  _bitmapCache: null,
});

/** For type checks of nodes the context reads (keeps the import used). */
export type PDFContextNode = Node;
