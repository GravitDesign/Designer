// Old: chunk.vendor.js module 42 (the GL shader base).
//
// A shader program on the shared context (compiled programs are cached by
// source hash) plus the machinery effects run through: `apply` renders a
// shader over a paint canvas, in tiles when it is large, and at a lower
// detail level when the effect's padding is big.
import { equals, hash } from "../../core/util.ts";
import type { Point } from "../../math/point.ts";
import { Rect } from "../../math/rect.ts";
import { RenderScheduler } from "../render-scheduler.ts";
import { getPaintCanvasClass, isPaintCanvas } from "../paint-canvas-class.ts";
import type { Canvas2DPaintCanvas, PaintCanvas } from "../paint-canvas.ts";
import { GLContext, type GLTexture } from "./gl-context.ts";

/** What a shader renders with: the WebGL renderer that owns the textures. */
export interface ShaderHost {
  texture: GLTexture;
  spareTexture: GLTexture;
  width: number;
  height: number;
  draw(texture: GLTexture, width?: number, height?: number): unknown;
  update(): unknown;
  readPixels(
    target: ArrayBufferView,
    type?: number,
    x?: number,
    y?: number,
    width?: number,
    height?: number,
  ): unknown;
  getAbsoluteEffectPadding?(): number | number[] | null | undefined;
}

/** An effect shader: a Shader with its own render step. */
export interface RenderingShader {
  glEffect: ShaderHost;
  render(
    properties: Record<string, unknown>,
    scale: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
}

/** The effect run that Shader.apply performs. */
export interface ShaderRun {
  properties: Record<string, unknown>;
  scale: number;
  shader: RenderingShader;
}

/** A uniform value: a number, a list of numbers, or a matrix as a list of columns. */
export type UniformValue = number | number[] | number[][];

interface CachedShader {
  src: string;
  program: WebGLShader;
}

const DEFAULT_VERTEX_SOURCE =
  "    attribute vec2 vertex;    attribute vec2 _texCoord;    varying highp vec2 texCoord;    void main() {        texCoord = _texCoord;        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);    }";

const DEFAULT_FRAGMENT_SOURCE =
  "    uniform highp sampler2D texture;    varying highp vec2 texCoord;    void main() {        gl_FragColor = texture2D(texture, texCoord);    }";

const FXAA_FRAGMENT_SOURCE_BASE =
  "const float FXAA_REDUCE_MIN = 0.0078125;\nconst float FXAA_REDUCE_MUL = 0.125;\nconst float FXAA_SPAN_MAX   =  8.0;\nuniform highp sampler2D tex;\nuniform vec2 tileSize;\nvarying highp vec2 texCoord;\nvarying vec2 localTexCoord;\nvarying vec2 localTexCoordTL;varying vec2 localTexCoordTR;varying vec2 localTexCoordBL;varying vec2 localTexCoordBR;\nvoid main() {\n    vec4 color;\n    mediump vec2 inverseVP = vec2(1.0 / tileSize.x, 1.0 / tileSize.y);\n    vec4 rgba = texture2D(tex, localTexCoordTL);\n    vec3 rgbTL = rgba.rgb * rgba.a;\n    rgba = texture2D(tex, localTexCoordTR);\n    vec3 rgbTR = rgba.rgb * rgba.a;\n    rgba = texture2D(tex, localTexCoordBL);\n    vec3 rgbBL = rgba.rgb * rgba.a;\n    rgba = texture2D(tex, localTexCoordBR);\n    vec3 rgbBR = rgba.rgb * rgba.a;\n    vec4 texColor = texture2D(tex, localTexCoord);\n    vec3 rgbM  = texColor.rgb * texColor.a;\n    vec3 luma = vec3(0.299, 0.587, 0.114);\n    float lumaTL = dot(rgbTL, luma);\n    float lumaTR = dot(rgbTR, luma);\n    float lumaBL = dot(rgbBL, luma);\n    float lumaBR = dot(rgbBR, luma);\n    float lumaM  = dot(rgbM,  luma);\n    float lumaMin = min(lumaM, min(min(lumaTL, lumaTR), min(lumaBL, lumaBR)));\n    float lumaMax = max(lumaM, max(max(lumaTL, lumaTR), max(lumaBL, lumaBR)));\n    \n    mediump vec2 dir;\n    dir.x = -((lumaTL + lumaTR) - (lumaBL + lumaBR));\n    dir.y =  ((lumaTL + lumaBL) - (lumaTR + lumaBR));\n    \n    float dirReduce = max((lumaTL + lumaTR + lumaBR + lumaBL) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n    \n    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),dir * rcpDirMin)) * inverseVP;\n    \n    vec4 sample00 = texture2D(tex, localTexCoord + dir * (1.0 / 3.0 - 0.5));\n    vec4 sample01 = texture2D(tex, localTexCoord + dir * (2.0 / 3.0 - 0.5));\n    vec3 rgbA = 0.5 * (sample00.rgb * sample00.a + sample01.rgb * sample01.a); \n    \n    vec4 sample10 = texture2D(tex, localTexCoord + dir * -0.5);\n    vec4 sample11 = texture2D(tex, localTexCoord + dir * 0.5);\n    vec3 rgbB = rgbA * 0.5 + 0.25 * (sample10.rgb * sample10.a + sample11.rgb * sample11.a);\n    float lumaB = dot(rgbB, luma);\n    if ((lumaB < lumaMin) || (lumaB > lumaMax)) {\n        gl_FragColor.rgba = 0.5 * (sample00 + sample01);\n    } else {\n        gl_FragColor.rgba = 0.25 * (sample00 + sample01) + 0.25 * (sample10 + sample11);\n    }\n";

/** Transposes a list of columns into one flat list (row by row); other values pass through. */
function flattenColumns(value: number[] | number[][]): number[] {
  const flat: number[] = [];
  const columns = value.length;
  if (!columns) return value as number[];
  const rows = (value[0] as number[]).length;
  if (!rows) return value as number[];
  for (let total = columns * rows, i = 0; i < total; i++) {
    flat.push((value[i % columns] as number[])[Math.floor(i / columns)] as number);
  }
  return flat;
}

function isNumber(value: unknown): value is number {
  return "[object Number]" == Object.prototype.toString.call(value);
}

/** The default detail level of `computeDownScale`; a page global DEFAULTDETAILLEVEL sets it. */
let defaultDetailLevel = 1;

export class Shader {
  static shaderCache: Record<number, CachedShader[]> = {};
  static linkedShaderCache: Record<number, WebGLProgram> = {};
  static shaderCacheNoRender: Record<number, CachedShader[]> = {};
  static linkedShaderCacheNoRender: Record<number, WebGLProgram> = {};
  static cannotReadUINT = false;

