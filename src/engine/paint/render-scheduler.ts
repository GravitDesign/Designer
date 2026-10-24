// Old: chunk.vendor.js module 103 (the renderer).
//
// The old renderer handed out command recorders while a render phase ran
// (and on request), then replayed them into real canvases in 75 ms slices
// spread over animation frames. The port drops the recorder (see
// recorder-state-context.ts), so everything is painted when it is called
// and `render` only reports the finished canvas. What stays is the render
// phase flag, the render parameters, the queue of renderings that arrive
// while one runs and the choice of context in getRenderer.
//
// Not ported: worker rendering (WORKER_RENDERING_ENABLED is false) and the
// debug recorder with its code dump (GRendererCtxDbg, ENABLE_DEBUG false).
import { RecorderStateContext, type ReplayPolicy } from "./recorder-state-context.ts";
import { RenderJob, type RenderParameters } from "./render-job.ts";
import { RendererConfig } from "./renderer-config.ts";
import type { Context2D } from "./context-2d.ts";

/** What the render callbacks receive: canvas, finished, skipped, parameters. */
export type RenderCallback = (
  canvas: HTMLCanvasElement | null,
  finished: boolean,
  skipped: boolean,
  parameters?: RenderParameters,
) => void;

/** What tryRunRendering needs from a paint canvas. */
export interface RenderTarget {
  getRendererContext(): RecorderStateContext | null;
}

interface ScheduledRendering {
  paintCanvas: RenderTarget;
  renderFunc: () => void;
  callback: (paintCanvas: RenderTarget) => void;
  multithreading: boolean | undefined;
}

const requestFrame: (callback: () => void) => unknown =
  ("undefined" != typeof window && window.requestAnimationFrame?.bind(window)) ||
  ((callback: () => void) => setTimeout(callback));

/** Canvases of wrapped (formerly recorded) contexts. */
const recordedCanvases = new WeakSet<object>();

/** Set by gl-context.ts, so the scheduler knows the shared WebGL canvas. */
let sharedGLCanvas: (() => HTMLCanvasElement | null) | null = null;

/** While true, painting belongs to a tryRunRendering pass, which replayed with empty parameters. */
let paintingForTryRun = false;

