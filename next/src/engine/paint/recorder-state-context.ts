// Replaces the 2D half of the old command recorder (chunk.vendor.js modules
// 111 and 897, GRendererCtx), which the port drops.
//
// The old engine painted the scene into recorders that stored every call
// and replayed it into a real canvas later. The port paints into the real
// canvas right away, which issues the same calls in the same order. A few
// things the recorder did on the way still change what ends up on the
// canvas, so canvases the old code would have recorded get this wrapper:
//
// - Property reads return the recorder's own copy of the value (what was
//   last set, or the recorder's defaults such as imageSmoothingQuality
//   "high"), not the canvas' value. Code that compares or copies them (the
//   blender's operator check, GPaintCanvas.clone) sees the same values the
//   old code saw.
// - save() kept only one level of these copies, so a restore after nested
//   saves brings back the innermost saved values.
// - closePath() with round joins and round caps became a lineTo back to the
//   first point of the path (or to 0,0 when no moveTo came first). The start
//   point lived in one array shared by all recorders.
// - When the replay ran with the noWebGL (or quickRender) render parameter
//   it left out draws of the shared WebGL canvas (or of sub-canvases), and
//   it never drew a sub-canvas of zero size.
import type { Context2D } from "./context-2d.ts";

/** The properties the recorder kept copies of, in its order. */
export const SYNCED_PROPERTIES = [
  "imageSmoothingQuality",
  "imageSmoothingEnabled",
  "textAlign",
  "textBaseline",
  "font",
  "strokeStyle",
  "miterLimit",
  "fillStyle",
  "filter",
  "lineJoin",
  "lineCap",
  "lineWidth",
  "lineDashOffset",
  "globalAlpha",
  "globalCompositeOperation",
  "shadowColor",
  "shadowBlur",
  "shadowOffsetX",
  "shadowOffsetY",
] as const;

type SyncedProperty = (typeof SYNCED_PROPERTIES)[number];

/** The recorder's defaults; they differ from a fresh canvas in imageSmoothingQuality ("high"). */
const DEFAULTS: Record<SyncedProperty, unknown> = {
  fillStyle: "#000",
  filter: "none",
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  lineDashOffset: 0,
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  miterLimit: 10,
  strokeStyle: "#000",
  textAlign: "start",
  imageSmoothingEnabled: true,
  imageSmoothingQuality: "high",
  textBaseline: "alphabetic",
  font: "10px sans-serif",
  shadowColor: "rgba(0, 0, 0, 0)",
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
};

/** The operators the recorder accepted; others were dropped without reaching the canvas. */
const COMPOSITE_OPERATIONS = [
  "lighter",
  "xor",
  "copy",
  "destination-out",
  "destination-in",
  "destination-atop",
  "destination-over",
  "source-out",
  "source-in",
  "source-atop",
  "source-over",
  "luminosity",
  "color",
  "saturation",
  "hue",
  "exclusion",
  "difference",
  "soft-light",
  "hard-light",
  "color-burn",
  "color-dodge",
  "lighten",
  "darken",
  "overlay",
  "screen",
  "multiply",
  "normal",
];

/** The old recorders shared one start-point array through their prototype. */
const sharedPathStart = new Float64Array(2);

/** What decides whether a replayed draw would have been skipped. */
export interface ReplayPolicy {
  /** The render parameters the replay of a canvas painted now would run with. */
  replayParameters(): Record<string, unknown>;
  isRenderPhase(): boolean;
  /** The shared WebGL canvas, if one exists. */
  glCanvas(): HTMLCanvasElement | null;
  /** Whether `canvas` belongs to a recorded (wrapped) context. */
  isRecordedCanvas(canvas: unknown): boolean;
}

let nextContextId = 1;

export class RecorderStateContext implements Context2D {
  readonly canvas: HTMLCanvasElement;
  readonly real: CanvasRenderingContext2D;
  /** Same numbering as the old recorders (__contextId). */
  readonly contextId: number;
  readonly persistent: boolean;
  /** Made on request (a tile canvas) rather than because a render phase was running. */
  readonly isRoot: boolean;
  /** Set when a draw was left out; reported (and cleared) by RenderScheduler.render. */
  skipped = false;
  restoreCount = 0;
  maxRestoreCount = 0;

  private readonly _values: Record<SyncedProperty, unknown> = { ...DEFAULTS };
  private _savedValues: unknown[] | null = null;
  private _lineDash: number[] | undefined = undefined;
  private _pathStart: Float64Array | null = null;
  private readonly _policy: ReplayPolicy;