  static randomShaderFunc =
    "    float random(vec3 scale, float seed) {        /* use the fragment position for a different seed per-pixel */        return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);    }";
  static TOLOCAL =
    "    vec2 toLocal(vec2 coord) {        return ((coord * texSize) - offset)/tileSize;    }";
  static sobelVertexShader =
    "     attribute vec2 vertex;     attribute vec4 _texCoord;     uniform highp float texelWidth;     uniform highp float texelHeight;     varying highp vec2 texCoord;     varying vec2 leftTextureCoordinate;     varying vec2 rightTextureCoordinate;     varying vec2 topTextureCoordinate;     varying vec2 topLeftTextureCoordinate;     varying vec2 topRightTextureCoordinate;     varying vec2 bottomTextureCoordinate;     varying vec2 bottomLeftTextureCoordinate;     varying vec2 bottomRightTextureCoordinate;     void main()     {         gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);         vec2 widthStep = vec2(texelWidth, 0.0);         vec2 heightStep = vec2(0.0, texelHeight);         vec2 widthHeightStep = vec2(texelWidth, texelHeight);         vec2 widthNegativeHeightStep = vec2(texelWidth, -texelHeight);         texCoord = _texCoord.xy;         leftTextureCoordinate = _texCoord.xy - widthStep;         rightTextureCoordinate = _texCoord.xy + widthStep;         topTextureCoordinate = _texCoord.xy - heightStep;         topLeftTextureCoordinate = _texCoord.xy - widthHeightStep;         topRightTextureCoordinate = _texCoord.xy + widthNegativeHeightStep;         bottomTextureCoordinate = _texCoord.xy + heightStep;         bottomLeftTextureCoordinate = _texCoord.xy - widthNegativeHeightStep;         bottomRightTextureCoordinate = _texCoord.xy + widthHeightStep;     }";
  static tilingAwareVertexSource =
    "    attribute vec2 vertex;    attribute vec2 _texCoord;    varying highp vec2 texCoord;    varying vec2 localTexCoord;    uniform vec2 tileSize;    uniform vec2 offset;    uniform vec2 texSize;    void main() {        localTexCoord = _texCoord;        texCoord = (localTexCoord * tileSize + offset)/texSize;        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);    }";
  static _fxaaVertexSource =
    "attribute vec2 vertex;\nattribute vec2 _texCoord;\nvarying highp vec2 texCoord;\nvarying vec2 localTexCoordTL;\nvarying vec2 localTexCoordTR;\nvarying vec2 localTexCoordBL;\nvarying vec2 localTexCoordBR;\nvarying vec2 localTexCoord;\nuniform vec2 tileSize;\nuniform vec2 offset;\nuniform vec2 texSize;\nvoid main() {\n    vec2 step = vec2(1.0/tileSize.x, 1.0/tileSize.y);\n    localTexCoord = _texCoord;\n    localTexCoordTL = vec2(_texCoord.x - step.x, _texCoord.y - step.y);\n    localTexCoordBL = vec2(_texCoord.x - step.x, _texCoord.y + step.y);\n    localTexCoordTR = vec2(_texCoord.x + step.x, _texCoord.y - step.y);\n    localTexCoordBR = vec2(_texCoord.x + step.x, _texCoord.y + step.y);\n    texCoord = (localTexCoord * tileSize + offset)/texSize;\n    gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\n}";
  static _fxaaFragmentSourceBase = FXAA_FRAGMENT_SOURCE_BASE;
  static _fxaaFragmentSourceUnpremultiplied = FXAA_FRAGMENT_SOURCE_BASE + "}";
  static _fxaaFragmentSourcePremultiplied =
    FXAA_FRAGMENT_SOURCE_BASE +
    "if (gl_FragColor.a == 0.0) {\n        gl_FragColor.rgb = vec3(1.0, 1.0, 1.0);\n    } else {\n        gl_FragColor.rgb = (gl_FragColor.rgb+0.0001)/gl_FragColor.a;\n    }\n}";
  static screenSpaceDither =
    " vec3 screenSpaceDither (vec2 vScreenPos) {    highp vec3 vDither = vec3( dot( vec2( 171.0, 231.0 ), vScreenPos.xy ) );    vDither.rgb = fract( vDither.rgb / vec3( 103.0, 71.0, 97.0 ) );    return vDither.rgb / 255.0;}";
  static dithering =
    "float luma(vec3 color) {  return dot(color, vec3(0.299, 0.587, 0.114));}float luma(vec4 color) {  return dot(color.rgb, vec3(0.299, 0.587, 0.114));}float dither4x4(vec2 position, float brightness) {  int x = int(mod(position.x, 4.0));  int y = int(mod(position.y, 4.0));  int index = x + y * 4;  float limit = 0.0;  if (x < 8) {    if (index == 0) limit = 0.0625;    if (index == 1) limit = 0.5625;    if (index == 2) limit = 0.1875;    if (index == 3) limit = 0.6875;    if (index == 4) limit = 0.8125;    if (index == 5) limit = 0.3125;    if (index == 6) limit = 0.9375;    if (index == 7) limit = 0.4375;    if (index == 8) limit = 0.25;    if (index == 9) limit = 0.75;    if (index == 10) limit = 0.125;    if (index == 11) limit = 0.625;    if (index == 12) limit = 1.0;    if (index == 13) limit = 0.5;    if (index == 14) limit = 0.875;    if (index == 15) limit = 0.375;  }  return brightness < limit ? 0.0 : 1.0;}vec3 dither(vec2 position, vec3 color) {  return color * dither4x4(position, luma(color));}vec4 dither(vec2 position, vec4 color) {  return vec4(color.rgb * dither4x4(position, luma(color)), 1.0);}";

