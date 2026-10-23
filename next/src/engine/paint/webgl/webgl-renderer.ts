// Old: chunk.vendor.js module 473 (GWebGLRenderer).
//
// Mixed into everything that renders through a WebGL shader (the blender,
// the WebGL effects): a working texture and a spare one to render into,
// the shader instance, and drawShader, which runs the shader over a paint
// canvas.
import { RGBColor } from "../../color/rgb-color.ts";
import { defineMixin, type AnyConstructor } from "../../core/object.ts";
import { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import { getGLBlurEffectClass } from "../late-bound.ts";
import { getPaintCanvasClass } from "../paint-canvas-class.ts";
import type { PaintCanvas } from "../paint-canvas.ts";
import { GLContext, readPixels as readGLPixels, type GLTexture } from "./gl-context.ts";
import { Shader, type RenderingShader, type ShaderHost, type ShaderRun } from "./shader.ts";

const RENDERMETHOD = {
  /** Render on the GPU and copy the result back as an image. */
  DIRECT: 0,
  /** Render on the GPU and read the pixels back (for browsers with WebGL bugs). */
  BYTES: 1,
} as const;

/** The flip shader update() uses to copy the texture to the GL canvas upright. */
const FLIP_FRAGMENT_SOURCE =
  "        uniform highp sampler2D texture;        varying highp vec2 texCoord;        void main() {            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));        }    ";

/** Undefined until probed: whether this browser needs the BYTES render method. */
let hasGLBug: boolean | undefined = void 0;

/** The shader class a renderer creates; it gets the renderer as its host. */
export type ShaderClass = new (host: never) => Shader;

/** What the renderer keeps per GL context when a second one shows up. */
interface ShaderBackup {
  shaderInstance: unknown;
  texture: GLTexture | null;
  spareTexture: GLTexture | null;
  extraTexture: GLTexture | null;
  flippedShader: Shader | null;
  currentGL: WebGLRenderingContext | null;
  width: number;
  height: number;
  [key: string]: unknown;
}

function webGLRendererBody<TBase extends AnyConstructor>(Base: TBase) {
  abstract class WebGLRendererMembers extends Base implements ShaderHost {
    static RENDERMETHOD = RENDERMETHOD;

    declare renderMethod: number;
    declare currentGL: WebGLRenderingContext | null;
    declare texture: GLTexture;
    declare spareTexture: GLTexture;
    declare extraTexture: GLTexture | null | undefined;
    declare flippedShader: Shader | null;
    declare shaderInstance: (Shader & Partial<RenderingShader>) | null;
    declare backupShaderData: ShaderBackup | null;
    declare width: number;
    declare height: number;
    declare _isAffectedByGLBug: boolean;

    /** Copies `texture` into the working texture (reallocated when the size changes). */
    draw(texture: GLTexture, width?: number, height?: number): this {
      if (!this.isInitialized() || texture.width != this.width || texture.height != this.height) {
        this._initialize(width || texture.width, height || texture.height);
      }
      texture.use();
      const w = this.width;
      const h = this.height;
      this.texture.drawTo(() => {
        Shader.getDefaultShader().drawRect(void 0, void 0, void 0, void 0, [0, 0, w, h]);
      });
      return this;
    }

    _destroy(): void {
      if (this.shaderInstance) this.shaderInstance.destroy();
      if (this.texture) this.texture.destroy();
      if (this.spareTexture) this.spareTexture.destroy();
      if (this.extraTexture) this.extraTexture.destroy();
      if (this.flippedShader) this.flippedShader.destroy();
      this.shaderInstance = null;
      this.texture = null as unknown as GLTexture;
      this.spareTexture = null as unknown as GLTexture;
      this.extraTexture = null;
      this.flippedShader = null;
    }

    isInitialized(): boolean {
      return !!this.texture && this.texture.isInitialized();
    }

    _initialize(width: number, height: number): void {
      if (this.texture) this.texture.destroy();
      if (this.spareTexture) this.spareTexture.destroy();
      const gl = GLContext.getGLContext() as WebGLRenderingContext;
      this.width = width;
      this.height = height;
      this.texture = GLContext.createTexture(width, height, gl.RGBA) as GLTexture;
      this.spareTexture = GLContext.createTexture(width, height, gl.RGBA) as GLTexture;
      if (!(this.extraTexture && this.extraTexture.isInitialized())) {
        this.extraTexture = GLContext.createTexture(0, 0, gl.RGBA) as GLTexture;
      }
      this.flippedShader = this.flippedShader || new Shader(this, null, FLIP_FRAGMENT_SOURCE);
    }

    getShaderClass(): ShaderClass {
      throw new Error("Not implemented");
    }

    isAffectedByGLBug(): boolean {
      return this._isAffectedByGLBug;
    }

    /** Draws the working texture upright into the GL canvas. */
    update(): this {
      this.texture.use();
      (this.flippedShader as Shader).drawRect(void 0, void 0, void 0, void 0, [
        0,
        0,
        this.width,
        this.height,
      ]);
      return this;
    }

    readPixels(
      target: ArrayBufferView,
      type?: number,
      x?: number,
      y?: number,
      width?: number,
      height?: number,
    ): ArrayBufferView {
      const w = width || this.texture.width;
      const h = height || this.texture.height;
      const gl = GLContext.getGLContext() as WebGLRenderingContext;
      this.texture.drawTo(() => {
        readGLPixels(gl, x || 0, y || 0, w, h, gl.RGBA, type || gl.UNSIGNED_BYTE, target);
      });
      return target;
    }

    /**
     * Makes sure a shader of getShaderClass() exists for the current GL
     * context; false without WebGL. When the context changed, the old state
     * is kept aside (and swapped back for its context).
     */
    prepareShader(): boolean {
      const gl = GLContext.getGLContext();
      if (!gl) return false;
      const ShaderType = this.getShaderClass();
      if (this.shaderInstance && this.shaderInstance instanceof ShaderType) {
        if (!this.currentGL) this.currentGL = gl;
      } else {
        if (this.shaderInstance) (this.shaderInstance as Shader).destroy();
        this.shaderInstance = new ShaderType(this as never);
        this.currentGL = gl;
      }
      if (this.currentGL !== gl) {
        const self = this as unknown as Record<string, unknown>;
        if (this.backupShaderData) {
          if (this.backupShaderData.currentGL === gl) {
            for (const key in this.backupShaderData) {
              const value = self[key];
              self[key] = this.backupShaderData[key];
              this.backupShaderData[key] = value;
            }
          } else {
            console.warn("third webgl type created");
            for (const key in this.backupShaderData) {
              const saved = this.backupShaderData[key] as { destroy?: unknown } | null;
              if (saved && "function" == typeof saved.destroy)
                (saved.destroy as () => void).call(saved);
              this.backupShaderData[key] = self[key];
            }
            this.shaderInstance = null;
            this.texture = null as unknown as GLTexture;
            this.spareTexture = null as unknown as GLTexture;
            this.extraTexture = null;
            this.flippedShader = null;
            this.shaderInstance = new ShaderType(this as never);
          }
        } else {
          this.backupShaderData = {
            shaderInstance: this.shaderInstance,
            texture: this.texture,
            spareTexture: this.spareTexture,
            extraTexture: this.extraTexture ?? null,
            flippedShader: this.flippedShader,
            currentGL: this.currentGL,
            width: this.width,
            height: this.height,
          };
          this.texture = null as unknown as GLTexture;
          this.spareTexture = null as unknown as GLTexture;
          this.extraTexture = null;
          this.flippedShader = null;
          this.shaderInstance = new ShaderType(this as never);
        }
        this.currentGL = gl;
      }
      return true;
    }

    /**
     * Runs the shader with `properties` at `scale` over `canvas` (or over a
     * new width x height canvas), on the GPU or, for browsers with WebGL
     * bugs, through the pixel bytes.
     */
    drawShader(
      canvas: PaintCanvas | null,
      properties: Record<string, unknown>,
      scale: number,
      width?: number,
      height?: number,
      extents?: Rect | null,
      sceneHolder?: { getScene(): unknown } | false | null,
      downScale?: number,
    ): unknown {
      const run: ShaderRun = {
        properties,
        scale,
        shader: this.shaderInstance as unknown as RenderingShader,
      };
      if (!canvas) {
        if ((width as number) <= 0 || (height as number) <= 0) return null;
        canvas = new (getPaintCanvasClass())();
        canvas.resize(Math.round(width as number), Math.round(height as number));
        canvas.prepare();
        canvas.setOrigin(new Point(0, 0));
        canvas.setOffset(new Point(0, 0));
      }
      if (this.isAffectedByGLBug()) {
        if (void 0 === hasGLBug) probeGLBug(sceneHolder, downScale);
        if (hasGLBug) this.renderMethod = RENDERMETHOD.BYTES;
      }
      return this.renderMethod === RENDERMETHOD.BYTES
        ? canvas
            .getBitmap()
            .modifyPixels(
              Shader.apply as unknown as (
                data: Uint8ClampedArray,
                width: number,
                height: number,
                argument: unknown,
              ) => unknown,
              run,
              null,
              false,
            )
        : Shader.apply(
            canvas,
            width || canvas.getWidth(),
            height || canvas.getHeight(),
            run,
            extents,
            sceneHolder,
            downScale,
          );
    }

    override toString(): string {
      return "[Object GWebGLRenderer]";
    }
  }
  Object.assign(WebGLRendererMembers.prototype, {
    renderMethod: RENDERMETHOD.DIRECT,
    currentGL: null,
    texture: null,
    spareTexture: null,
    flippedShader: null,
    shaderInstance: null,
    backupShaderData: null,
    width: 0,
    height: 0,
    _isAffectedByGLBug: false,
  });
  return WebGLRendererMembers;
}

/** Tests once whether WebGL output comes back wrong (Firefox on Linux, broken transparency). */
function probeGLBug(sceneHolder: unknown, downScale: unknown): void {
  if (
    "undefined" != typeof navigator &&
    navigator &&
    0 == navigator.userAgent.indexOf("Mozilla") &&
    0 == navigator.platform.indexOf("Linux") &&
    navigator.userAgent.indexOf("Chrome") < 0 &&
    navigator.userAgent.indexOf("Safari") < 0
  ) {
    hasGLBug = true;
    console.warn(
      "Firefox on Linux has problems using fast webgl render method. Slower method will be used",
    );
  }
  if (!hasGLBug) {
    const frame = new (getPaintCanvasClass())(false, true);
    frame.resize(16, 16);
    frame.prepare();
    frame.setOffset(new Point(0, 0));
    frame.setOrigin(new Point(0, 0));
    frame.strokeRect(0, 0, 16, 16, 4, RGBColor.RED);
    const blurred = new (getPaintCanvasClass())(false, true);
    blurred.resize(16, 16);
    blurred.prepare();
    blurred.setOffset(new Point(0, 0));
    blurred.setOrigin(new Point(0, 0));
    const GLBlurEffect = getGLBlurEffectClass();
    const blur = new GLBlurEffect();
    if (!blur.prepareShader()) {
      hasGLBug = false;
      return;
    }
    const run: ShaderRun = {
      properties: { radius: 1 },
      scale: 1,
      shader: blur.shaderInstance as RenderingShader,
    };
    // The old call passed false as the scene holder and moved the caller's
    // scene holder into the detail level.
    Shader.apply(blurred, 16, 16, run, null, false, sceneHolder as number | undefined);
    void downScale;
    frame.drawCanvas(blurred);
    const pixel = frame.getBitmap().getPixelValue(0, 0);
    if (255 === pixel[1] || 255 === pixel[2]) {
      hasGLBug = true;
      console.warn(
        "This browser has a WebGL drawing bug. Some effects will be rendered with slower method.",
      );
    } else hasGLBug = false;
  }
  if (!hasGLBug && "undefined" != typeof document) {
    const backdrop = new (getPaintCanvasClass())(false, true);
    backdrop.resize(128, 128);
    backdrop.prepare();
    backdrop.setOffset(new Point(0, 0));
    backdrop.setOrigin(new Point(0, 0));
    backdrop.fillRect(0, 0, 128, 128, RGBColor.BLACK);
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl", {
      premultipliedAlpha: false,
      alpha: true,
    }) as WebGLRenderingContext;
    glCanvas.width = 16;
    glCanvas.height = 16;
    gl.clearColor(1, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    backdrop.drawImage(glCanvas, 0, 0);
    let pixel = backdrop.getBitmap().getPixelValue(0, 0);
    if (0 !== pixel[0] || 255 !== pixel[3]) {
      hasGLBug = true;
      console.warn(
        "This browser has a WebGL bug with transparency. Most effects will be rendered with slower method.",
      );
    } else hasGLBug = false;
    if (false === hasGLBug) {
      gl.clearColor(1, 0, 0, 0.1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      backdrop.drawImage(glCanvas, 0, 0);
      pixel = backdrop.getBitmap().getPixelValue(0, 0);
      if (255 === pixel[0] && 255 === pixel[3]) {
        hasGLBug = true;
        console.warn(
          "This browser has a WebGL bug with transparency. Most effects will be rendered with slower method.",
        );
      } else hasGLBug = false;
    }
  }
}

/**
 * The WebGL renderer mixin: `class Blender extends WebGLRenderer(GObject)`.
 * Effects of engine-effects-webgl mix it in the same way.
 */
export const WebGLRenderer = defineMixin("GWebGLRenderer", webGLRendererBody);

/** The instance side of the mixin, for typing hosts. */
export type WebGLRendererInstance = InstanceType<ReturnType<typeof webGLRendererBody>>;
