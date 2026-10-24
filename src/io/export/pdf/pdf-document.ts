// Old: chunk.vendor.js module 1422 (GPDFDocument).
import { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { uuid } from "../../../engine/core/util.ts";
import type { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { ColorSpaces, type PDFColorSpace } from "./color-spaces.ts";
import { PDFGraphics } from "./content-stream.ts";
import { PDFBody } from "./document-writer.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFInfo } from "./info.ts";
import type { PDFMediaBox } from "./media-box.ts";
import { PDFMemoryOutput } from "./memory-output.ts";
import type { PDFOutput } from "./output.ts";
import type { PDFPage } from "./page.ts";
import { PDFHeader } from "./header.ts";
import { PDFNumber } from "./pdf-number.ts";
import type { PDFObject } from "./pdf-object.ts";
import type { PDFResource, PDFResourceType } from "./resource.ts";
import type { PDFResources } from "./resources.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/**
 * A worker of the export (see workers/pdf-export): it answers "raster",
 * "jpegencoder" and "zipencoder" messages.
 */
export interface PDFExportWorker {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent | Event) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "error", listener: (event: ErrorEvent | Event) => void): void;
  terminate(): void;
}

export interface PDFDocumentOptions {
  version?: number;
  compress?: boolean;
  colorSpace?: PDFColorSpace;
  workers?: PDFExportWorker[];
  user?: string | null;
  title?: string | null;
  jpegQuality?: number;
  downsampleImages?: boolean;
}

interface PromiseCapability {
  resolve?: (value?: unknown) => void;
  reject?: (reason?: unknown) => void;
}

const JobStatus = { IDLE: 0, RUNNING: 1, COMPLETED: 2, FAILED: 3 } as const;

/**
 * Asynchronous work the document waits for before it can be written
 * (rasterizing, encoding). A job only moves forward: done or failed.
 */
export class PDFJob {
  static Status = JobStatus;

  declare _name: string | null;
  declare _doc: PDFDocument | null;
  declare _id: string;
  declare _status: number;
  declare _error: unknown;

  constructor(name: string, document: PDFDocument) {
    this._name = name;
    this._doc = document;
    this._id = uuid();
    this._status = JobStatus.RUNNING;
  }

  failed(error: unknown): void {
    if (this._updateStatus(JobStatus.FAILED)) {
      this._error = error;
      (this._doc as PDFDocument).endJob(this);
    }
  }

  done(): void {
    if (this._updateStatus(JobStatus.COMPLETED)) (this._doc as PDFDocument).endJob(this);
  }

  _updateStatus(status: number): boolean | undefined {
    if (this._status !== status && status > this._status) {
      this._status = status;
      return true;
    }
    return undefined;
  }

  getStatus(): number {
    return this._status;
  }

  toString(): string {
    return JSON.stringify({ name: this._name, status: this._status });
  }
}

Object.assign(PDFJob.prototype, {
  _name: null,
  _doc: null,
  _status: JobStatus.IDLE,
  _error: null,
});

/**
 * A PDF being built: the body with its pages and objects, the stack of
 * graphics blocks the canvas draws into, the jobs still running and the
 * workers they use. `ready()` resolves once every job is done (it fails
 * with the first failed job); `write` writes the file.
 */
export class PDFDocument {
  static Job = PDFJob;

  compress: boolean | undefined;
  declare _jpegQuality: number;
  declare _downsampleImages: boolean;
  colorSpace: PDFColorSpace | undefined;
  header: PDFHeader;
  declare body: PDFBody;
  declare _promises: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[];
  declare _executors: AsyncExecutor[];
  declare _workers: PDFExportWorker[] | null | undefined;
  _stackGraphics: PDFGraphics[];
  declare _jobs: PDFJob[];
  declare _tasksAreSubmitted: boolean;
  declare _promiseCapability: PromiseCapability;
  declare _promise: Promise<unknown>;
  declare _lastJob: PDFJob | null;
  declare _abort: boolean | null;
  declare _writer: PDFOutput | null;
  declare _writerClass: (new () => PDFOutput) | undefined;

