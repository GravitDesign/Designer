// Old: chunk.vendor.js module 345 (GBitmap).
import { Length } from "../math/length.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Context2D } from "./context-2d.ts";
import { JpegDpi } from "./png-dpi.ts";
import { PngChunks } from "./png-chunks.ts";
import { RecorderStateContext } from "./recorder-state-context.ts";
import { RenderScheduler } from "./render-scheduler.ts";

const ImageType = {
  PNG: "image/png",
  JPEG: "image/jpeg",
} as const;

/** A pixel modifier: gets the pixels of the area, its size and the extra argument. */
export type PixelModifier = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  argument: unknown,
) => unknown;

/** A filter for applyFilter: an object with an `apply` modifier. */
export interface BitmapFilter {
  apply: PixelModifier;
}

/** Image data that can run a modifier itself (the old recorder's lazy image data). */
interface RunnableImageData extends ImageData {
  runModifier?(modifier: PixelModifier, width: number, height: number, argument: unknown): void;
}

/** Something with a 2D context, like a PaintCanvas. */
interface ContextOwner {
  _canvasContext: Context2D;
}

/**
 * A bitmap backed by a canvas: made from a size, an image, a canvas, a 2D
 * context or a paint canvas (whose canvas it then shares).
 */
export class Bitmap {
  static ImageType = ImageType;

  declare _offset: Point;
  declare _dpi: number;
  _canvas: HTMLCanvasElement;
  _canvasContext: CanvasRenderingContext2D;

  constructor(
    source:
      | number
      | HTMLImageElement
      | HTMLCanvasElement
      | CanvasRenderingContext2D
      | ContextOwner
      | Bitmap,
    height?: number,
  ) {
    let width = 0;
    let canvasHeight = 0;
    let canvas: HTMLCanvasElement | null = null;
    let image: HTMLImageElement | null = null;
    if ("number" == typeof source) {
      width = source;
      canvasHeight = height as number;
    } else if (source instanceof Image || source instanceof HTMLImageElement) {
      width = source.naturalWidth;
      canvasHeight = source.naturalHeight;
      image = source;
    } else if (
      !(source instanceof Bitmap) &&
      (source as ContextOwner)._canvasContext instanceof CanvasRenderingContext2D
    ) {
      canvas = (source as ContextOwner)._canvasContext.canvas;
    } else if (
      source instanceof Bitmap ||
      !((source as ContextOwner)._canvasContext instanceof RecorderStateContext)
    ) {
      if (source instanceof HTMLCanvasElement) canvas = source;
      else if (source instanceof CanvasRenderingContext2D) canvas = source.canvas;
    } else {
      canvas = (source as ContextOwner)._canvasContext.canvas;
    }
    if (canvas) this._canvas = canvas;
    else {
      this._canvas = RenderScheduler.getRenderer().canvas;
      this._canvas.width = width;
      this._canvas.height = canvasHeight;
    }
    this._canvasContext = this._canvas.getContext("2d") as CanvasRenderingContext2D;
    if (image && width >= 0 && canvasHeight >= 0) {
      // The old code passed only the image, which drawImage rejects
      // (TypeError), so a bitmap can't be made from an image. Kept.
      Reflect.apply(this._canvasContext.drawImage, this._canvasContext, [image]);
    }
    this._offset = new Point(0, 0);
  }

  setDPI(dpi: number | null | undefined): void {
    this._dpi = dpi || Length.DPI;
  }

  getOffset(): Point {
    return this._offset;
  }

  getWidth(): number {
    return Math.floor(this._canvas.width);
  }

  getHeight(): number {
    return Math.floor(this._canvas.height);
  }

