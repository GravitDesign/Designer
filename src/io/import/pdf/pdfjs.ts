// Old: designer.browser.dev.js module 792 (the pdf.js main build Gravit
// bundled, version 2.1.286 with Gravit's patches) and chunk.vendor.js
// module 1201, which pointed pdf.js at public/pdf.worker.js.
//
// The rewrite loads pdfjs-dist 2.1.266's main build as text, applies the
// same patches (workers/pdf/pdfjs-patches.ts) and evaluates it once. pdf.js
// itself compiles font glyphs with `new Function` (isEvalSupported), so
// evaluating its build adds no new requirement. Every document gets its
// own worker (workers/pdf), like getDocument without a worker did.
//
// The interfaces below describe the parts of the pdf.js API the importer
// uses; pdf.js has no types of its own in this version.
import mainSource from "pdfjs-dist/build/pdf.js?raw";
import { applyPatches, MAIN_PATCHES } from "../../../workers/pdf/pdfjs-patches.ts";
import { createPdfWorker } from "../../../workers/pdf/index.ts";

/** A pdf.js matrix [a, b, c, d, e, f]. */
export type PdfMatrix = number[];

export interface PdfViewport {
  width: number;
  height: number;
  transform: PdfMatrix;
}

export interface PdfMetadata {
  get(name: string): string | null;
}

export interface PdfRenderTask {
  promise: Promise<void>;
}

export interface PdfPageProxy {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: Record<string, unknown>): PdfRenderTask;
  cleanup(): void;
}

export interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  getMetadata(): Promise<{ metadata: PdfMetadata | null } | null>;
  cleanup(): void;
  destroy(): Promise<void>;
}

export interface PdfLoadingTask {
  promise: Promise<PdfDocumentProxy>;
  then<R>(
    onFulfilled: (document: PdfDocumentProxy) => R,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<R>;
  destroy(): Promise<void>;
}

export interface PdfWorkerProxy {
  destroy(): void;
}

/** A pdf.js font object (FontFaceObject) as CanvasGraphics keeps it in `current.font`. */
export interface PdfFont {
  name: string;
  loadedName: string;
  data?: Uint8Array;
  ascent?: number;
  descent?: number;
  fontMatrix?: PdfMatrix;
  widths?: number[];
  toFontChar: string[];
  /** Set by the import's canvas bridge. */
  otf?: unknown;
  supported?: boolean;
  substituteFont?: boolean;
}

/** The text and graphics state pdf.js keeps per save level. */
export interface PdfCanvasState {
  font: PdfFont;
  fontSize: number;
  fontSizeScale: number;
  fontDirection: number;
  charSpacing: number;
  wordSpacing: number;
  textRenderingMode: number;
  fillColor: unknown;
  strokeColor: unknown;
  patternFill: boolean;
  [key: string]: unknown;
}

/** The canvas pdf.js's CachedCanvases hands out. */
export interface PdfCachedCanvas {
  canvas: unknown;
  context: PdfCanvasContextLike;
}

/** What CanvasGraphics needs from its context (a 2D context or the import's bridge). */
export interface PdfCanvasContextLike {
  [key: string]: unknown;
}

/** pdf.js's CanvasGraphics instance (the parts the importer's subclass touches). */
export interface PdfCanvasGraphics {
  ctx: PdfCanvasContextLike & {
    save(): void;
    restore(): void;
    transform(...matrix: number[]): void;
    setTransform(...matrix: number[]): void;
    scale(x: number, y: number): void;
    drawImage(...args: unknown[]): void;
    mozCurrentTransform: PdfMatrix;
    mozCurrentTransformInverse: PdfMatrix;
  };
  current: PdfCanvasState;
  commonObjs: unknown;
  objs: unknown;
  canvasFactory: unknown;
  webGLContext: unknown;
  imageLayer: {
    beginLayout(): void;
    endLayout(): void;
    appendImage(image: Record<string, unknown>): void;
  } | null;
  baseTransform: PdfMatrix | null;
  baseTransformStack: (PdfMatrix | null)[];
  cachedCanvases: {
    getCanvas(id: string, width: number, height: number, trackTransform?: boolean): PdfCachedCanvas;
  };
  save(): void;
  restore(): void;
  transform(...matrix: number[]): void;
  beginText(): void;
  endText(): void;
  getCanvasPosition(x: number, y: number): [number, number];
  [key: string]: unknown;
}

export type PdfCanvasGraphicsClass = new (
  canvasContext: unknown,
  commonObjs: unknown,
  objs: unknown,
  canvasFactory: unknown,
  webGLContext: unknown,
  imageLayer?: unknown,
) => PdfCanvasGraphics;

/** pdf.js's TilingPattern. */
export interface PdfTilingPattern {
  [key: string]: unknown;
}

export type PdfTilingPatternClass = new (
  ir: ArrayLike<unknown>,
  color: unknown,
  ctx: unknown,
  canvasGraphicsFactory: { createCanvasGraphics(ctx: unknown): PdfCanvasGraphics },
  baseTransform: PdfMatrix,
) => PdfTilingPattern;

/** A shading pattern from getShadingPatternFromIR. */
export interface PdfShadingPattern {
  type: string;
  getPattern(ctx: unknown, owner: unknown, shadingFill?: boolean): unknown;
}

export interface PdfJs {
  version: string;
  build: string;
  getDocument(params: Record<string, unknown>): PdfLoadingTask;
  PDFWorker: new (params: { port: unknown }) => PdfWorkerProxy;
  CanvasGraphics: PdfCanvasGraphicsClass;
  TilingPattern: PdfTilingPatternClass;
  getShadingPatternFromIR(ir: ArrayLike<unknown>): PdfShadingPattern;
  OPS: Record<string, number>;
  Util: Record<string, unknown>;
  GlobalWorkerOptions: { workerSrc: string };
}

let loaded: PdfJs | null = null;

/** The patched pdf.js main build, evaluated on first use. */
export function getPdfJs(): PdfJs {
  if (!loaded) {
    const module: { exports: unknown } = { exports: {} };
    const patched = applyPatches(mainSource, MAIN_PATCHES);
    // The UMD wrapper of the build assigns module.exports.
    new Function("module", "exports", patched)(module, module.exports);
    loaded = module.exports as PdfJs;
  }
  return loaded;
}

/**
 * getDocument with a worker of its own: the returned destroy ends both the
 * document and the worker.
 */
export function getDocument(params: Record<string, unknown>): {
  task: PdfLoadingTask;
  terminate(): void;
} {
  const pdfjs = getPdfJs();
  const worker = createPdfWorker();
  const proxy = new pdfjs.PDFWorker({ port: worker });
  const task = pdfjs.getDocument({ ...params, worker: proxy });
  return {
    task,
    terminate() {
      proxy.destroy();
      worker.terminate();
    },
  };
}