const replayPolicy: ReplayPolicy = {
  replayParameters: () => (paintingForTryRun ? {} : RenderScheduler._renderParameters),
  isRenderPhase: () => RenderScheduler.isRenderPhase(),
  glCanvas: () => (sharedGLCanvas ? sharedGLCanvas() : null),
  isRecordedCanvas: (canvas) =>
    !!canvas && typeof canvas == "object" && recordedCanvases.has(canvas),
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old renderer was a function used only for its statics
export class RenderScheduler {
  static _enabled = true;
  static _debugEnabled = false;
  static _debugPhase = false;
  static _multiThreading = false;
  static DUMP_IMAGES = true;
  static _renderPhase = false;
  static _renderParameters: RenderParameters = {};
  static _renderJobs: (RenderJob | undefined)[] = [];
  static _scheduledRenderings: ScheduledRendering[] | null = null;

  /** Lets gl-context.ts tell which canvas is the shared WebGL canvas. */
  static setGLCanvasProvider(provider: () => HTMLCanvasElement | null): void {
    sharedGLCanvas = provider;
  }

  static begin(multithreading?: boolean): void {
    this._renderPhase = true;
    if (this._debugEnabled) this._debugPhase = true;
    else if (RendererConfig.WORKER_RENDERING_ENABLED && multithreading) {
      // Worker rendering is not ported; the old code also needed OffscreenCanvas.
      this._multiThreading = false;
    } else this._multiThreading = false;
  }

  static finish(): void {
    this._renderPhase = false;
    this._debugPhase = false;
    this._multiThreading = false;
  }

  /**
   * Paints with `renderFunc` inside a render phase and calls back with the
   * canvas. While a render phase runs, the request waits in a queue and runs
   * on a later frame.
   */
  static tryRunRendering(
    paintCanvas: RenderTarget,
    renderFunc: () => void,
    callback: (paintCanvas: RenderTarget) => void,
    multithreading?: boolean,
  ): void {
    if (this.isRenderPhase() || this._renderJobs.some(() => true)) {
      if (!this._scheduledRenderings) this._scheduledRenderings = [];
      this._scheduledRenderings.push({ paintCanvas, renderFunc, callback, multithreading });
      return;
    }
    this.begin(multithreading);
    const outer = paintingForTryRun;
    paintingForTryRun = true;
    try {
      renderFunc();
    } catch (error) {
      // Any error ends the render phase, keeps the render parameters and
      // leaves no job behind, and the next queued rendering still runs
      // (BUGS-FIXED.md "BUG-009 A painting error leaves the render phase on
      // and the view stops repainting").
      paintingForTryRun = outer;
      this.finish();
      this._runNextScheduled();
      throw error;
    }
    paintingForTryRun = outer;
    this.finish();
    const saved = this._renderParameters;
    this._renderParameters = {};
    this.render(paintCanvas.getRendererContext(), 0, (_canvas, finished) => {
      if (finished) callback(paintCanvas);
    });
    this._renderParameters = saved;
  }

  static resetRenderJobs(): void {
    this._renderJobs.forEach((job) => {
      if (!job) return;
      if (null !== job.timeout) console.log("SOMETHING ACTUALLY STOPPED!");
      job.disposeRenderables();
      job.reset();
    });
  }

  static init(enabled?: boolean, debug?: boolean): void {
    this._enabled = false !== enabled;
    this._debugEnabled = true === debug;
  }

  static isEnabled(): boolean {
    return this._enabled;
  }

  /** With a context: whether its render job is waiting for its next slice, which never happens now. */
  static isRenderPhase(context?: RecorderStateContext | null): boolean {
    if (context) {
      const job = this._renderJobs[context.contextId];
      return !(!job || null === job.timeout);
    }
    return this._enabled && this._renderPhase;
  }

  static isDebug(): boolean {
    return RendererConfig.DEBUG_LEVEL < 2 || this._debugEnabled;
  }

  static isMultiThreaded(context?: unknown): boolean {
    return context ? false : this._multiThreading;
  }

  static getRenderParameters(): RenderParameters {
    return Object.assign({}, this._renderParameters);
  }

  static setRenderParameters(parameters: RenderParameters): void {
    for (const key in parameters) this._renderParameters[key] = parameters[key];
  }

  static usingOffscreenCanvas(): unknown {
    return this._renderParameters && this._renderParameters.offscreen;
  }

  /** Worker rendering only; nothing to do. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  static preInitializeContext(context: unknown): void {}

  /** Worker rendering only; nothing to do. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  static disposeWorkerDataAfterRender(context: unknown): void {}

  /**
   * A context to paint into. Where the old code handed out a recorder
   * (`force`, or any 2D context during a render phase), this returns a
   * RecorderStateContext over a new canvas; otherwise a plain context.
   */
  static getRenderer(
    force?: boolean,
    type?: "2d",
    attributes?: CanvasRenderingContext2DSettings,
    persistent?: boolean,
    multithreaded?: boolean,
  ): Context2D;
  static getRenderer(
    force: boolean | undefined,
    type: "webgl" | "experimental-webgl",
    attributes?: WebGLContextAttributes,
    persistent?: boolean,
    multithreaded?: boolean,
  ): WebGLRenderingContext | null;
  static getRenderer(
    force?: boolean,
    type?: "2d" | "webgl" | "experimental-webgl",
    attributes?: CanvasRenderingContext2DSettings | WebGLContextAttributes,
    persistent?: boolean,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- worker rendering is not ported
    multithreaded?: boolean,
  ): Context2D | WebGLRenderingContext | null {
    const canvas = document.createElement("canvas");
    if (type && "2d" !== type) {
      return canvas.getContext(type, attributes) as WebGLRenderingContext | null;
    }
    if (this._enabled && (this._renderPhase || force)) {
      recordedCanvases.add(canvas);
      return new RecorderStateContext(canvas, replayPolicy, persistent, !!force);
    }
    return canvas.getContext("2d", attributes) as CanvasRenderingContext2D;
  }

  /**
   * Reports a painted canvas. The old renderer replayed the recording here
   * and called back once per slice; painting is done by now, so this calls
   * back once with `finished` set and then starts the next queued rendering.
   */
  static render(
    context: RecorderStateContext | null,
    depth?: number,
    callback?: RenderCallback | null,
  ): HTMLCanvasElement | null {
    if (!context) {
      // The old code read the recorder's length first and failed the same way.
      throw new TypeError("Cannot read properties of null (reading '__len')");
    }
    const canvas = context.canvas;
    if (!this._enabled) {
      callback?.(canvas, true, false);
      return canvas;
    }
    depth = depth || 0;
    context.hasRealContext = true;
    const job = new RenderJob(context, RendererConfig.MAX_TIME_PER_JOB, this._renderParameters);
    job.skipped = context.skipped;
    context.skipped = false;
    if (0 === depth && callback) {
      callback(canvas, true, job.skipped, job.parameters);
      this._runNextScheduled();
    }
    return canvas;
  }

  /** Starts the last queued tryRunRendering on the next frame. */
  static _runNextScheduled(): void {
    if (this._scheduledRenderings && this._scheduledRenderings.length) {
      const next = this._scheduledRenderings.pop() as ScheduledRendering;
      requestFrame(() => {
        RenderScheduler.tryRunRendering(
          next.paintCanvas,
          next.renderFunc,
          next.callback,
          next.multithreading,
        );
      });
    }
  }

  /** Recovers a canvas after a failed pass: undoes its open saves. */
  static forceCleanup(context: RecorderStateContext | null): void {
    if (!context) return;
    const job = this._renderJobs[context.contextId];
    if (job && null !== job.timeout) {
      clearTimeout(job.timeout);
      job.timeout = null;
    }
    context.forceRestore();
    if (job) {
      job.disposeRenderables();
      job.exiting = false;
      Reflect.deleteProperty(this._renderJobs, job.getId());
    }
  }

  /** The old renderer freed the recorder's buffers; canvases are left to the garbage collector. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  static destroy(context: unknown): void {}
}
