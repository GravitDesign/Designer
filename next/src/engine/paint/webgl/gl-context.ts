// Old: chunk.vendor.js module 226 (the shared GL context and GLTexture),
// plus the WebGL set-up the dropped recorder did when it loaded (module 899):
// probing the best texture type and a readPixels fallback.
//
// All WebGL work (effects, the blender's extra blend modes) shares one
// context with premultipliedAlpha off. Textures are made with the best
// type the probe found: FLOAT, else HALF_FLOAT, else UNSIGNED_BYTE.
import { RenderScheduler } from "../render-scheduler.ts";
import type { Context2D } from "../context-2d.ts";
import { GLTextures } from "../gl-textures.ts";

/** The shared context with the helpers the shaders hang on it. */
export interface SharedGLContext extends WebGLRenderingContext {
  framebuffer?: WebGLFramebuffer | null;
  vertexBuffer?: WebGLBuffer | null;
  texCoordBuffer?: WebGLBuffer | null;
  defaultShader?: unknown;
}

/** gl.HALF_FLOAT of OES_texture_half_float, which WebGL 1 has no constant for. */
export const HALF_FLOAT = 36193;

let textureFormat: number | undefined;
let supportedTextureFormat: number | undefined;
let context: SharedGLContext | null = null;
let helperContext: Context2D | null = null;
let helperContextInRenderPhase: Context2D | null = null;

