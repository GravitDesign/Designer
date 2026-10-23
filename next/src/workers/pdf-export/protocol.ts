// The messages of the PDF export worker (old public/pdfexport.worker.js).

/**
 * Where the worker loads the CMYK profile from. The old worker resolved
 * "assets/data/icc/" against its own URL at the site root; the bundled
 * worker lives under /bundle/, so the path is absolute.
 */
export const ICC_PROFILE_BASE = "/assets/data/icc/";

export interface RasterRequest {
  uuid: string;
  command: "raster";
  index: number;
  dataBuffer?: ArrayBuffer;
  range: { start: number; end: number };
  /** A key of the PDF color space table (RGB, RGBA, GRAY, CMYK). */
  colorspace?: string;
  /** Sic: true means "don't make a mask" (the caller has one). */
  hasMask?: boolean;
  width?: number;
  height?: number;
}

export interface EncodeRequest {
  uuid: string;
  command: "jpegencoder" | "zipencoder";
  buffer?: ArrayBuffer;
  width?: number;
  height?: number;
  /** A key of JpegEncoder.ColorSpace (RGBA, CMYK). */
  colorspace?: string;
  quality?: number;
}

export type PDFWorkerRequest = RasterRequest | EncodeRequest;