  constructor(
    canvas: HTMLCanvasElement,
    policy: ReplayPolicy,
    persistent?: boolean,
    isRoot?: boolean,
  ) {
    this.canvas = canvas;
    this.real = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.contextId = nextContextId++;
    this.persistent = !!persistent;
    this.isRoot = !!isRoot;
    this._policy = policy;
  }

  // -- Properties. Getters answer from the copies, setters update both.

  get imageSmoothingQuality(): ImageSmoothingQuality {
    return this._values.imageSmoothingQuality as ImageSmoothingQuality;
  }
  set imageSmoothingQuality(value: ImageSmoothingQuality) {
    this._set("imageSmoothingQuality", value);
  }
  get imageSmoothingEnabled(): boolean {
    return this._values.imageSmoothingEnabled as boolean;
  }
  set imageSmoothingEnabled(value: boolean) {
    this._set("imageSmoothingEnabled", value);
  }
  get textAlign(): CanvasTextAlign {
    return this._values.textAlign as CanvasTextAlign;
  }
  set textAlign(value: CanvasTextAlign) {
    this._set("textAlign", value);
  }
  get textBaseline(): CanvasTextBaseline {
    return this._values.textBaseline as CanvasTextBaseline;
  }
  set textBaseline(value: CanvasTextBaseline) {
    this._set("textBaseline", value);
  }
  get font(): string {
    return this._values.font as string;
  }
  set font(value: string) {
    this._set("font", value);
  }
  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this._values.strokeStyle as string | CanvasGradient | CanvasPattern;
  }
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this._set("strokeStyle", value);
  }
  get miterLimit(): number {
    return this._values.miterLimit as number;
  }
  set miterLimit(value: number) {
    this._set("miterLimit", value);
  }
  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this._values.fillStyle as string | CanvasGradient | CanvasPattern;
  }
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this._set("fillStyle", value);
  }
  get filter(): string {
    return this._values.filter as string;
  }
  set filter(value: string) {
    this._set("filter", value);
  }
  get lineJoin(): CanvasLineJoin {
    return this._values.lineJoin as CanvasLineJoin;
  }
  set lineJoin(value: CanvasLineJoin) {
    this._set("lineJoin", value);
  }
  get lineCap(): CanvasLineCap {
    return this._values.lineCap as CanvasLineCap;
  }
  set lineCap(value: CanvasLineCap) {
    this._set("lineCap", value);
  }
  get lineWidth(): number {
    return this._values.lineWidth as number;
  }
  set lineWidth(value: number) {
    this._set("lineWidth", value);
  }
  get lineDashOffset(): number {
    return this._values.lineDashOffset as number;
  }
  set lineDashOffset(value: number) {
    this._set("lineDashOffset", value);
  }
  get globalAlpha(): number {
    return this._values.globalAlpha as number;
  }
  set globalAlpha(value: number) {
    this._set("globalAlpha", value);
  }
  get globalCompositeOperation(): GlobalCompositeOperation {
    return this._values.globalCompositeOperation as GlobalCompositeOperation;
  }
  set globalCompositeOperation(value: GlobalCompositeOperation) {
    if (COMPOSITE_OPERATIONS.indexOf(value) < 0) return;
    this._set("globalCompositeOperation", value);
  }
  get shadowColor(): string {
    return this._values.shadowColor as string;
  }
  set shadowColor(value: string) {
    this._set("shadowColor", value);
  }
  get shadowBlur(): number {
    return this._values.shadowBlur as number;
  }
  set shadowBlur(value: number) {
    this._set("shadowBlur", value);
  }
  get shadowOffsetX(): number {
    return this._values.shadowOffsetX as number;
  }
  set shadowOffsetX(value: number) {
    this._set("shadowOffsetX", value);
  }
  get shadowOffsetY(): number {
    return this._values.shadowOffsetY as number;
  }
  set shadowOffsetY(value: number) {
    this._set("shadowOffsetY", value);
  }

  /** The recorder answered 1 and ignored writes. */
  get imageRendering(): unknown {
    return 1;
  }

  set imageRendering(value: unknown) {}

  private _set(name: SyncedProperty, value: unknown): void {
    this._values[name] = value;
    (this.real as unknown as Record<string, unknown>)[name] = value;
  }

  // -- State.

  save(): void {
    this.real.save();
    // One level only, like the old recorder.
    this._savedValues = SYNCED_PROPERTIES.map((name) => this._values[name]);
    this.restoreCount++;
    this.maxRestoreCount = this.restoreCount;
  }

  restore(): void {
    this.real.restore();
    const saved = this._savedValues;
    if (saved) {
      SYNCED_PROPERTIES.forEach((name, i) => {
        this._values[name] = saved[i];
      });
    }
    if (this.restoreCount > 0) this.restoreCount--;
  }

  /** Undoes the saves of a pass that failed halfway (the old forceRestore). */
  forceRestore(): void {
    for (let i = 0; i < this.maxRestoreCount; i++) this.real.restore();
  }

  getLineDash(): number[] {
    return this._lineDash as number[];
  }

  setLineDash(segments: number[]): void {
    this.real.setLineDash(segments);
    this._lineDash = segments;
  }

  // -- Paths.

  beginPath(): void {
    this._pathStart = null;
    this.real.beginPath();
  }

  moveTo(x: number, y: number): void {
    if (!this._pathStart) {
      this._pathStart = sharedPathStart;
      this._pathStart[0] = x;
      this._pathStart[1] = y;
    }
    this.real.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.real.lineTo(x, y);
  }

  closePath(asLine?: boolean): void {
    if (asLine || ("round" === this._values.lineJoin && "round" === this._values.lineCap)) {
      if (this._pathStart) this.lineTo(this._pathStart[0] as number, this._pathStart[1] as number);
      else this.lineTo(0, 0);
    } else {
      this.real.closePath();
    }
    this._pathStart = null;
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.real.quadraticCurveTo(cpx, cpy, x, y);
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.real.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void {
    // The recorder stored the direction as a byte, so it always passed a boolean.
    this.real.arc(x, y, radius, startAngle, endAngle, !!counterclockwise);
  }

  clip(fillRule?: CanvasFillRule): void {
    if (void 0 !== fillRule) this.real.clip(fillRule);
    else this.real.clip();
  }

  fill(fillRule?: CanvasFillRule): void {
    this._pathStart = null;
    this.real.fill(fillRule);
  }

  stroke(): void {
    this._pathStart = null;
    this.real.stroke();
  }

  // -- Drawing.

  fillRect(x: number, y: number, w: number, h: number): void {
    this.real.fillRect(x, y, w, h);
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.real.strokeRect(x, y, w, h);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.real.clearRect(x, y, w, h);
  }

  fillText(text: string, x: number, y: number): void {
    this.real.fillText(text, x, y);
  }

  strokeText(text: string, x: number, y: number): void {
    this.real.strokeText(text, x, y);
  }

  measureText(text: string): TextMetrics {
    return this.real.measureText(text);
  }

  drawImage(image: CanvasImageSource, ...args: number[]): void {
    if (this._skipsDraw(image)) return;
    // The recorder stored 2, 4 or 8 numbers depending on which were given.
    const values = [args[0] as number, args[1] as number];
    if (void 0 !== args[2]) values.push(args[2], args[3] as number);
    if (void 0 !== args[4]) {
      values.push(args[4], args[5] as number, args[6] as number, args[7] as number);
    }
    (this.real.drawImage as (image: CanvasImageSource, ...rest: number[]) => void).call(
      this.real,
      image,
      ...values,
    );
  }

  private _skipsDraw(image: CanvasImageSource): boolean {
    const policy = this._policy;
    if (!policy.isRecordedCanvas(image) && image !== policy.glCanvas()) return false;
    if (image === policy.glCanvas() && !policy.isRenderPhase()) return false;
    const parameters = policy.replayParameters();
    if (
      (parameters.quickRender && !this.isRoot) ||
      (parameters.noWebGL && image === policy.glCanvas())
    ) {
      this.skipped = true;
      return true;
    }
    const canvas = image as HTMLCanvasElement;
    return canvas.width * canvas.height == 0;
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    // The recorder answered null for an empty area instead of throwing.
    return (sw < 1 || sh < 1 ? null : this.real.getImageData(sx, sy, sw, sh)) as ImageData;
  }

  putImageData(data: ImageData, dx: number, dy: number): void {
    this.real.putImageData(data, dx, dy);
  }

  createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null {
    return this.real.createPattern(image, repetition);
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.real.createLinearGradient(x0, y0, x1, y1);
  }

  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient {
    return this.real.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }

  // -- Transforms.

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.real.setTransform(a, b, c, d, e, f);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.real.transform(a, b, c, d, e, f);
  }

  translate(x: number, y: number): void {
    this.real.translate(x, y);
  }

  scale(x: number, y: number): void {
    this.real.scale(x, y);
  }

  rotate(angle: number): void {
    this.real.rotate(angle);
  }
}