/** A texture on the shared context. */
export class GLTexture {
  /** A texture from RGBA bytes. */
  static fromBytes(
    width: number,
    height: number,
    bytes: ArrayLike<number> | ArrayBufferLike,
  ): GLTexture | undefined {
    const gl = GLContext.getGLContext();
    if (gl) {
      const texture = new GLTexture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE);
      texture.initFromBytes(width, height, bytes);
      return texture;
    }
    return undefined;
  }

  static fromCanvas(
    canvas: TexImageSource,
    width?: number,
    height?: number,
  ): GLTexture | undefined {
    const gl = GLContext.getGLContext();
    if (gl) {
      const texture = new GLTexture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE);
      texture.initFromCanvas(canvas, width, height);
      return texture;
    }
    return undefined;
  }

  static fromCanvasCropped(
    canvas: HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number,
  ): GLTexture | undefined {
    const gl = GLContext.getGLContext();
    if (gl) {
      dx = dx || 0;
      dy = dy || 0;
      dw = dw || sw;
      dh = dh || sh;
      const texture = new GLTexture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE);
      texture.initFromCanvasCropped(canvas, sx, sy, sw, sh, dx, dy, dw, dh);
      return texture;
    }
    return undefined;
  }

  id: WebGLTexture | null;
  width: number;
  height: number;
  format: number;
  type: number;

  constructor(width: number, height: number, format: number, type: number | undefined) {
    const gl = GLContext.getGLContext() as SharedGLContext;
    this.id = gl.createTexture();
    this.width = width;
    this.height = height;
    this.format = format;
    this.type = type as number;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (width && height) {
      gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
    }
    GLTextures.addTexture(this);
  }

  clone(): GLTexture | undefined {
    const gl = GLContext.getGLContext();
    if (gl) {
      const copy = new GLTexture(0, 0, this.format, textureFormat);
      gl.framebuffer = gl.framebuffer || gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
      gl.bindTexture(gl.TEXTURE_2D, copy.id);
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, this.format, 0, 0, this.width, this.height, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      copy.width = this.width;
      copy.height = this.height;
      return copy;
    }
    return undefined;
  }

  initFromBytes(width: number, height: number, bytes: ArrayLike<number> | ArrayBufferLike): void {
    const gl = GLContext.getGLContext();
    if (!gl) return;
    this.width = width;
    this.height = height;
    this.format = gl.RGBA;
    this.type = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      this.type,
      new Uint8Array(bytes as ArrayLike<number>),
    );
  }

  initFromCanvas(canvas: TexImageSource, width?: number, height?: number): void {
    const gl = GLContext.getGLContext();
    if (!gl) return;
    const sized = canvas as { width: number; height: number };
    this.width = width || sized.width;
    this.height = height || sized.height;
    this.format = gl.RGBA;
    this.type = gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    if (
      void 0 === width ||
      void 0 === width ||
      (sized.width === width && sized.height === height)
    ) {
      GLContext.flushCanvasForSPECIALBrowsers(canvas as CanvasImageSource);
    } else {
      const helper = getHelperContext();
      helper.canvas.width = width;
      helper.canvas.height = height as number;
      helper.clearRect(0, 0, width, height as number);
      helper.drawImage(canvas as CanvasImageSource, 0, 0, width, height as number);
      // The old code then uploaded an undefined `resizedCanvas`
      // (ReferenceError); nothing called it with a different size.
      throw new ReferenceError("resizedCanvas is not defined");
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  /** Uploads part of a canvas, scaled through a helper canvas unless it is the whole canvas as is. */
  initFromCanvasCropped(
    canvas: HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number,
  ): void {
    const gl = GLContext.getGLContext();
    if (!gl) return;
    dw = dw || sw;
    dh = dh || sh;
    this.width = dw;
    this.height = dh;
    this.format = gl.RGBA;
    this.type = gl.UNSIGNED_BYTE;
    dx = dx || 0;
    dy = dy || 0;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    let source: TexImageSource;
    if (
      0 !== sx ||
      0 !== sy ||
      dw !== canvas.width ||
      dh !== canvas.height ||
      dw !== sw ||
      dh !== sh
    ) {
      const helper = getHelperContext();
      helper.canvas.width = dw;
      helper.canvas.height = dh;
      helper.clearRect(0, 0, dw, dh);
      helper.drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh);
      source = helper.canvas;
      GLContext.flushCanvasForSPECIALBrowsers(source as CanvasImageSource);
    } else {
      source = canvas;
      GLContext.flushCanvasForSPECIALBrowsers(source);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  flushCanvasForSPECIALBrowsers(canvas: CanvasImageSource): void {
    drawIntoPixel(canvas);
  }

  destroy(): void {
    const gl = GLContext.getGLContext();
    if (gl && "undefined" != typeof WebGLRenderingContext) {
      gl.deleteTexture(this.id);
      GLTextures.deleteTexture(this);
      this.id = null;
    }
  }

  use(unit?: number): void {
    const gl = GLContext.getGLContext();
    if (gl) {
      gl.activeTexture(gl.TEXTURE0 + (unit || 0));
      gl.bindTexture(gl.TEXTURE_2D, this.id);
    }
  }

  unuse(unit?: number): void {
    const gl = GLContext.getGLContext();
    if (gl) {
      gl.activeTexture(gl.TEXTURE0 + (unit || 0));
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  /** Renders into this texture: binds it as the framebuffer, sets the viewport, calls `draw`. */
  drawTo(draw: (viewport: number[]) => void): void {
    const gl = GLContext.getGLContext();
    if (gl) {
      gl.framebuffer = gl.framebuffer || gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
      gl.viewport(0, 0, this.width, this.height);
      draw([0, 0, this.width, this.height]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  /** Reallocates the texture when size, format or type differ (or takes them from another texture). */
  ensureFormat(width: number | GLTexture, height?: number, format?: number, type?: number): void {
    const gl = GLContext.getGLContext();
    if (!gl) return;
    if (1 == arguments.length) {
      const other = width as GLTexture;
      width = other.width;
      height = other.height;
      format = other.format;
      type = other.type;
    }
    if (width == this.width && height == this.height && format == this.format && type == this.type)
      return;
    this.width = width as number;
    this.height = height as number;
    this.format = format as number;
    this.type = type as number;
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.format,
      width as number,
      height as number,
      0,
      this.format,
      this.type,
      null,
    );
  }

  /** Swaps id, size and format (not the type) with `other`. */
  swapWith(other: GLTexture): void {
    let swap: unknown = other.id;
    other.id = this.id;
    this.id = swap as WebGLTexture | null;
    swap = other.width;
    other.width = this.width;
    this.width = swap as number;
    swap = other.height;
    other.height = this.height;
    this.height = swap as number;
    swap = other.format;
    other.format = this.format;
    this.format = swap as number;
  }

  isInitialized(): boolean {
    return null !== this.id;
  }
}

/** The old browser workaround: draw the canvas into a 1x1 canvas before uploading it. */
function drawIntoPixel(canvas: CanvasImageSource): void {
  const pixel = document.createElement("canvas");
  pixel.width = 1;
  pixel.height = 1;
  (pixel.getContext("2d") as CanvasRenderingContext2D).drawImage(canvas, 0, 0);
}

/** The 2D canvas cropped uploads go through; one per render-phase state, as before. */
function getHelperContext(): Context2D {
  if (RenderScheduler.isRenderPhase()) {
    if (!helperContextInRenderPhase) {
      helperContextInRenderPhase = RenderScheduler.getRenderer(void 0, void 0, void 0, true);
    }
    return helperContextInRenderPhase;
  }
  if (!helperContext) helperContext = RenderScheduler.getRenderer(void 0, void 0, void 0, true);
  return helperContext;
}

// -- The texture type probe and readPixels fallback of the old recorder.

function probeProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram() as WebGLProgram;
  const vertex = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
  const fragment = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
  gl.shaderSource(
    vertex,
    "\t\tattribute vec2 vertex;\t\tvoid main() {\t\tgl_PointSize = 1.0;\t\tgl_Position = vec4(vertex, 0.0, 1.0);\t\t}\t\t",
  );
  gl.shaderSource(
    fragment,
    "\t\tuniform highp sampler2D texture;\t\tvoid main() {\t\tgl_FragColor = texture2D(texture, vec2(0.5));\t\t}\t\t",
  );
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return program;
}

type ProbeContext = WebGLRenderingContext & { framebuffer?: WebGLFramebuffer | null };

function setLinearClamp(gl: WebGLRenderingContext, filter: number): void {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** Whether textures of `type` can be rendered to and sampled with linear filtering. */
function supportsTextureType(
  gl: ProbeContext,
  program: WebGLProgram,
  type: number,
  extensions: string[],
  hasExtension: (name: string) => boolean,
): boolean {
  for (const name of extensions) if (!hasExtension(name)) return false;
  const framebuffer = gl.framebuffer || gl.createFramebuffer();
  gl.framebuffer = framebuffer;
  const target = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, target);
  setLinearClamp(gl, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
  const pixels =
    type === gl.FLOAT ? new Float32Array([1, 1, 0, 0]) : new Uint16Array([16256, 16256, 0, 0]);
  const source = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, source);
  setLinearClamp(gl, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, type, pixels);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0]), gl.STREAM_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const result = new Uint8Array(4);
  gl.useProgram(program);
  gl.viewport(0, 0, 1, 1);
  gl.bindTexture(gl.TEXTURE_2D, source);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.drawArrays(gl.POINTS, 0, 1);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, result);
  gl.deleteTexture(target);
  gl.deleteTexture(source);
  return 255 === result[0] && 255 === result[1] && 0 === result[2] && 0 === result[3];
}

/** Whether float textures sample with linear filtering although the extension is missing. */
function floatFiltersLinearly(gl: ProbeContext, program: WebGLProgram): boolean {
  if (!gl.getExtension("OES_texture_float")) return false;
  const framebuffer = gl.framebuffer || gl.createFramebuffer();
  gl.framebuffer = framebuffer;
  const target = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, target);
  setLinearClamp(gl, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
  const source = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, source);
  setLinearClamp(gl, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    2,
    2,
    0,
    gl.RGBA,
    gl.FLOAT,
    new Float32Array([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  );
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0]), gl.STREAM_DRAW);
  const location = gl.getAttribLocation(program, "vertex");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const result = new Uint8Array(4);
  gl.useProgram(program);
  gl.viewport(0, 0, 1, 1);
  gl.bindTexture(gl.TEXTURE_2D, source);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.drawArrays(gl.POINTS, 0, 1);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, result);
  gl.deleteTexture(target);
  gl.deleteTexture(source);
  return 127 === result[0] || 128 === result[0];
}

