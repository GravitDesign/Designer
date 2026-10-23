// Old: chunk.vendor.js module 898.
//
// In the old engine a render job replayed one recorded canvas in time
// slices and kept the resume points of interrupted slices. The port paints
// directly, so a job never gets interrupted; it still carries the render
// parameters of the pass and whether a draw was skipped, which is what the
// render callbacks report.

export type RenderParameters = Record<string, unknown>;

/** Something a job renders; the old jobs counted canvases they touched. */
export interface Renderable {
  readonly contextId: number;
}

export class RenderJob {
  _jobId: number;
  _renderables: Renderable[];
  _jobStart: number;
  _expired: boolean;
  _locked: number;
  _timeLimit: number;
  resuming: boolean;
  exiting: boolean;
  timeout: ReturnType<typeof setTimeout> | null;
  skipped: boolean;
  data: unknown[];
  parameters: RenderParameters;
  initialRenderables: Renderable[] | undefined;

  constructor(context: Renderable, timeLimit?: number, parameters?: RenderParameters | null) {
    this._jobId = context.contextId;
    this._renderables = [];
    this._jobStart = Date.now();
    this._expired = false;
    this._locked = 0;
    this.resuming = false;
    this.exiting = false;
    this.timeout = null;
    this.skipped = false;
    this.data = [];
    this.parameters = parameters
      ? Object.keys(parameters).reduce<RenderParameters>((copy, key) => {
          copy[key] = parameters[key];
          return copy;
        }, {})
      : {};
    // The old default was Number.Infinity, which is undefined: a job without
    // a limit never expired because every comparison with it is false.
    this._timeLimit = timeLimit || NaN;
  }

  isExpired(): boolean {
    return (
      !this._locked &&
      (!!this._expired ||
        (Date.now() - this._jobStart > this._timeLimit && ((this._expired = true), true)))
    );
  }

  lock(): void {
    this._locked++;
  }

  unlock(): void {
    this._locked--;
    if (this._locked < 0) throw new Error("GRenderJob: invalid lock");
  }

  reset(): void {
    this._jobStart = Date.now();
    this._expired = false;
    this._locked = 0;
    this.resuming = false;
    this.exiting = false;
    if (null !== this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.data = [];
  }

  addRenderable(renderable: Renderable): void {
    if (this._renderables.indexOf(renderable) < 0) this._renderables.push(renderable);
  }

  pushSave(save: unknown): void {
    this.data.push(save);
  }

  popSave(): unknown {
    return this.data.pop();
  }

  getSave(): unknown {
    return this.hasSave() ? this.data[this.data.length - 1] : null;
  }

  hasSave(): boolean {
    return this.data.length > 0;
  }

  getId(): number {
    return this._jobId;
  }

  disposeRenderables(): void {
    this._renderables = [];
  }
}