  /** A fragment shader that warps texture coordinates with `warp` (GLSL statements on `coord`). */
  static warpShader(head: string, warp: string): string {
    return (
      head +
      "    uniform highp sampler2D texture;    uniform vec2 texSize;    uniform vec2 tileSize;    uniform vec2 offset;    varying highp vec2 texCoord;    void main() {        highp vec2 coord = texCoord * tileSize + offset;        " +
      warp +
      "        gl_FragColor = texture2D(texture, (coord - offset) / tileSize);        highp vec2 clampedCoord = clamp(coord, offset, tileSize+offset);        if (coord != clampedCoord) {            /* fade to transparent if we are outside the image */            gl_FragColor.a *= max(0.0, 1.0 - length(coord - clampedCoord));        }    }"
    );
  }

  static clamp(min: number, value: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  static _getShaderCache(): Record<number, CachedShader[]> {
    if (RenderScheduler.isRenderPhase()) {
      if (!Shader.shaderCache) Shader.shaderCache = [];
      return Shader.shaderCache;
    }
    if (!Shader.shaderCacheNoRender) Shader.shaderCacheNoRender = [];
    return Shader.shaderCacheNoRender;
  }

  static _getLinkedShaderCache(): Record<number, WebGLProgram> {
    if (RenderScheduler.isRenderPhase()) {
      if (!Shader.linkedShaderCache) Shader.linkedShaderCache = [];
      return Shader.linkedShaderCache;
    }
    if (!Shader.linkedShaderCacheNoRender) Shader.linkedShaderCacheNoRender = [];
    return Shader.linkedShaderCacheNoRender;
  }

  /** Compiles (or takes from the cache) a shader of `type`; throws a "compile error: ..." string on failure. */
  static compileSource(type: number, source: string, sourceHash?: number): WebGLShader | null {
    const gl = GLContext.getGLContext();
    if (!gl) return null;
    const key = sourceHash || hash(source);
    const cache = Shader._getShaderCache();
    let entries = cache[key];
    if (entries) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i] as CachedShader;
        if (entry.src == source) return entry.program;
      }
    }
    const shader = gl.createShader(type) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw "compile error: " + gl.getShaderInfoLog(shader);
    }
    if (entries) entries.push({ src: source, program: shader });
    else {
      entries = [{ src: source, program: shader }];
      cache[key] = entries;
    }
    return shader;
  }

  /**
   * The linked program of both sources. The cache key is the sum of both
   * hashes, as in the old code.
   */
  static getLinkedProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const cache = Shader._getLinkedShaderCache();
    const vertexHash = hash(vertexSource);
    const fragmentHash = hash(fragmentSource);
    const cached = cache[vertexHash + fragmentHash];
    if (!cached) {
      const gl = GLContext.getGLContext();
      if (!gl) return null;
      const program = gl.createProgram() as WebGLProgram;
      gl.attachShader(
        program,
        Shader.compileSource(gl.VERTEX_SHADER, vertexSource, vertexHash) as WebGLShader,
      );
      gl.attachShader(
        program,
        Shader.compileSource(gl.FRAGMENT_SHADER, fragmentSource, fragmentHash) as WebGLShader,
      );
      Shader.linkProgram(program, vertexHash, fragmentHash);
      return program;
    }
    return cached;
  }

  static linkProgram(
    program: WebGLProgram,
    vertexHash: number,
    fragmentHash: number,
  ): null | undefined {
    const linked = Shader._getLinkedShaderCache();
    const compiled = Shader._getShaderCache();
    if (!linked[vertexHash + fragmentHash]) {
      if (!compiled[vertexHash]) return null;
      if (!compiled[fragmentHash]) return null;
      const gl = GLContext.getGLContext();
      if (gl) {
        gl.linkProgram(program);
        linked[vertexHash + fragmentHash] = program;
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw "link error: " + gl.getProgramInfoLog(program);
        }
      }
    }
    return undefined;
  }

  /** The pass-through shader of the shared context (a no-op stand-in without WebGL). */
  static getDefaultShader(): Pick<Shader, "drawRect"> {
    const gl = GLContext.getGLContext();
    if (gl) {
      gl.defaultShader = gl.defaultShader || new Shader();
      return gl.defaultShader as Shader;
    }
    return {
      drawRect: () => {},
    };
  }

  /** The union of the canvas areas inside `area` (null if under a pixel); `area` without areas. */
  static _getFinalArea(canvas: PaintCanvas | null | undefined, area: Rect): Rect | null {
    if (!canvas) return area;
    const areas = canvas.getAreas();
    let united: Rect | null = null;
    if (areas) {
      for (let i = 0; i < areas.length; i++) {
        const part = (areas[i] as Rect).intersected(area);
        if (!part.isEmpty()) united = united && !united.isEmpty() ? united.united(part) : part;
      }
      if (!united || united.getWidth() < 1 || united.getHeight() < 1) return null;
    } else united = area;
    return united;
  }

  /**
   * Runs the shader over one tile of `source` and, with a `target`, copies
   * the tile's `inner` part into it. False when the tile is empty or outside.
   */
  static _renderTile(
    source: PaintCanvas,
    target: PaintCanvas | null,
    inner: Rect | null,
    tile: Rect,
    scaledExtents: Rect,
    bounds: Rect,
    padding: number[],
    run: ShaderRun,
  ): boolean {
    const gl = GLContext.getGLContext();
    if (!gl) return false;
    let area = this._getFinalArea(
      source,
      tile.translated(-bounds.getX(), -bounds.getY()).toAlignedRect(),
    );
    if (!area) return false;
    area = tile;
    const width = area.getWidth();
    const height = area.getHeight();
    const x = area.getX();
    const y = area.getY();
    let innerX = 0;
    let innerY = 0;
    let innerWidth = 0;
    let innerHeight = 0;
    if (target) {
      const box = inner as Rect;
      innerX = box.getX();
      innerY = box.getY();
      innerWidth = box.getWidth();
      innerHeight = box.getHeight();
    }
    if (
      area.getX() >= bounds.getWidth() + bounds.getX() ||
      area.getY() >= bounds.getHeight() + bounds.getY()
    ) {
      return false;
    }
    if (
      bounds.getX() > area.getX() + area.getWidth() ||
      bounds.getY() > area.getY() + area.getHeight()
    ) {
      return false;
    }
    if (width <= 0 || height <= 0 || (target && innerWidth <= 0) || (target && innerHeight <= 0))
      return false;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const canvas = gl.canvas as HTMLCanvasElement;
    // The old code had two other sizing strategies (powers of two) behind
    // constant switches; this is the one that was on.
    if (canvas.width !== Math.ceil(width)) canvas.width = Math.ceil(width);
    if (canvas.height !== Math.ceil(height)) canvas.height = Math.ceil(height);
    const totalWidth = scaledExtents.getWidth();
    const totalHeight = scaledExtents.getHeight();
    const shader = run.shader;
    const properties = run.properties;
    const scale = run.scale;
    const host = shader.glEffect;
    const texture = GLContext.createTexture(
      source._canvasContext.canvas,
      x - bounds.getX(),
      y - bounds.getY(),
      width,
      height,
    ) as GLTexture;
    host.draw(texture);
    shader.render(properties, scale, x, y, totalWidth, totalHeight);
    host.update();
    texture.destroy();
    if (target) {
      const transform = target.getTransform(false);
      const raw = target.getTransform(true);
      target.setTransform(transform.inverted());
      target.clearRect(innerX, innerY, innerWidth, innerHeight);
      target.drawImageFragment(
        canvas,
        innerX - x,
        innerY - y + (canvas.height - height),
        innerX,
        innerY,
        innerWidth,
        innerHeight,
      );
      target.setTransform(raw);
    }
    return true;
  }

  /** Whether an image of this many pixels is processed in tiles (over 2048 x 2048). */
  static shouldEnableTiles(width: number, height: number): boolean {
    let tiles = false;
    if (!tiles && width * height > 4194304) tiles = true;
    else if (tiles && width <= 2048 && height <= 2048) tiles = false;
    return tiles;
  }

  /** The tile size for a canvas and padding [left, top, right, bottom]. */
  static _getMaxSize(canvas: PaintCanvas, padding: number[]): number {
    let size: number;
    const pad = padding.slice() as [number, number, number, number];
    const areas = canvas.getAreas();
    if (areas) {
      let largest = 0;
      for (let i = 0; i < areas.length; i++) {
        const area = areas[i] as Rect;
        largest = Math.max(
          largest,
          area.getWidth() + pad[0] + pad[2],
          area.getHeight() + pad[1] + pad[3],
        );
      }
      size = Math.max(256, Math.min(largest, 1024));
    } else size = 1024;
    if (size < 2048 && (pad[0] + pad[2] > 0.33 * size || pad[1] + pad[3] > 0.33 * size)) size *= 2;
    return size;
  }

  /** The detail level for a padding: lowered when the padding takes over a third of a tile. */
  static computeDownScale(canvas: PaintCanvas, padding: number[], detail?: number): number {
    let level = detail || defaultDetailLevel;
    const globalLevel = (globalThis as { DEFAULTDETAILLEVEL?: number }).DEFAULTDETAILLEVEL;
    if ("undefined" != typeof globalLevel) defaultDetailLevel = globalLevel;
    const pad = padding.slice() as [number, number, number, number];
    const size = this._getMaxSize(canvas, padding);
    if (pad[0] + pad[2] > 0.33 * size || pad[1] + pad[3] > 0.33 * size) {
      level *= (0.33 * size) / Math.min(pad[0] + pad[2], pad[1] + pad[3]);
    }
    return level;
  }

  /**
   * Runs `run.shader` over `target`: a paint canvas (within `extents`, in
   * tiles when large, copied back with the copy operator), or raw RGBA bytes
   * of `width` x `height` (read back in place).
   */
  static apply(
    target: PaintCanvas | ArrayBufferView,
    width: number,
    height: number,
    run: ShaderRun,
    extents?: Rect | null,
    sceneHolder?: { getScene(): unknown } | false | null,
    downScale?: number,
  ): PaintCanvas | ArrayBufferView {
    const gl = GLContext.getGLContext();
    if (!gl) return target;
    const shader = run.shader;
    const properties = run.properties;
    const scale = run.scale;
    const host = shader.glEffect;
    let copied: PaintCanvas | null = null;
    if (isPaintCanvas(target)) {
      const canvas = target as Canvas2DPaintCanvas;
      if (!extents) {
        extents = new Rect(
          (canvas.getOffset() as Point).getX(),
          (canvas.getOffset() as Point).getY(),
          canvas.getWidth(),
          canvas.getHeight(),
        );
      }
      const offset = canvas.getOffset() as Point;
      let local = new Rect(
        offset.getX() - extents.getX(),
        offset.getY() - extents.getY(),
        canvas.getWidth(),
        canvas.getHeight(),
      );
      extents = new Rect(
        Math.floor(extents.getX()),
        Math.floor(extents.getY()),
        extents.getWidth(),
        extents.getHeight(),
      );
      local = new Rect(
        Math.floor(local.getX()),
        Math.floor(local.getY()),
        local.getWidth(),
        local.getHeight(),
      );
      const tiled = this.shouldEnableTiles(width, height);
      let padding: number | number[] =
        (shader.glEffect.getAbsoluteEffectPadding && shader.glEffect.getAbsoluteEffectPadding()) ||
        0;
      if (!(padding instanceof Array)) padding = [padding, padding, padding, padding];
      const maxSize = this._getMaxSize(canvas, padding);
      const level = downScale || this.computeDownScale(canvas, padding);
      const scaledPadding = padding.map((value) => Math.ceil(Math.max(0, value * scale * level)));
      const scaledLocal = local.scaled(level, level).toAlignedRect();
      const scaledExtents = extents.scaled(level, level).toAlignedRect();
      const totalWidth = scaledExtents.getWidth();
      const totalHeight = scaledExtents.getHeight();
      let source: PaintCanvas;
      if (tiled) {
        copied = Shader._copyCanvas(canvas, extents, local, scaledExtents, scaledLocal, true);
        let tileWidth: number;
        let tileHeight: number;
        let column: number;
        const inners: Rect[] = [];
        const tiles: Rect[] = [];
        let row = 0;
        while (row < totalHeight) {
          tileHeight = maxSize - (scaledPadding[1] as number) - (scaledPadding[3] as number);
          if (row + maxSize >= totalHeight) tileHeight = totalHeight - row;
          else if (0 === row) tileHeight += scaledPadding[1] as number;
          if (tileHeight < 1) tileHeight = 1;
          column = 0;
          while (column < totalWidth) {
            tileWidth = maxSize - (scaledPadding[0] as number) - (scaledPadding[2] as number);
            if (column + maxSize >= totalWidth) tileWidth = totalWidth - column;
            else if (0 === column) tileWidth += scaledPadding[0] as number;
            if (tileWidth < 1) tileWidth = 1;
            const tile = new Rect(column, row, maxSize, maxSize);
            const inner = new Rect(
              0 === column ? 0 : column + (scaledPadding[0] as number),
              0 === row ? 0 : row + (scaledPadding[1] as number),
              tileWidth,
              tileHeight,
            );
            inners.push(inner);
            tiles.push(tile);
            column += 0 === column ? tileWidth - (scaledPadding[2] as number) : tileWidth;
          }
          row += 0 === row ? tileHeight - (scaledPadding[3] as number) : tileHeight;
        }
        source =
          1 !== level || (sceneHolder && sceneHolder.getScene())
            ? this._copyCanvas(canvas, extents, local, scaledExtents, scaledLocal, false)
            : canvas;
        run.scale *= level;
        for (let i = 0; i < inners.length; i++) {
          Shader._renderTile(
            source,
            copied,
            inners[i] as Rect,
            tiles[i] as Rect,
            scaledExtents,
            scaledLocal,
            scaledPadding,
            run,
          );
        }
        run.scale = scale;
      } else {
        run.scale *= level;
        source =
          1 !== level
            ? this._copyCanvas(canvas, extents, local, scaledExtents, scaledLocal, false)
            : canvas;
        Shader._renderTile(
          source,
          null,
          null,
          scaledLocal,
          scaledExtents,
          scaledLocal,
          scaledPadding,
          run,
        );
        run.scale = scale;
      }
      const raw = canvas.getTransform(true);
      const full = canvas.getTransform(false);
      canvas.setTransform(full.inverted());
      let destX: number;
      let destY: number;
      let destWidth: number;
      let destHeight: number;
      let sourceX: number;
      let sourceY: number;
      let sourceWidth: number;
      let sourceHeight: number;
      if (copied) {
        destX = -local.getX();
        destY = -local.getY();
        sourceX = 0;
        sourceY = 0;
        destWidth = extents.getWidth();
        destHeight = extents.getHeight();
        sourceWidth = scaledExtents.getWidth();
        sourceHeight = scaledExtents.getHeight();
      } else {
        destX = destY = 0;
        destWidth = local.getWidth();
        destHeight = local.getHeight();
        sourceWidth = scaledLocal.getWidth();
        sourceHeight = scaledLocal.getHeight();
        sourceX = 0;
        sourceY = (gl.canvas as HTMLCanvasElement).height - sourceHeight;
      }
      let opacity = 1;
      const opacityProperty = run.properties.opacity as
        { type?: string; value?: number } | undefined;
      if (
        opacityProperty &&
        "object" == typeof opacityProperty &&
        "opacity" === opacityProperty.type
      ) {
        opacity = opacityProperty.value as number;
      }
      canvas.drawImageFragment(
        copied || (gl.canvas as HTMLCanvasElement),
        sourceX,
        sourceY,
        destX,
        destY,
        sourceWidth,
        sourceHeight,
        false,
        opacity,
        "copy",
        destWidth,
        destHeight,
      );
      canvas.setTransform(raw);
    } else {
      const texture = GLContext.createTexture(target, width, height) as GLTexture;
      const fullWidth = extents ? extents.getWidth() : width;
      const fullHeight = extents ? extents.getHeight() : height;
      host.draw(texture);
      shader.render(properties, scale * (height / fullHeight), 0, 0, fullWidth, fullHeight);
      host.update();
      texture.destroy();
      host.readPixels(new Uint8Array((target as ArrayBufferView).buffer));
    }
    return target;
  }

  /** The old code used an undefined `rescale` here, so this always throws. */
  static _genAreas(areas: Rect[] | null, offset: Rect): Rect[] | null {
    if (!areas) return null;
    void offset;
    throw new ReferenceError("rescale is not defined");
  }

  static _updateAreas(
    canvas: PaintCanvas,
    from: PaintCanvas,
    extents: Rect,
    offset: Rect,
    level: number,
    keepOffset: boolean,
  ): void {
    const current = canvas.getAreas();
    const areas = Shader._genAreas(from.getAreas(), offset);
    void keepOffset;
    if (!equals(current, areas)) {
      const topLeft = extents.getSide(Rect.Side.TOP_LEFT);
      canvas.resetClip();
      canvas.prepare(areas, false);
      canvas.setOrigin(topLeft);
      canvas.setOffset(topLeft);
      canvas.setScale((from.getScale() as number) * level);
    }
  }

  /**
   * A copy of `canvas` scaled to `scaledExtents` (`whole`) or
   * `scaledLocal`, keeping its areas (scaled the same way).
   */
  static _copyCanvas(
    canvas: PaintCanvas,
    extents: Rect,
    local: Rect,
    scaledExtents: Rect,
    scaledLocal: Rect,
    whole: boolean,
  ): PaintCanvas {
    const copy = new (getPaintCanvasClass())();
    if (whole) copy.resize(scaledExtents.getWidth(), scaledExtents.getHeight());
    else copy.resize(scaledLocal.getWidth(), scaledLocal.getHeight());
    const areas = canvas.getAreas();
    const topLeft = extents.getSide(Rect.Side.TOP_LEFT);
    const scaledAreas = areas
      ? areas.map((area) => {
          let scaled: Rect = whole
            ? area
                .translated(local.getX(), local.getY())
                .scaled(
                  scaledExtents.getWidth() / extents.getWidth(),
                  scaledExtents.getHeight() / extents.getHeight(),
                )
            : area.scaled(
                scaledLocal.getWidth() / local.getWidth(),
                scaledLocal.getHeight() / local.getHeight(),
              );
          if (scaled.getX() < 0 || scaled.getY() < 0) {
            scaled = new Rect(
              Math.max(0, scaled.getX()),
              Math.max(0, scaled.getY()),
              scaled.getWidth() + Math.min(0, scaled.getX()),
              scaled.getHeight() + Math.min(0, scaled.getY()),
            );
          }
          return scaled.toAlignedRect();
        })
      : null;
    copy.prepare(scaledAreas, false);
    if (areas) {
      const sourceBounds = new Rect(0, 0, canvas.getWidth(), canvas.getHeight());
      const copyBounds = new Rect(0, 0, copy.getWidth(), copy.getHeight());
      for (let i = 0; i < areas.length; i++) {
        const from = (areas[i] as Rect).intersected(sourceBounds);
        const to = ((scaledAreas as Rect[])[i] as Rect).intersected(copyBounds);
        if (!from.isEmpty() && !to.isEmpty()) {
          copy.drawImageFragment(
            canvas,
            from.getX(),
            from.getY(),
            to.getX(),
            to.getY(),
            from.getWidth(),
            from.getHeight(),
            false,
            1,
            "source-over",
            to.getWidth(),
            to.getHeight(),
          );
        }
      }
    } else {
      // The old code used the local height here even for a whole copy.
      copy.drawImageFragment(
        canvas,
        0,
        0,
        0,
        0,
        canvas.getWidth(),
        canvas.getHeight(),
        false,
        1,
        "copy",
        copy.getWidth(),
        scaledLocal.getHeight(),
      );
    }
    copy.setOrigin(topLeft);
    copy.setOffset(topLeft);
    return copy;
  }

  vertexAttribute: number | null;
  glEffect: ShaderHost;
  texCoordAttribute: number | null;
  program: WebGLProgram | null;
  _fxaaPremultiplied: Shader | Record<string, never> | null = null;
  _fxaaUnpremultiplied: Shader | Record<string, never> | null = null;

  /**
   * Compiles and links the program of both sources (defaults: pass-through).
   * `noProgram` is for subclasses whose old constructor never ran this one.
   */
  constructor(
    glEffect?: ShaderHost,
    vertexSource?: string | null,
    fragmentSource?: string | null,
    noProgram?: boolean,
  ) {
    this.vertexAttribute = null;
    this.glEffect = glEffect as ShaderHost;
    this.texCoordAttribute = null;
    this.program = null;
    if (noProgram) return;
    vertexSource = vertexSource || DEFAULT_VERTEX_SOURCE;
    fragmentSource = "precision highp float;" + (fragmentSource || DEFAULT_FRAGMENT_SOURCE);
    this.program = Shader.getLinkedProgram(vertexSource, fragmentSource);
  }

  /** Anti-aliases the host texture with FXAA (premultiplied unless `unpremultiplied`). */
  fxaa(
    offsetX?: number,
    offsetY?: number,
    width?: number,
    height?: number,
    unpremultiplied?: boolean,
  ): void {
    let shader = unpremultiplied ? this._fxaaUnpremultiplied : this._fxaaPremultiplied;
    if (!shader) {
      try {
        shader = new Shader(
          this.glEffect,
          Shader._fxaaVertexSource,
          unpremultiplied
            ? Shader._fxaaFragmentSourceUnpremultiplied
            : Shader._fxaaFragmentSourcePremultiplied,
        );
      } catch {
        if (unpremultiplied) this._fxaaUnpremultiplied = {};
        else this._fxaaPremultiplied = {};
      }
    }
    if (shader instanceof Shader) {
      if (unpremultiplied) this._fxaaUnpremultiplied = shader;
      else this._fxaaPremultiplied = shader;
      shader.simpleShader(
        {
          texSize: [width || this.glEffect.width, height || this.glEffect.height],
          tileSize: [this.glEffect.width, this.glEffect.height],
          offset: [offsetX || 0, offsetY || 0],
        },
        this.glEffect.texture,
        this.glEffect.texture,
      );
    }
  }

  /** Draws `texture` (default the host's) through this shader into the spare texture, then swaps. */
  simpleShader(
    uniforms: Record<string, UniformValue>,
    texture?: GLTexture | null,
    swapWith?: GLTexture | null,
  ): void {
    (texture || this.glEffect.texture).use();
    this.glEffect.spareTexture.drawTo(() => {
      this.uniforms(uniforms).drawRect(void 0, void 0, void 0, void 0, [
        0,
        0,
        this.glEffect.spareTexture.width,
        this.glEffect.spareTexture.height,
      ]);
    });
    this.glEffect.spareTexture.swapWith(swapWith || this.glEffect.texture);
  }

  destroy(): void {
    if (this._fxaaUnpremultiplied && this._fxaaUnpremultiplied instanceof Shader)
      this._fxaaUnpremultiplied.destroy();
    if (this._fxaaPremultiplied && this._fxaaPremultiplied instanceof Shader)
      this._fxaaPremultiplied.destroy();
  }

  /**
   * Sets uniforms by name. Names ending in "_int_" are integers; lists of
   * columns are flattened. Throws a string for a value it can't load.
   */
  uniforms(values: Record<string, unknown>): this {
    const gl = GLContext.getGLContext();
    if (!gl) return this;
    gl.useProgram(this.program);
    for (const name in values) {
      if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
      const location = gl.getUniformLocation(this.program as WebGLProgram, name);
      if (null === location) continue;
      const value = values[name];
      const isFloat = !name.match(/_int_$/);
      if ("[object Array]" == Object.prototype.toString.call(value)) {
        const list = value as number[] | number[][];
        switch (list.length) {
          case 1:
            if (isFloat) gl.uniform1fv(location, new Float32Array(flattenColumns(list)));
            else gl.uniform1iv(location, new Int32Array(flattenColumns(list)));
            break;
          case 2:
            if (isFloat) gl.uniform2fv(location, new Float32Array(flattenColumns(list)));
            else gl.uniform2iv(location, new Int32Array(flattenColumns(list)));
            break;
          case 3:
            if (isFloat) gl.uniform3fv(location, new Float32Array(flattenColumns(list)));
            else gl.uniform3iv(location, new Int32Array(flattenColumns(list)));
            break;
          case 4:
            if (isFloat) gl.uniform4fv(location, new Float32Array(flattenColumns(list)));
            else gl.uniform4iv(location, new Int32Array(flattenColumns(list)));
            break;
          case 9:
            gl.uniformMatrix3fv(location, false, new Float32Array(flattenColumns(list)));
            break;
          case 16:
            gl.uniformMatrix4fv(location, false, new Float32Array(flattenColumns(list)));
            break;
          default:
            throw "dont't know how to load uniform \"" + name + '" of length ' + list.length;
        }
      } else if (isNumber(value)) {
        if (isFloat) gl.uniform1f(location, value);
        else gl.uniform1i(location, value);
      } else if (!RenderScheduler.isRenderPhase()) {
        // Recorded uniform locations let anything through during a render
        // phase; real ones reject it.

        throw (
          'attempted to set uniform "' + name + '" to invalid value ' + String(value || "undefined")
        );
      }
    }
    return this;
  }

  /** Binds samplers to texture units: {name: unit}. */
  textures(units: Record<string, number>): this {
    const gl = GLContext.getGLContext();
    if (!gl) return this;
    gl.useProgram(this.program);
    for (const name in units) {
      if (Object.prototype.hasOwnProperty.call(units, name)) {
        gl.uniform1i(
          gl.getUniformLocation(this.program as WebGLProgram, name),
          units[name] as number,
        );
      }
    }
    return this;
  }

  /**
   * Draws the rectangle (left, top, right, bottom in viewport pixels,
   * default the whole viewport) with texture coordinates 0..1.
   */
  drawRect(
    left: number | undefined,
    top: number | undefined,
    right: number | undefined,
    bottom: number | undefined,
    viewport: number[],
  ): void {
    const gl = GLContext.getGLContext();
    if (!gl) return;
    const [vx, vy, vw, vh] = viewport as [number, number, number, number];
    top = void 0 !== top ? (top - vy) / vh : 0;
    left = void 0 !== left ? (left - vx) / vw : 0;
    right = void 0 !== right ? (right - vx) / vw : 1;
    bottom = void 0 !== bottom ? (bottom - vy) / vh : 1;
    if (null == gl.vertexBuffer) gl.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([left, top, left, bottom, right, top, right, bottom]),
      gl.STATIC_DRAW,
    );
    if (null == gl.texCoordBuffer) {
      gl.texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    }
    const program = this.program as WebGLProgram;
    if (null == this.vertexAttribute) {
      this.vertexAttribute = gl.getAttribLocation(program, "vertex");
      gl.enableVertexAttribArray(this.vertexAttribute);
    }
    if (null == this.texCoordAttribute) {
      this.texCoordAttribute = gl.getAttribLocation(program, "_texCoord");
      gl.enableVertexAttribArray(this.texCoordAttribute);
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
    gl.vertexAttribPointer(this.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
    gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