/**
 * The texture type the shared context uses. The old recorder found it once
 * on its own canvas when it loaded; where float textures filtered linearly
 * without OES_texture_float_linear it pretended the extension existed.
 */
export function getSupportedTextureFormat(): number | undefined {
  if (void 0 !== supportedTextureFormat || "undefined" == typeof document)
    return supportedTextureFormat;
  const canvas = document.createElement("canvas");
  const gl = (canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl")) as ProbeContext | null;
  if (!gl) {
    console.warn("No WebGL support. Most filters won't work");
    return supportedTextureFormat;
  }
  const program = probeProgram(gl);
  let emulatedFloatLinear = false;
  const supported = gl.getSupportedExtensions() || [];
  if (-1 === supported.indexOf("OES_texture_float_linear") && floatFiltersLinearly(gl, program)) {
    emulatedFloatLinear = true;
  }
  const hasExtension = (name: string): boolean =>
    (emulatedFloatLinear && "OES_texture_float_linear" === name) || !!gl.getExtension(name);
  if (
    supportsTextureType(
      gl,
      program,
      gl.FLOAT,
      ["OES_texture_float", "OES_texture_float_linear"],
      hasExtension,
    )
  ) {
    supportedTextureFormat = gl.FLOAT;
  } else if (
    supportsTextureType(
      gl,
      program,
      HALF_FLOAT,
      ["OES_texture_half_float", "OES_texture_half_float_linear"],
      hasExtension,
    )
  ) {
    supportedTextureFormat = HALF_FLOAT;
  } else supportedTextureFormat = gl.UNSIGNED_BYTE;
  return supportedTextureFormat;
}

let readPixelsChecked = false;
let readPixelsAsFloat = false;

/**
 * gl.readPixels as the old recorder patched it: the first call checks for
 * an error (any pending GL error counts); after a failure every read goes
 * through FLOAT and is scaled to 0-255.
 */
export function readPixels(
  gl: WebGLRenderingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  format: number,
  type: number,
  pixels: ArrayBufferView,
): void {
  if (!readPixelsAsFloat) {
    let failed = false;
    try {
      gl.readPixels(x, y, width, height, format, type, pixels);
    } catch {
      failed = true;
    }
    if (!failed && !readPixelsChecked) {
      failed = gl.getError() !== gl.NO_ERROR;
      readPixelsChecked = true;
    }
    if (failed) readPixelsAsFloat = true;
  }
  if (readPixelsAsFloat) {
    try {
      const target = pixels as unknown as { length: number; [index: number]: number };
      const count = target.length;
      const floats = new Float32Array(count);
      gl.readPixels(x, y, width, height, format, gl.FLOAT, floats);
      for (let i = 0; i < count; i++) target[i] = 255 * (floats[i] as number);
    } catch (error) {
      console.warn("Cannot read pixel data:" + (error as Error).message);
    }
  }
}

function createContext(): SharedGLContext | null {
  const attributes = { premultipliedAlpha: false };
  const gl = (RenderScheduler.getRenderer(true, "webgl", attributes, true) ||
    RenderScheduler.getRenderer(
      true,
      "experimental-webgl",
      attributes,
      true,
    )) as SharedGLContext | null;
  if (!gl) return null;
  const format = getSupportedTextureFormat();
  if (format === gl.FLOAT) {
    gl.getExtension("OES_texture_float");
    gl.getExtension("OES_texture_float_linear");
  } else if (format === HALF_FLOAT) {
    gl.getExtension("OES_texture_half_float");
    gl.getExtension("OES_texture_half_float_linear");
  }
  return gl;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old class threw when instantiated and had only statics
export class GLContext {
  static GLTexture = GLTexture;

  private constructor() {
    throw new Error("This class cannot be instantiated");
  }

  static flushCanvasForSPECIALBrowsers(canvas: CanvasImageSource): void {
    drawIntoPixel(canvas);
  }

  /**
   * A texture from a canvas (whole, or cropped with 5, 7 or 9 arguments),
   * from bytes (bytes, width, height), or empty (width, height, format).
   */
  static createTexture(...args: unknown[]): GLTexture | undefined {
    const first = args[0];
    if (first instanceof HTMLCanvasElement) {
      if (5 == args.length || 7 == args.length || 9 == args.length) {
        return GLTexture.fromCanvasCropped(
          first,
          args[1] as number,
          args[2] as number,
          args[3] as number,
          args[4] as number,
          args[5] as number | undefined,
          args[6] as number | undefined,
          args[7] as number | undefined,
          args[8] as number | undefined,
        );
      }
    }
    // The old code read the width and height only when three or more
    // arguments came, so createTexture(canvas, w) uploads the whole canvas.
    const sized = args.length >= 3;
    const width = (sized ? args[1] : undefined) as number | undefined;
    const height = (sized ? args[2] : undefined) as number | undefined;
    if (first instanceof HTMLCanvasElement) return GLTexture.fromCanvas(first, width, height);
    if ("number" != typeof first && "string" != typeof first) {
      return GLTexture.fromBytes(width as number, height as number, first as ArrayLike<number>);
    }
    return new GLTexture(first as number, args[1] as number, args[2] as number, textureFormat);
  }

  /** The shared WebGL context, made on first use; null without WebGL. */
  static getGLContext(): SharedGLContext | null {
    if ("undefined" == typeof WebGLRenderingContext) return null;
    if (context) return context;
    const gl = createContext();
    if (!gl) {
      console.warn("No WebGL support. Most filters won't work");
      return null;
    }
    context = gl;
    textureFormat = getSupportedTextureFormat();
    if ("undefined" == typeof document) return null;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
      },
      false,
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        context = null;
      },
      false,
    );
    return gl;
  }
}

RenderScheduler.setGLCanvasProvider(() => (context ? (context.canvas as HTMLCanvasElement) : null));
