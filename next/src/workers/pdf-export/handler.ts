// Old: public/pdfexport.worker.js (its entry, module 1366).
//
// What the PDF export worker does with a message. It keeps the old
// message protocol, which the main-thread halves in workers/raster.ts,
// workers/zip-encoder.ts and io/export/jpeg-encoder.ts speak
// (FMT-WORKER-012): a message carries a `uuid` and a `command`, the answer
// the same uuid and command plus the result buffer (transferred).
//
// - "raster": converts a slice of RGBA pixels to a PDF color space (and
//   an alpha mask unless `hasMask`). CMYK loads the SWOP profile first.
// - "jpegencoder": encodes RGBA or CMYK pixels with the old JPEG encoder.
// - "zipencoder": deflates a buffer.
//
// Bad requests throw, which the main thread sees as the worker's "error"
// event.
import { Color } from "../../engine/color/color.ts";
import { JpegEncoder, type JpegColorSpace } from "../../io/export/jpeg-encoder.ts";
import { colorSpaceByName } from "../../io/export/pdf/color-spaces.ts";
import { Raster } from "../raster.ts";
import { ZipEncoder } from "../zip-encoder.ts";
import {
  ICC_PROFILE_BASE,
  type EncodeRequest,
  type PDFWorkerRequest,
  type RasterRequest,
} from "./protocol.ts";

/** Posts an answer, transferring the listed buffers. */
export type PostAnswer = (message: unknown, transfer: Transferable[]) => void;

let profileLoading: Promise<void> | null = null;

function raster(request: RasterRequest, post: PostAnswer): void {
  const colorSpace = colorSpaceByName(request.colorspace as string);
  if (!colorSpace) return;
  const range = request.range;
  const image = new Uint8ClampedArray((range.end - range.start) * colorSpace.length);
  const mask = request.hasMask ? null : new Uint8ClampedArray(range.end - range.start);
  const transparent = new Raster().raster(
    request.dataBuffer as ArrayBuffer,
    colorSpace,
    image,
    mask,
  );
  post(
    {
      uuid: request.uuid,
      index: request.index,
      command: "raster",
      imageBuffer: image.buffer,
      smaskBuffer: mask ? mask.buffer : null,
      range,
      hasTransparency: transparent,
    },
    [image.buffer as ArrayBuffer].concat(mask ? [mask.buffer as ArrayBuffer] : []),
  );
}

function rasterRequest(request: RasterRequest, post: PostAnswer): void {
  if (!request.colorspace) throw new Error('Missing PDF "colorspace" parameter');
  if (!colorSpaceByName(request.colorspace)) {
    throw new Error('Unsupported PDF "colorspace" #' + request.colorspace);
  }
  if (!request.dataBuffer) throw new Error('Missing image "dataBuffer" parameter');
  if (0 === request.dataBuffer.byteLength) throw new Error('Empty image "dataBuffer"');
  const range = request.range;
  if (!range) throw new Error('Missing "range" parameter');
  if ((range.end || 0) - (range.start || 0) <= 0) {
    throw new Error('Invalid "range" #' + String(range));
  }
  if ("CMYK" === request.colorspace) {
    if (!Color.currentCMYKProfile && !profileLoading) {
      profileLoading = new Promise<void>((resolve, reject) => {
        try {
          Color.setCMYKProfile("USWebCoatedSWOPv2", ICC_PROFILE_BASE, resolve);
        } catch (error) {
          reject(error as Error);
        }
      });
    }
    // A failure here is an unhandled rejection, not an "error" event, as
    // in the old worker.
    void (profileLoading || Promise.resolve()).then(() => raster(request, post));
  } else raster(request, post);
}

function jpegRequest(request: EncodeRequest, post: PostAnswer): void {
  if (!request.colorspace) throw new Error('Missing JPEG "colorspace" parameter');
  const colorSpace = (JpegEncoder.ColorSpace as Record<string, JpegColorSpace | undefined>)[
    request.colorspace
  ];
  if (!colorSpace) throw new Error('Unsupported JPEG "colorspace" #' + request.colorspace);
  const buffer = request.buffer;
  if (!buffer) throw new Error('Missing rgba "buffer" parameter');
  if (0 === buffer.byteLength) throw new Error('Empty rgba "buffer"');
  if (!request.width || !request.height) {
    throw new Error("Invalid image size #" + request.width + "x" + request.height);
  }
  const encoded = new JpegEncoder().encode(
    new Uint32Array(buffer),
    request.width,
    request.height,
    request.quality as number,
    colorSpace,
  );
  post({ uuid: request.uuid, command: "jpegencoder", buffer: encoded.buffer }, [
    encoded.buffer as ArrayBuffer,
  ]);
}

function zipRequest(request: EncodeRequest, post: PostAnswer): void {
  const buffer = request.buffer;
  if (!buffer) throw new Error('Missing ZIP "buffer" parameter');
  if (0 === buffer.byteLength) throw new Error('Empty ZIP "buffer"');
  const deflated = new ZipEncoder().encode(buffer);
  post({ uuid: request.uuid, command: "zipencoder", buffer: deflated.buffer }, [
    deflated.buffer as ArrayBuffer,
  ]);
}

/** Handles one message of the main thread; unknown commands are ignored. */
export function handlePDFWorkerRequest(request: PDFWorkerRequest, post: PostAnswer): void {
  if (!request.uuid) throw new Error('Missing "uuid" parameter');
  if ("raster" === request.command) rasterRequest(request, post);
  else if ("jpegencoder" === request.command) jpegRequest(request, post);
  else if ("zipencoder" === request.command) zipRequest(request, post);
}
