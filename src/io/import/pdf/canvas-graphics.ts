// Old: chunk.vendor.js module 1397.
//
// The CanvasGraphics subclass the PDF import renders with (pdf.js's
// render() option canvasGraphicsClass). It draws into the canvas bridge
// (pdf-canvas-bridge.ts) and changes a few operators:
// - beginDrawing sets the context defaults without pdf.js's background
//   fill and transparency group;
// - text blocks tell the bridge where they begin and end;
// - form XObjects don't clip to their bounding box, shading fills paint
//   into the current clip instead of a rectangle;
// - tiling patterns don't clip either (tiling-pattern.ts);
// - inline images become canvases the bridge turns into images.
//
// The text, form and shading changes replace pdf.js's operator table
// entries (numeric keys); the named methods are untouched, as in the old
// subclass. The class is built once per loaded pdf.js.
import { System } from "../../../engine/core/system.ts";
import type {
  PdfCanvasGraphics,
  PdfCanvasGraphicsClass,
  PdfJs,
  PdfMatrix,
  PdfTilingPattern,
  PdfShadingPattern,
} from "./pdfjs.ts";
import { getTilingPatternClass } from "./tiling-pattern.ts";

/** pdf.js ImageKind values. */
const GRAYSCALE_1BPP = 1;
const RGB_24BPP = 2;
const RGBA_32BPP = 3;

/** What pdf.js hands paintInlineImageXObject: decoded pixels or an element. */
interface InlineImage {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray;
}

/** The bridge context methods the subclass calls beyond the 2D context API. */
interface BridgeContext {
  gfx?: unknown;
  fillStyle: unknown;
  strokeStyle: unknown;
  fillRule: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;
  globalCompositeOperation: string;
  font: string;
  lineDashOffset: number;
  _clipping: unknown;
  setLineDash?: (dash: number[]) => void;
  beginText(): void;
  endText(): void;
  fill(rule: unknown, node: unknown): void;
  save(): void;
  scale(x: number, y: number): void;
  transform(...matrix: number[]): void;
  drawImage(...args: unknown[]): void;
  mozCurrentTransform: PdfMatrix;
  mozCurrentTransformInverse: PdfMatrix;
}

interface FactoryWithOwner {
  gfx: unknown;
}

/**
 * Copies decoded pixels into a 2D context in chunks of 16 rows (pdf.js's
 * putBinaryImageData, which Gravit copied into the subclass).
 */
function putBinaryImageData(ctx: CanvasRenderingContext2D, image: InlineImage): void {
  if (typeof ImageData !== "undefined" && (image as unknown) instanceof ImageData) {
    ctx.putImageData(image as unknown as ImageData, 0, 0);
    return;
  }
  const height = image.height;
  const width = image.width;
  const partialChunkHeight = height % 16;
  const fullChunks = (height - partialChunkHeight) / 16;
  const totalChunks = partialChunkHeight === 0 ? fullChunks : fullChunks + 1;
  const chunkImgData = ctx.createImageData(width, 16);
  let srcPos = 0;
  const src = image.data as Uint8Array;
  const dest = chunkImgData.data;
  let i: number;
  let j: number;
  let thisChunkHeight: number;
  let destPos: number;
  let elemsInThisChunk: number;
  if (image.kind === GRAYSCALE_1BPP) {
    const srcLength = src.byteLength;
    const dest32 = new Uint32Array(dest.buffer, 0, dest.byteLength >> 2);
    const dest32DataLength = dest32.length;
    const fullSrcDiff = (width + 7) >> 3;
    const white = 4294967295;
    const black = System.littleEndian ? 4278190080 : 255;
    for (i = 0; i < totalChunks; i++) {
      thisChunkHeight = i < fullChunks ? 16 : partialChunkHeight;
      destPos = 0;
      for (j = 0; j < thisChunkHeight; j++) {
        const srcDiff = srcLength - srcPos;
        let k = 0;
        const kEnd = srcDiff > fullSrcDiff ? width : srcDiff * 8 - 7;
        const kEndUnrolled = kEnd & -8;
        let mask = 0;
        let srcByte = 0;
        for (; k < kEndUnrolled; k += 8) {
          srcByte = src[srcPos++] as number;
          dest32[destPos++] = srcByte & 128 ? white : black;
          dest32[destPos++] = srcByte & 64 ? white : black;
          dest32[destPos++] = srcByte & 32 ? white : black;
          dest32[destPos++] = srcByte & 16 ? white : black;
          dest32[destPos++] = srcByte & 8 ? white : black;
          dest32[destPos++] = srcByte & 4 ? white : black;
          dest32[destPos++] = srcByte & 2 ? white : black;
          dest32[destPos++] = srcByte & 1 ? white : black;
        }
        for (; k < kEnd; k++) {
          if (mask === 0) {
            srcByte = src[srcPos++] as number;
            mask = 128;
          }
          dest32[destPos++] = srcByte & mask ? white : black;
          mask >>= 1;
        }
      }
      while (destPos < dest32DataLength) dest32[destPos++] = 0;
      ctx.putImageData(chunkImgData, 0, i * 16);
    }
  } else if (image.kind === RGBA_32BPP) {
    j = 0;
    elemsInThisChunk = width * 16 * 4;
    for (i = 0; i < fullChunks; i++) {
      dest.set(src.subarray(srcPos, srcPos + elemsInThisChunk));
      srcPos += elemsInThisChunk;
      ctx.putImageData(chunkImgData, 0, j);
      j += 16;
    }
    if (i < totalChunks) {
      elemsInThisChunk = width * partialChunkHeight * 4;
      dest.set(src.subarray(srcPos, srcPos + elemsInThisChunk));
      ctx.putImageData(chunkImgData, 0, j);
    }
  } else if (image.kind === RGB_24BPP) {
    thisChunkHeight = 16;
    elemsInThisChunk = width * thisChunkHeight;
    for (i = 0; i < totalChunks; i++) {
      if (i >= fullChunks) {
        thisChunkHeight = partialChunkHeight;
        elemsInThisChunk = width * thisChunkHeight;
      }
      destPos = 0;
      for (j = elemsInThisChunk; j--;) {
        dest[destPos++] = src[srcPos++] as number;
        dest[destPos++] = src[srcPos++] as number;
        dest[destPos++] = src[srcPos++] as number;
        dest[destPos++] = 255;
      }
      ctx.putImageData(chunkImgData, 0, i * 16);
    }
  } else {
    throw new Error("bad image kind: " + image.kind);
  }
}