  /** The backing canvas. (`real` asked for the real canvas behind a recorded one; they're the same now.) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getHTMLElement(real?: boolean): HTMLCanvasElement {
    return this._canvas;
  }

  toImageDataUrl(type?: string, quality?: unknown): string {
    let args: unknown[] = [type];
    if (quality) args = args.concat(quality);
    return (this._canvas.toDataURL as (...a: unknown[]) => string).apply(this._canvas, args);
  }

  /**
   * Encodes the bitmap; `dpi` (default the bitmap's) other than 72 is
   * written into the PNG pHYs chunk or the JPEG JFIF header. Types like
   * "png" or "jpg" are accepted.
   */
  toImageBlob(
    type: string,
    callback: (blob: Blob | null) => void,
    quality?: unknown,
    dpi?: number,
  ): null | undefined {
    dpi = dpi || this._dpi || Length.DPI;
    const types = Object.keys(ImageType).map(
      (key) => ImageType[key as keyof typeof ImageType] as string,
    );
    if (-1 === types.indexOf(type)) {
      if (/jpeg/i.test(type) || /jpg/i.test(type)) type = ImageType.JPEG;
      else if (/png/i.test(type)) type = ImageType.PNG;
    }
    let args: unknown[] = [callback, type];
    if (quality) args = args.concat(quality);
    if (!this._canvas) return null;
    const toBlob = this._canvas.toBlob as unknown as (...a: unknown[]) => void;
    if ("function" == typeof this._canvas.toBlob) {
      if (-1 === types.indexOf(type) || isNaN(dpi) || dpi === Length.DPI) {
        toBlob.apply(this._canvas, args);
        return undefined;
      }
      const finalType = type;
      const finalDpi = dpi;
      let patched: unknown[] = [
        (blob: Blob) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const result = (event.target as FileReader).result as ArrayBuffer;
              if (finalType === ImageType.PNG) {
                const png = new PngChunks(result);
                png.setDPI(finalDpi);
                callback(png.getBlob());
              } else if (finalType === ImageType.JPEG) {
                const jpeg = new JpegDpi(result);
                jpeg.setDPI(finalDpi);
                callback(jpeg.getBlob());
              }
            } catch {
              toBlob.apply(this._canvas, args);
            }
          };
          reader.readAsArrayBuffer(blob);
        },
        type,
      ];
      if (quality) patched = patched.concat(quality);
      toBlob.apply(this._canvas, patched);
      return undefined;
    }
    return null;
  }

  toImageBuffer(
    type: string,
    callback: (buffer: ArrayBuffer) => void,
    quality?: unknown,
    dpi?: number,
  ): void {
    this.toImageBlob(
      type,
      (blob) => {
        if (blob instanceof Blob || (blob as unknown) instanceof File) {
          const reader = new FileReader();
          reader.onload = (event) => {
            callback((event.target as FileReader).result as ArrayBuffer);
          };
          reader.readAsArrayBuffer(blob as Blob);
        }
      },
      quality,
      dpi,
    );
  }

  /** A copy of `area` (default all); null for an area under one pixel. */
  clone(area?: Rect | null): Bitmap | null {
    area = area || new Rect(0, 0, this.getWidth(), this.getHeight());
    if (area.getWidth() < 1 || area.getHeight() < 1) return null;
    const copy = new Bitmap(area.getWidth(), area.getHeight());
    const data = this._canvasContext.getImageData(
      area.getX(),
      area.getY(),
      area.getWidth(),
      area.getHeight(),
    );
    copy._canvasContext.putImageData(data, 0, 0);
    return copy;
  }

  /** Changes the canvas size, keeping the pixels anchored at `side` (default top left). */
  resize(width?: number, height?: number, side?: string | null): void {
    width = width || 0;
    height = height || 0;
    side = side || Rect.Side.TOP_LEFT;
    if (!(width || height)) return;
    const deltaWidth = width - this.getWidth();
    const deltaHeight = height - this.getHeight();
    let left = 0;
    let top = 0;
    let right = 0;
    let bottom = 0;
    if (deltaWidth !== this.getWidth()) {
      switch (side) {
        case Rect.Side.TOP_LEFT:
        case Rect.Side.LEFT_CENTER:
        case Rect.Side.BOTTOM_LEFT:
          right = deltaWidth;
          break;
        case Rect.Side.TOP_CENTER:
        case Rect.Side.CENTER:
        case Rect.Side.BOTTOM_CENTER:
          left = -deltaWidth / 2;
          right = deltaWidth / 2;
          break;
        case Rect.Side.TOP_RIGHT:
        case Rect.Side.RIGHT_CENTER:
        case Rect.Side.BOTTOM_RIGHT:
          left = -deltaWidth;
      }
    }
    if (deltaHeight !== this.getHeight()) {
      switch (side) {
        case Rect.Side.TOP_LEFT:
        case Rect.Side.TOP_CENTER:
        case Rect.Side.TOP_RIGHT:
          bottom = deltaHeight;
          break;
        case Rect.Side.LEFT_CENTER:
        case Rect.Side.CENTER:
        case Rect.Side.RIGHT_CENTER:
          top = -deltaHeight / 2;
          bottom = deltaHeight / 2;
          break;
        case Rect.Side.BOTTOM_LEFT:
        case Rect.Side.BOTTOM_CENTER:
        case Rect.Side.BOTTOM_RIGHT:
          top = -deltaHeight;
      }
    }
    const data = this._canvasContext.getImageData(0, 0, this.getWidth(), this.getHeight());
    this._canvas.width = this.getWidth() - left + right;
    this._canvas.height = this.getHeight() - top + bottom;
    this._canvasContext.clearRect(0, 0, this.getWidth(), this.getHeight());
    this._canvasContext.putImageData(data, -left, -top);
  }

  /** Cuts `right` and `bottom` pixels off, starting at x, y, which becomes the offset. */
  crop(x?: number, y?: number, right?: number, bottom?: number): void {
    x = x || 0;
    y = y || 0;
    right = right || 0;
    bottom = bottom || 0;
    const width = this.getWidth() - right;
    const height = this.getHeight() - bottom;
    if (width > 0 && height > 0) {
      const data = this._canvasContext.getImageData(x, y, width, height);
      this._canvas.width = width;
      this._canvas.height = height;
      this._canvasContext.clearRect(0, 0, width, height);
      this._canvasContext.putImageData(data, 0, 0);
      this._offset = new Point(x, y);
    }
  }

  /** Crops to the bounding box of the non-transparent pixels. */
  trim(): void {
    const data = this._canvasContext.getImageData(0, 0, this.getWidth(), this.getHeight());
    const length = data.data.length;
    // Null until a pixel is found; the arithmetic below then works on null
    // the way the old code's did.
    const box: {
      top: number | null;
      left: number | null;
      right: number | null;
      bottom: number | null;
    } = {
      top: null,
      left: null,
      right: null,
      bottom: null,
    };
    const width = this.getWidth();
    const height = this.getHeight();
    for (let i = 0; i < length; i += 4) {
      if (0 !== data.data[i + 3]) {
        const column = (i / 4) % width;
        const row = ~~(i / 4 / width);
        if (null === box.top) box.top = row;
        if (null === box.left || column < box.left) box.left = column;
        if (null === box.right || box.right < column) box.right = column;
        if (null === box.bottom || box.bottom < row) box.bottom = row;
      }
    }
    const nullable = box as unknown as { top: number; left: number; right: number; bottom: number };
    nullable.bottom += 1;
    nullable.right += 1;
    this.crop(
      nullable.left,
      nullable.top,
      width - (nullable.right - nullable.left),
      height - (nullable.bottom - nullable.top),
    );
  }

  /** The RGBA of one pixel; coordinates are clamped to 0..size (so the far edge reads as transparent). */
  getPixelValue(x: number, y: number): Uint8ClampedArray {
    x = Math.max(0, Math.min(x, this.getWidth()));
    y = Math.max(0, Math.min(y, this.getHeight()));
    return this._canvasContext.getImageData(x, y, 1, 1).data;
  }

  /**
   * Runs `modifier` on the pixels of `area` (default all) and writes them
   * back. Returns the image data, or null for an empty area.
   */
  modifyPixels(
    modifier: PixelModifier,
    argument?: unknown,
    area?: Rect | null,
    runOnData?: boolean,
  ): ImageData | null {
    area = area || new Rect(0, 0, this.getWidth(), this.getHeight());
    if (0 === area.getWidth() || 0 === area.getHeight()) return null;
    const data = this._canvasContext.getImageData(
      area.getX(),
      area.getY(),
      area.getWidth(),
      area.getHeight(),
    ) as RunnableImageData;
    if (data.runModifier && runOnData)
      data.runModifier(modifier, area.getWidth(), area.getHeight(), argument);
    else modifier(data.data, area.getWidth(), area.getHeight(), argument);
    this._canvasContext.putImageData(data, area.getX(), area.getY());
    return data;
  }

  applyFilter(filter: BitmapFilter, argument?: unknown, area?: Rect | null): ImageData | null {
    return this.modifyPixels(filter.apply, argument, area, true);
  }

  toString(): string {
    return "[Object GBitmap]";
  }
}

Bitmap.prototype._dpi = Length.DPI;