  constructor(options: PDFDocumentOptions) {
    this.compress = options.compress;
    if (options.jpegQuality) this._jpegQuality = options.jpegQuality;
    this._downsampleImages = !!options.downsampleImages;
    this.colorSpace = options.colorSpace;
    // The old header ignored the version it was given (always 1.7).
    this.header = new PDFHeader();
    this.body = new PDFBody(this, options.user, options.title);
    this._promises = [];
    this._executors = [];
    this._workers = options.workers;
    this._stackGraphics = [];
    this._jobs = [];
    this._tasksAreSubmitted = false;
    this._promiseCapability = {};
    this._promise = new Promise((resolve, reject) => {
      this._promiseCapability.resolve = resolve;
      this._promiseCapability.reject = reject;
    });
    this._expectRejection();
  }

  /**
   * An abort rejects the promise before the export listens to it (it does
   * once it writes); mark the rejection handled so it isn't reported as
   * unhandled. Those who listen later still get it (BUGS-FIXED.md
   * "BUG-088 Cancelling a PDF export during rasterization never calls
   * back").
   */
  _expectRejection(): void {
    this._promise.catch(() => {});
  }

  _resetPromise(): void {
    this._promiseCapability = {};
    this._promise = new Promise((resolve, reject) => {
      this._promiseCapability.resolve = resolve;
      this._promiseCapability.reject = reject;
    });
    this._expectRejection();
  }

  isDownsamplingImages(): boolean {
    return this._downsampleImages;
  }

  hasConcurrencyFeature(): boolean | null | undefined {
    return this._workers && !!this._workers.length;
  }

  getLastJob(): PDFJob | null {
    return this._lastJob;
  }

  beginJob(name?: string): PDFJob {
    const job = new PDFJob(name || "Unknown", this);
    if (!this._jobs.length) this._resetPromise();
    this._jobs.push(job);
    return job;
  }

  endJob(job: PDFJob): void {
    this._lastJob = job;
    if (job._status !== JobStatus.FAILED) {
      for (let i = 0; i < this._jobs.length; i++) {
        if ((this._jobs[i] as PDFJob)._id === job._id) {
          this._jobs.splice(i, 1);
          break;
        }
      }
      if (!this._jobs.length && this._tasksAreSubmitted) {
        (this._promiseCapability.resolve as (value?: unknown) => void)();
      }
    } else (this._promiseCapability.reject as (reason?: unknown) => void)(job._error);
  }

  /** True once aborted (null before, as in the old code). */
  isAbort(): boolean {
    return this._abort as boolean;
  }

  abort(reason?: unknown): void {
    this._abort = true;
    (this._promiseCapability.reject as (reason?: unknown) => void)(reason);
    if (this._writer) this._writer.abort();
    if (this._executors) this._executors.forEach((executor) => executor.abort());
    if (this._promises) this._promises.forEach((promise) => promise.reject());
    this.finish();
  }

  /** Stops the workers and drops the body; the document can't be used after. */
  finish(): void {
    if (this._workers) this._workers.forEach((worker) => worker.terminate());
    delete (this as Partial<PDFDocument>).body;
    delete (this as Partial<PDFDocument>)._executors;
    delete (this as Partial<PDFDocument>)._promises;
  }

  /** A promise the document rejects on abort while it is pending. */
  createPromise<T>(
    executor: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
  ): Promise<T> {
    const forget = (promise: Promise<T>) => {
      if (this._promises) {
        this._promises.some((entry, i) => {
          if ((entry as unknown) === promise && this._promises) {
            this._promises.splice(i, 1);
            return true;
          }
          return false;
        });
      }
    };
    const promise = new Promise<T>((resolve, reject) => {
      this._promises.push({
        resolve: resolve as (value?: unknown) => void,
        reject,
      });
      executor(resolve, reject);
    });
    // The old code compared the promise with the stored resolvers, which
    // never matched, so settled promises stay in the list (harmless).
    promise.then(forget.bind(null, promise)).catch(forget.bind(null, promise));
    return promise;
  }

  createExecutor(executionSteps?: number, executionTime?: number): AsyncExecutor {
    const executor: AsyncExecutor = new AsyncExecutor(executionSteps, executionTime, () => {
      if (this._executors) {
        this._executors.some((entry, i) => {
          if (entry === executor && this._executors) {
            this._executors.splice(i, 1);
            return true;
          }
          return false;
        });
      }
    });
    this._executors.push(executor);
    return executor;
  }