const classes = new WeakMap<PdfJs, PdfCanvasGraphicsClass>();

/** The import's CanvasGraphics class for a loaded pdf.js. */
export function getImportCanvasGraphicsClass(pdfjs: PdfJs): PdfCanvasGraphicsClass {
  const existing = classes.get(pdfjs);
  if (existing) return existing;
  const Base = pdfjs.CanvasGraphics;
  const basePrototype = Base.prototype as unknown as Record<
    number | string,
    (...args: unknown[]) => unknown
  >;
  const TilingPattern = getTilingPatternClass(pdfjs);
  const OPS = pdfjs.OPS as Record<string, number>;

  class ImportCanvasGraphics extends Base {
    constructor(
      canvasContext: unknown,
      commonObjs: unknown,
      objs: unknown,
      canvasFactory: unknown,
      webGLContext: unknown,
      imageLayer?: unknown,
    ) {
      super(canvasContext, commonObjs, objs, canvasFactory, webGLContext, imageLayer);
      (canvasContext as BridgeContext).gfx = this;
      (canvasFactory as FactoryWithOwner).gfx = this;
    }

    beginDrawing(options: {
      transform?: PdfMatrix | null;
      viewport: { transform: PdfMatrix };
    }): void {
      const transform = options.transform;
      const viewport = options.viewport;
      const ctx = this.ctx as unknown as BridgeContext;
      ctx.save();
      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#000000";
      ctx.fillRule = "nonzero";
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.miterLimit = 10;
      ctx.globalCompositeOperation = "source-over";
      ctx.font = "10px sans-serif";
      if (ctx.setLineDash !== undefined) {
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
      if (transform) ctx.transform(...transform);
      ctx.transform(...viewport.transform);
      this.baseTransform = ctx.mozCurrentTransform.slice();
      if (this.imageLayer) this.imageLayer.beginLayout();
    }

    getColorN_Pattern(ir: ArrayLike<unknown>): PdfTilingPattern | PdfShadingPattern {
      if (ir[0] === "TilingPattern") {
        const color = ir[1];
        const baseTransform = this.baseTransform || this.ctx.mozCurrentTransform.slice();
        const owner = this as unknown as PdfCanvasGraphics;
        const factory = {
          createCanvasGraphics: (ctx: unknown) =>
            new ImportCanvasGraphics(
              ctx,
              owner.commonObjs,
              owner.objs,
              owner.canvasFactory,
              owner.webGLContext,
            ),
        };
        return new TilingPattern(ir, color, this.ctx, factory, baseTransform);
      }
      return pdfjs.getShadingPatternFromIR(ir);
    }

    /** Inline images: pixels go through a canvas the bridge turns into an image. */
    paintInlineImageXObject(image: InlineImage): void {
      const width = image.width;
      const height = image.height;
      const ctx = this.ctx;
      this.save();
      ctx.scale(1 / width, -1 / height);
      const inverse = ctx.mozCurrentTransformInverse;
      const a = inverse[0] as number;
      const b = inverse[1] as number;
      let widthScale = Math.max(Math.sqrt(a * a + b * b), 1);
      const c = inverse[2] as number;
      const d = inverse[3] as number;
      let heightScale = Math.max(Math.sqrt(c * c + d * d), 1);
      let imgToPaint: unknown;
      let tmpCanvas: { canvas: unknown; context: unknown };
      if ((image as unknown) instanceof HTMLElement || !image.data) {
        imgToPaint = image;
      } else {
        // Unused, as before (it only creates a scratch canvas).
        this.cachedCanvases.getCanvas("inlineImage", width, height);
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        putBinaryImageData(canvas.getContext("2d") as CanvasRenderingContext2D, image);
        imgToPaint = canvas;
      }
      let paintWidth = width;
      let paintHeight = height;
      let tmpCanvasId = "prescale1";
      while ((widthScale > 2 && paintWidth > 1) || (heightScale > 2 && paintHeight > 1)) {
        let newWidth = paintWidth;
        let newHeight = paintHeight;
        if (widthScale > 2 && paintWidth > 1) {
          newWidth = Math.ceil(paintWidth / 2);
          widthScale /= paintWidth / newWidth;
        }
        if (heightScale > 2 && paintHeight > 1) {
          newHeight = Math.ceil(paintHeight / 2);
          heightScale /= paintHeight / newHeight;
        }
        tmpCanvas = this.cachedCanvases.getCanvas(tmpCanvasId, newWidth, newHeight);
        const tmpCtx = tmpCanvas.context as {
          clearRect(x: number, y: number, w: number, h: number): void;
          drawImage(...args: unknown[]): void;
        };
        tmpCtx.clearRect(0, 0, newWidth, newHeight);
        tmpCtx.drawImage(imgToPaint, 0, 0, paintWidth, paintHeight, 0, 0, newWidth, newHeight);
        imgToPaint = tmpCanvas.canvas;
        paintWidth = newWidth;
        paintHeight = newHeight;
        tmpCanvasId = tmpCanvasId === "prescale1" ? "prescale2" : "prescale1";
      }
      ctx.drawImage(imgToPaint, 0, 0, paintWidth, paintHeight, 0, -height, width, height);
      if (this.imageLayer) {
        const position = this.getCanvasPosition(0, -height);
        this.imageLayer.appendImage({
          imgData: image,
          left: position[0],
          top: position[1],
          width: width / (inverse[0] as number),
          height: height / (inverse[3] as number),
        });
      }
      this.restore();
    }
  }

  const prototype = ImportCanvasGraphics.prototype as unknown as Record<number, unknown>;

  prototype[OPS.beginText as number] = function (this: PdfCanvasGraphics) {
    (basePrototype.beginText as () => void).call(this);
    (this.ctx as unknown as BridgeContext).beginText();
  };

  prototype[OPS.endText as number] = function (this: PdfCanvasGraphics) {
    (basePrototype.endText as () => void).call(this);
    (this.ctx as unknown as BridgeContext).endText();
  };

  // No clip to the form's bounding box; the base transform is the live
  // matrix (not a copy), as before.
  prototype[OPS.paintFormXObjectBegin as number] = function (
    this: PdfCanvasGraphics,
    matrix: unknown,
  ) {
    this.save();
    this.baseTransformStack.push(this.baseTransform);
    if (Array.isArray(matrix) && matrix.length === 6) this.transform(...(matrix as number[]));
    this.baseTransform = this.ctx.mozCurrentTransform;
  };

  // The shading fills the current clip node instead of a rectangle.
  prototype[OPS.shadingFill as number] = function (
    this: PdfCanvasGraphics,
    ir: ArrayLike<unknown>,
  ) {
    const ctx = this.ctx as unknown as BridgeContext;
    this.save();
    const pattern = pdfjs.getShadingPatternFromIR(ir);
    ctx.fillStyle = pattern.getPattern(ctx, this, true);
    ctx.fill(null, ctx._clipping);
    this.restore();
  };

  classes.set(pdfjs, ImportCanvasGraphics);
  return ImportCanvasGraphics;
}
