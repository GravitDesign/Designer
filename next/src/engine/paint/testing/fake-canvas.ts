// A small stand-in for <canvas> and its 2D context, for unit tests that
// run in Node. It logs every call and property write in order (the call
// stream is what the paint code must keep), keeps an RGBA pixel buffer for
// clearRect, fillRect with plain colors, getImageData and putImageData (no
// transforms, no blending), and rejects unknown composite operators like a
// browser does.

const BROWSER_OPERATORS = new Set([
  "source-over",
  "source-in",
  "source-out",
  "source-atop",
  "destination-over",
  "destination-in",
  "destination-out",
  "destination-atop",
  "lighter",
  "copy",
  "xor",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
]);

function format(value: unknown): string {
  if (value instanceof FakeCanvas) return "canvas#" + value.id;
  if (Array.isArray(value)) return "[" + value.map(format).join(",") + "]";
  if (typeof value == "string") return JSON.stringify(value);
  return String(value);
}

let nextCanvasId = 1;

export class FakeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

function parseColor(style: unknown): [number, number, number, number] {
  if (typeof style == "string" && /^#[0-9a-f]{6}$/i.test(style)) {
    const value = parseInt(style.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
  }
  return [0, 0, 0, 255];
}

interface State {
  fillStyle: unknown;
  strokeStyle: unknown;
  globalAlpha: number;
  globalCompositeOperation: string;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  filter: string;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  lineDashOffset: number;
}

function defaultState(): State {
  return {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    miterLimit: 10,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    filter: "none",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    shadowColor: "rgba(0, 0, 0, 0)",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineDashOffset: 0,
  };
}

export class FakeContext2D {
  readonly canvas: FakeCanvas;
  /** Calls and property writes, in order. */
  log: string[] = [];
  _state: State = defaultState();
  _stack: State[] = [];
  _lineDash: number[] = [];

  // Accessors on the prototype (see below).
  declare fillStyle: unknown;
  declare strokeStyle: unknown;
  declare globalAlpha: number;
  declare globalCompositeOperation: string;
  declare lineWidth: number;
  declare lineCap: string;
  declare lineJoin: string;
  declare miterLimit: number;
  declare font: string;
  declare textAlign: string;
  declare textBaseline: string;
  declare filter: string;
  declare imageSmoothingEnabled: boolean;
  declare imageSmoothingQuality: string;
  declare shadowColor: string;
  declare shadowBlur: number;
  declare shadowOffsetX: number;
  declare shadowOffsetY: number;
  declare lineDashOffset: number;

  constructor(canvas: FakeCanvas) {
    this.canvas = canvas;
  }

  _reset(): void {
    this._state = defaultState();
    this._stack = [];
    this._lineDash = [];
  }

  private _call(name: string, args: unknown[]): void {
    this.log.push(name + "(" + args.map(format).join(",") + ")");
  }

  save(): void {
    this._call("save", []);
    this._stack.push({ ...this._state });
  }
  restore(): void {
    this._call("restore", []);
    const state = this._stack.pop();
    if (state) this._state = state;
  }
  getLineDash(): number[] {
    return this._lineDash.slice();
  }
  setLineDash(segments: number[]): void {
    this._call("setLineDash", [segments]);
    this._lineDash = segments.slice();
  }
  beginPath(): void {
    this._call("beginPath", []);
  }
  moveTo(x: number, y: number): void {
    this._call("moveTo", [x, y]);
  }
  lineTo(x: number, y: number): void {
    this._call("lineTo", [x, y]);
  }
  closePath(): void {
    this._call("closePath", []);
  }
  quadraticCurveTo(...args: number[]): void {
    this._call("quadraticCurveTo", args);
  }
  bezierCurveTo(...args: number[]): void {
    this._call("bezierCurveTo", args);
  }
  arc(...args: unknown[]): void {
    this._call("arc", args);
  }
  clip(...args: unknown[]): void {
    this._call("clip", args);
  }
  fill(...args: unknown[]): void {
    this._call("fill", args);
  }
  stroke(): void {
    this._call("stroke", []);
  }
  rotate(angle: number): void {
    this._call("rotate", [angle]);
  }
  scale(x: number, y: number): void {
    this._call("scale", [x, y]);
  }
  translate(x: number, y: number): void {
    this._call("translate", [x, y]);
  }
  transform(...args: number[]): void {
    this._call("transform", args);
  }
  setTransform(...args: number[]): void {
    this._call("setTransform", args);
  }
  fillText(...args: unknown[]): void {
    this._call("fillText", args);
  }
  strokeText(...args: unknown[]): void {
    this._call("strokeText", args);
  }
  measureText(text: string): { width: number } {
    this._call("measureText", [text]);
    return { width: text.length * 5 };
  }
  createPattern(image: unknown, repetition: unknown): { pattern: unknown; repetition: unknown } {
    this._call("createPattern", [image, repetition]);
    return { pattern: image, repetition };
  }
  createLinearGradient(...args: number[]): {
    stops: unknown[];
    addColorStop(o: number, c: string): void;
  } {
    this._call("createLinearGradient", args);
    const gradient = {
      stops: [] as unknown[],
      addColorStop: (offset: number, color: string) => {
        this._call("addColorStop", [offset, color]);
        gradient.stops.push([offset, color]);
      },
    };
    return gradient;
  }
  createRadialGradient(...args: number[]): {
    stops: unknown[];
    addColorStop(o: number, c: string): void;
  } {
    this._call("createRadialGradient", args);
    const gradient = {
      stops: [] as unknown[],
      addColorStop: (offset: number, color: string) => {
        this._call("addColorStop", [offset, color]);
        gradient.stops.push([offset, color]);
      },
    };
    return gradient;
  }
  drawImage(...args: unknown[]): void {
    this._call("drawImage", args);
  }

  // -- Pixels (no transform, no blending).

  private _fill(
    x: number,
    y: number,
    w: number,
    h: number,
    rgba: [number, number, number, number],
  ): void {
    const canvas = this.canvas;
    for (
      let row = Math.max(0, Math.floor(y));
      row < Math.min(canvas.height, Math.ceil(y + h));
      row++
    ) {
      for (
        let column = Math.max(0, Math.floor(x));
        column < Math.min(canvas.width, Math.ceil(x + w));
        column++
      ) {
        canvas.pixels.set(rgba, (row * canvas.width + column) * 4);
      }
    }
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this._call("clearRect", [x, y, w, h]);
    this._fill(x, y, w, h, [0, 0, 0, 0]);
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this._call("fillRect", [x, y, w, h]);
    this._fill(x, y, w, h, parseColor(this._state.fillStyle));
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    this._call("strokeRect", [x, y, w, h]);
  }
  getImageData(sx: number, sy: number, sw: number, sh: number): FakeImageData {
    this._call("getImageData", [sx, sy, sw, sh]);
    sx = Math.trunc(sx);
    sy = Math.trunc(sy);
    const result = new FakeImageData(sw, sh);
    const canvas = this.canvas;
    for (let row = 0; row < sh; row++) {
      for (let column = 0; column < sw; column++) {
        const x = sx + column;
        const y = sy + row;
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
        const from = (y * canvas.width + x) * 4;
        result.data.set(canvas.pixels.subarray(from, from + 4), (row * sw + column) * 4);
      }
    }
    return result;
  }
  putImageData(data: FakeImageData, dx: number, dy: number): void {
    this._call("putImageData", [data.width + "x" + data.height, dx, dy]);
    const canvas = this.canvas;
    for (let row = 0; row < data.height; row++) {
      for (let column = 0; column < data.width; column++) {
        const x = dx + column;
        const y = dy + row;
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
        const from = (row * data.width + column) * 4;
        canvas.pixels.set(data.data.subarray(from, from + 4), (y * canvas.width + x) * 4);
      }
    }
  }
}

// Properties live on the prototype, as on a real context, so hasOwnProperty
// answers false and the paint code's feature checks see a browser context.
for (const name of Object.keys(defaultState()) as (keyof State)[]) {
  Object.defineProperty(FakeContext2D.prototype, name, {
    get(this: FakeContext2D) {
      return this._state[name];
    },
    set(this: FakeContext2D, value: unknown) {
      if (name === "globalCompositeOperation" && !BROWSER_OPERATORS.has(value as string)) return;
      this.log.push(name + "=" + format(value));
      (this._state as unknown as Record<string, unknown>)[name] = value;
    },
    configurable: true,
  });
}

export class FakeCanvas {
  readonly id = nextCanvasId++;
  private _width = 300;
  private _height = 150;
  pixels = new Uint8ClampedArray(300 * 150 * 4);
  style: Record<string, string> = { imageRendering: "" };
  private _context: FakeContext2D | null = null;
  /** What toBlob hands out (bytes), for encoder tests. */
  blobBytes: Uint8Array = new Uint8Array(0);

  get width(): number {
    return this._width;
  }
  set width(value: number) {
    this._width = Math.trunc(value);
    this._resized();
  }
  get height(): number {
    return this._height;
  }
  set height(value: number) {
    this._height = Math.trunc(value);
    this._resized();
  }

  private _resized(): void {
    // Like a browser: any size write clears the pixels and resets the context.
    this.pixels = new Uint8ClampedArray(this._width * this._height * 4);
    if (this._context) {
      this._context.log.push("<resize " + this._width + "x" + this._height + ">");
      this._context._reset();
    }
  }

  getContext(type: string): FakeContext2D | null {
    if (type !== "2d") return null;
    if (!this._context) this._context = new FakeContext2D(this);
    return this._context;
  }

  toDataURL(type?: string, quality?: number): string {
    return "data:" + (type || "image/png") + ";q=" + String(quality) + ";" + this.id;
  }

  toBlob(callback: (blob: Blob) => void, type?: string): void {
    callback(new Blob([this.blobBytes as BlobPart], { type: type || "image/png" }));
  }
}

export class FakeImage {
  complete = true;
  naturalWidth = 0;
  naturalHeight = 0;
}

/** Installs the fakes as the DOM globals the paint code uses; returns an undo function. */
export function installFakeCanvas(): () => void {
  const globals = globalThis as unknown as Record<string, unknown>;
  const names = [
    "document",
    "HTMLCanvasElement",
    "CanvasRenderingContext2D",
    "HTMLImageElement",
    "Image",
    "WebGLRenderingContext",
  ];
  const saved = names.map((name) => [name, globals[name]] as const);
  globals.document = {
    createElement(tag: string) {
      if (tag !== "canvas") throw new Error("fake document only makes canvases");
      return new FakeCanvas();
    },
  };
  globals.HTMLCanvasElement = FakeCanvas;
  globals.CanvasRenderingContext2D = FakeContext2D;
  globals.HTMLImageElement = FakeImage;
  globals.Image = FakeImage;
  delete globals.WebGLRenderingContext;
  return () => {
    for (const [name, value] of saved) {
      if (value === undefined) Reflect.deleteProperty(globals, name);
      else globals[name] = value;
    }
  };
}

/** The log of the 2D context of a paint canvas' backing canvas. */
export function logOf(canvas: { _canvasContext: { canvas: unknown } }): string[] {
  return ((canvas._canvasContext.canvas as FakeCanvas).getContext("2d") as FakeContext2D).log;
}
