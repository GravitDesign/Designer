// Old: chunk.vendor.js module 1113 (raster task of the PDF export worker).
//
// Converts RGBA pixels to a PDF colour space (and an alpha mask), either
// here (`raster`) or split across the PDF export workers
// (`concurrencyRaster`, "raster" command, FMT-WORKER-012). The worker side
// calls `raster` on its slice.

import { bubbleSort, uuid } from "../engine/core/util.ts";
import type { MessageWorker, PromiseFactory } from "../io/export/jpeg-encoder.ts";
import { ColorSpaces } from "../io/export/pdf/color-spaces.ts";

/**
 * A PDF colour space as the raster task uses it (old module 359, the PDF
 * exporter's colour space table: RGB, RGBA, GRAY, CMYK).
 */
export interface RasterColorSpace {
  length: number;
  fromRGBA(red: number, green: number, blue: number, alpha: number): ArrayLike<number>;
}

/** What a worker answers to a "raster" request. */
export interface RasterResponse {
  uuid: string;
  index: number;
  command: "raster";
  imageBuffer?: ArrayBuffer;
  smaskBuffer?: ArrayBuffer | null;
  range: { start: number; end: number };
  hasTransparency: boolean;
}

export class Raster {
  /**
   * Splits the pixels into one slice per worker (slice sizes a multiple of
   * 4 pixels), posts a "raster" request to each and joins the answers in
   * index order. Resolves with the converted pixels and, when no mask was
   * given (`hasMask` false) and some pixel isn't opaque, the alpha mask.
   * The request names the colour space by its key in the PDF exporter's
   * table (RGB, RGBA, GRAY, CMYK).
   *
   * The last worker gets the remainder pixels in its range, but they are
   * never copied into its buffer, so they come out as transparent black
   * and give an opaque image a mask (old behaviour, kept; see "Concurrent
   * PDF raster drops the last pixels" in QUESTIONS.md).
   */
  concurrencyRaster(
    factory: PromiseFactory,
    workers: MessageWorker[],
    buffer: ArrayBuffer,
    width: number,
    height: number,
    colorspace: RasterColorSpace,
    hasMask: boolean,
  ): Promise<[Uint8ClampedArray, Uint8ClampedArray | null]> {
    const pixels = new Uint32Array(buffer);
    const count = pixels.length;
    const sliceSize = Math.floor(count / workers.length) - (Math.floor(count / workers.length) % 4);
    const remainder = count - sliceSize * workers.length;
    const colorspaceName = Object.keys(ColorSpaces).find(
      (name) => (ColorSpaces as Record<string, unknown>)[name] === colorspace,
    );
    return factory.createPromise((resolve, reject) => {
      Promise.all(
        workers.map(
          (worker, index) =>
            new Promise<RasterResponse>((resolveSlice, rejectSlice) => {
              let slice: ArrayBuffer;
              const range = { start: index * sliceSize, end: index * sliceSize + sliceSize };
              if (index === workers.length - 1 && remainder > 0) {
                const padding = remainder + 10 - ((remainder + 10) % 4);
                const padded = new Uint32Array(range.end - range.start + padding);
                padded.set(pixels.slice(range.start, range.end), 0);
                range.end += remainder;
                slice = padded.buffer;
              } else slice = pixels.slice(range.start, range.end).buffer;
              const id = uuid();
              worker.postMessage(
                {
                  uuid: id,
                  index,
                  command: "raster",
                  dataBuffer: slice,
                  range,
                  colorspace: colorspaceName,
                  hasMask,
                  width,
                  height,
                },
                [slice],
              );
              const onMessage = (event: MessageEvent): void => {
                const data = event.data as RasterResponse;
                if (data.uuid === id && "raster" === data.command) {
                  worker.removeEventListener("message", onMessage);
                  worker.removeEventListener("error", onError);
                  resolveSlice(data);
                }
              };
              const onError = (error: unknown): void => {
                worker.removeEventListener("message", onMessage);
                worker.removeEventListener("error", onError);
                rejectSlice(error);
              };
              worker.addEventListener("message", onMessage);
              worker.addEventListener("error", onError);
            }),
        ),
      )
        .then((responses) => {
          const image = new Uint8ClampedArray(width * height * colorspace.length);
          const mask = hasMask ? null : new Uint8ClampedArray(width * height);
          let imageOffset = 0;
          let maskOffset = 0;
          let transparent = false;
          bubbleSort(responses, (a, b) => a.index - b.index).forEach((response) => {
            const imageBuffer = response.imageBuffer as ArrayBuffer;
            image.set(new Uint8ClampedArray(imageBuffer), imageOffset);
            imageOffset += imageBuffer.byteLength;
            if (mask && response.smaskBuffer) {
              mask.set(new Uint8ClampedArray(response.smaskBuffer), maskOffset);
              maskOffset += response.smaskBuffer.byteLength;
            }
            transparent = transparent || response.hasTransparency;
            delete response.imageBuffer;
            delete response.smaskBuffer;
          });
          resolve([image, transparent ? mask : null]);
        })
        .catch(reject);
    });
  }

  /**
   * Converts packed RGBA pixels (red in the low byte) into `out` and, with
   * a `mask`, writes their alpha. Stops when `out` is full. Returns
   * whether a mask was written with a pixel that isn't opaque.
   */
  raster(
    buffer: ArrayBufferLike,
    colorspace: RasterColorSpace,
    out: Uint8ClampedArray,
    mask?: Uint8ClampedArray | null,
  ): boolean {
    let outOffset = 0;
    let maskOffset = 0;
    let transparent = false;
    const pixels = new Uint32Array(buffer);
    for (let i = 0, length = pixels.length; i < length; i++) {
      const pixel = pixels[i] as number;
      const red = 255 & pixel;
      const green = (pixel >> 8) & 255;
      const blue = (pixel >> 16) & 255;
      const alpha = (pixel >> 24) & 255;
      if (outOffset >= out.length) break;
      out.set(colorspace.fromRGBA(red, green, blue, alpha), outOffset);
      outOffset += colorspace.length;
      if (mask) {
        mask[maskOffset++] = alpha;
        if (alpha < 255) transparent = true;
      }
    }
    return transparent;
  }
}