  /** Resolves once all jobs are done; jobs begun later make it wait for them too. */
  ready(): Promise<unknown> {
    this._tasksAreSubmitted = true;
    if (!this._jobs.length) (this._promiseCapability.resolve as (value?: unknown) => void)();
    return this._promise;
  }

  getWorkers(): PDFExportWorker[] {
    return this._workers as PDFExportWorker[];
  }

  newWriter(): PDFOutput {
    return this._writerClass ? new this._writerClass() : new PDFMemoryOutput();
  }

  getBody(): PDFBody {
    return this.body;
  }

  getInfo(): PDFInfo {
    return this.body.getInfo();
  }

  setPageOrigin(origin: Point): void {
    this.body.setPageOrigin(origin);
  }

  getPageOrigin(): Point {
    return this.body.getPageOrigin();
  }

  getColorSpace(): PDFColorSpace {
    return this.colorSpace || ColorSpaces.RGB;
  }

  isCompress(): boolean {
    return this.compress as boolean;
  }

  getJPEGQuality(): number {
    return this._jpegQuality;
  }

  newPage(width: number, height: number): PDFPage {
    return this.body.newPage(width, height);
  }

  getPageSize(): PDFMediaBox {
    return this.body.getPageSize();
  }

  relativeY(y: number): number {
    return PDFNumber.normalizeNumber(this.getPageSize().height - y);
  }

  convertToPDFPoint(point: Point): Point {
    return new Transform(1, 0, 0, -1, 0, this.getPageSize().height).mapPoint(point);
  }

  convertToViewportPoint(point: Point): Point {
    return (
      new Transform(1, 0, 0, -1, 0, this.getPageSize().height).inverted() as Transform
    ).mapPoint(point);
  }

  /** A transform in scene coordinates as a PDF matrix (y up from the page bottom). */
  convertToPDFCoordinates(transform: Transform): Transform {
    return new Transform(1, 0, 0, -1, 0, this.getPageSize().height)
      .preMultiplied(transform)
      .preMultiplied(new Transform(1, 0, 0, -1, 0, 0));
  }

  /** Adds an object to the current page; a graphics block becomes the current one. */
  add(object: unknown, index?: number | null): void {
    this.body.add(object, index);
    if (object instanceof PDFGraphics) this.pushGraphics(object);
  }

  addText(
    word: Parameters<PDFGraphics["addText"]>[0],
  ): ReturnType<PDFGraphics["addText"]> | undefined {
    const graphics = this.getCurrentGraphics();
    if (graphics) return graphics.addText(word);
    return undefined;
  }

  addResource<T extends PDFObject>(
    type: PDFResourceType,
    resource: PDFResource<T> | PDFIndirectReference<T>,
  ): PDFResource<T> {
    return this.getCurrentResources().add(type, resource);
  }

  getCurrentGraphics(): PDFGraphics | undefined {
    return this._stackGraphics.slice(-1).pop();
  }

  createGraphics(): PDFGraphics {
    const graphics = new PDFGraphics(this);
    this.add(graphics);
    return graphics;
  }

  pushGraphics(graphics: PDFGraphics): void {
    this._stackGraphics.push(graphics);
  }

  popGraphics(): PDFGraphics | undefined {
    return this._stackGraphics.pop();
  }

  getCurrentResources(): PDFResources {
    return this.body.getCurrentResources();
  }

  addIndirectObject(object: PDFIndirectObject): void {
    this.body.addIndirectObject(object);
  }

  removeIndirectObject(object: PDFIndirectObject | null | undefined): void {
    this.body.removeIndirectObject(object);
  }

  getIndirectObject<T extends PDFObject>(object: T): PDFIndirectObject<T> {
    return this.body.getIndirectObject(object);
  }

  write(output: PDFOutput): void {
    this._writer = output;
    this.header.write(output);
    this.body.write(output);
    output.write("%%EOF");
  }

  toString(): string {
    return "[Object GPDFDocument]";
  }
}

Object.assign(PDFDocument.prototype, {
  _workers: null,
  _jobs: null,
  _lastJob: null,
  _promise: null,
  _promiseCapability: null,
  _tasksAreSubmitted: false,
  _abort: null,
  _writer: null,
  _executors: null,
  _promises: null,
  _jpegQuality: 85,
  _downsampleImages: false,
});
