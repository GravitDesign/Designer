// Old: chunk.vendor.js module 643 (GBlender).
//
// Sits between a paint canvas and its 2D context for every fill, stroke
// and image draw. When the browser takes the composite operator, the draw
// goes straight to the context. When it doesn't (the WebGL blend modes,
// "darker"), the blender reads the backdrop of the dirty area into a WebGL
// texture, clears it, draws the shape alone, blends both in the blend shader
// and copies the result back.
import { GObject, registerClass } from "../core/object.ts";
import { Point } from "../math/point.ts";
import type { Rect } from "../math/rect.ts";
import type { Context2D } from "./context-2d.ts";
import type { Destroyable } from "./destroyable.ts";
import { Canvas2DPaintCanvas } from "./paint-canvas.ts";
import { RendererConfig } from "./renderer-config.ts";
import { BlendShader } from "./webgl/blend-shader.ts";
import { GLContext, type GLTexture } from "./webgl/gl-context.ts";
import { Shader } from "./webgl/shader.ts";
import { WebGLRenderer, type ShaderClass } from "./webgl/webgl-renderer.ts";

export class Blender extends WebGLRenderer(GObject) implements Destroyable {
  static {
    registerClass(this, "GBlender");
  }

  declare _ctx: Context2D;
  declare _paintCanvas: Canvas2DPaintCanvas;
  declare _bgTexture: GLTexture | null;
  declare _globalCompositeOperation: string | null;

  constructor(paintCanvas: Canvas2DPaintCanvas) {
    super();
    this._paintCanvas = paintCanvas;
    this._ctx = paintCanvas._canvasContext;
    this.globalCompositeOperation = this._ctx.globalCompositeOperation;
  }

  /** The operator of the next draw; "normal" means source-over. */
  get globalCompositeOperation(): string {
    return this._globalCompositeOperation as string;
  }

  set globalCompositeOperation(operator: string) {
    this._globalCompositeOperation = "normal" === operator ? "source-over" : operator;
  }

  override getShaderClass(): ShaderClass {
    return BlendShader as unknown as ShaderClass;
  }

  /**
   * Hands the operator to the context; true when the context refused it
   * (so the draw has to go through WebGL).
   */
  _isCustomOperation(): boolean {
    return (
      this.globalCompositeOperation !== this._ctx.globalCompositeOperation &&
      ((this._ctx.globalCompositeOperation = this
        .globalCompositeOperation as GlobalCompositeOperation),
      this.globalCompositeOperation !== this._ctx.globalCompositeOperation) &&
      "over" !== (this._ctx.globalCompositeOperation as string)
    );
  }

  /** The union of the canvas areas, or null without areas. */
  private _unitedAreas(): Rect | null {
    const areas = this._paintCanvas._areas;
    if (areas && areas.length) {
      const list = areas.slice();
      let united = list[0] as Rect;
      for (let i = 1; i < list.length; i++) united = united.united(list[i] as Rect);
      return united;
    }
    return null;
  }

  /** Runs `draw` through the blend shader over the dirty area. */
  private _drawBlended(draw: () => void): void {
    if (!this.prepareShader()) return;
    const area = this._unitedAreas();
    if (area) {
      this._prepareBackground(area);
      draw();
      this._renderWithBlend(area, null, true);
    } else {
      this._prepareBackground();
      draw();
      this._renderWithBlend(null, null, true);
    }
  }

  /** drawImage with 3, 5 or 9 arguments, like the context's. */
  drawImage(image: CanvasImageSource, ...args: number[]): void {
    const count = args.length + 1;
    if (count < 3) return;
    let sx: number;
    let sy: number;
    let sw: number;
    let sh: number;
    let dx: number;
    let dy: number;
    let dw: number;
    let dh: number;
    const sized = image as { width: number; height: number };
    if (3 == count) {
      dx = args[0] as number;
      dy = args[1] as number;
      sx = 0;
      sy = 0;
      dw = sw = sized.width;
      dh = sh = sized.height;
    } else if (5 == count) {
      dx = args[0] as number;
      dy = args[1] as number;
      dw = args[2] as number;
      dh = args[3] as number;
      sx = 0;
      sy = 0;
      sw = sized.width;
      sh = sized.height;
    } else {
      if (9 != count) return;
      sx = args[0] as number;
      sy = args[1] as number;
      sw = args[2] as number;
      sh = args[3] as number;
      dx = args[4] as number;
      dy = args[5] as number;
      dw = args[6] as number;
      dh = args[7] as number;
    }
    if (this._isCustomOperation()) {
      this._drawBlended(() => this._drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh));
    } else this._drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  /** Uses the short drawImage forms where they apply; draw errors are swallowed. */
  _drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) return;
    const sized = image as { width: number; height: number };
    try {
      if (sw === sized.width && sh === sized.height && 0 === sx && 0 === sy) {
        if (dw === sized.width && dh === sized.height) {
          this._ctx.drawImage(image, dx, dy);
          return;
        }
        this._ctx.drawImage(image, dx, dy, dw, dh);
        return;
      }
      this._ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    } catch {
      // The old code ignored failed draws (zero-sized or broken images).
    }
  }

  stroke(): void {
    if (this._isCustomOperation()) this._drawBlended(() => this._ctx.stroke());
    else this._ctx.stroke();
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    if (this._isCustomOperation())
      this._drawBlended(() => this._ctx.strokeRect(x, y, width, height));
    else this._ctx.strokeRect(x, y, width, height);
  }

  fill(fillRule?: CanvasFillRule): void {
    if (this._isCustomOperation()) this._drawBlended(() => this._ctx.fill(fillRule));
    else this._ctx.fill(fillRule);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    if (this._isCustomOperation()) this._drawBlended(() => this._ctx.fillRect(x, y, width, height));
    else this._ctx.fillRect(x, y, width, height);
  }

  /** Merges overlapping areas in place (not used by the old code itself). */
  _makeNonIntersectingAreas(areas: Rect[]): void {
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i] as Rect;
      for (let j = i + 1; j < areas.length; j++) {
        if (area.intersectsRect(areas[j] as Rect)) {
          areas[i] = area.united(areas[j] as Rect);
          areas.splice(j, 1);
          i = 0;
          break;
        }
      }
    }
  }

  /**
   * Uploads the backdrop of `area` (default the whole canvas) into the
   * working texture and clears it on the canvas. With `target` the backdrop
   * goes into a texture of that size at the area's offset in it.
   */
  _prepareBackground(area?: Rect | null, target?: Rect | null): void {
    let x: number;
    let y: number;
    let width: number;
    let height: number;
    if (area) {
      x = area.getX();
      y = area.getY();
      width = area.getWidth();
      height = area.getHeight();
    } else {
      x = 0;
      y = 0;
      width = this._paintCanvas.getWidth();
      height = this._paintCanvas.getHeight();
    }
    let textureWidth: number;
    let textureHeight: number;
    let targetX: number;
    let targetY: number;
    if (target) {
      textureWidth = target.getWidth();
      textureHeight = target.getHeight();
      targetX = target.getX();
      targetY = target.getY();
    } else {
      textureWidth = width;
      textureHeight = height;
      targetX = x;
      targetY = y;
    }
    const transform = this._paintCanvas.getTransform(true);
    const origin = this._paintCanvas.getOrigin() as Point;
    const scale = this._paintCanvas.getScale() as number;
    this._paintCanvas.setTransform(null);
    this._paintCanvas.setOrigin(new Point(0, 0));
    this._paintCanvas.setScale(1);
    const gl = GLContext.getGLContext() as WebGLRenderingContext;
    const glCanvas = gl.canvas as HTMLCanvasElement;
    if (!(glCanvas.width === textureWidth && glCanvas.height === textureHeight)) {
      glCanvas.width = textureWidth;
      glCanvas.height = textureHeight;
    }
    const backdrop = GLContext.createTexture(this._ctx.canvas, x, y, width, height) as GLTexture;
    if (target) {
      if (!(
        this.isInitialized() &&
        textureWidth === this.texture.width &&
        textureHeight === this.texture.height
      )) {
        this._initialize(textureWidth, textureHeight);
      }
    }
    backdrop.use();
    if (target) {
      this.texture.drawTo(() => {
        Shader.getDefaultShader().drawRect(
          x - targetX,
          y - targetY,
          x - targetX + width,
          y - targetY + height,
          [0, 0, textureWidth, textureHeight],
        );
      });
    } else this.draw(backdrop);
    backdrop.destroy();
    this._paintCanvas.clearRect(x, y, width, height);
    this._paintCanvas.setTransform(transform);
    this._paintCanvas.setOrigin(origin);
    this._paintCanvas.setScale(scale);
  }

  /**
   * Blends what was drawn alone (the canvas content of `area`) over the
   * backdrop and, with `copyBack`, copies the result into the canvas.
   */
  _renderWithBlend(area: Rect | null, target: Rect | null, copyBack: boolean): void {
    const canvas = this._paintCanvas;
    const transform = canvas.getTransform(true);
    const origin = canvas.getOrigin() as Point;
    const scale = canvas.getScale() as number;
    canvas.setTransform(null);
    canvas.setOrigin(new Point(0, 0));
    canvas.setScale(1);
    let dimensions: { x: number; y: number; width: number; height: number } | undefined;
    const gl = GLContext.getGLContext() as WebGLRenderingContext;
    if (target) {
      const from = area as Rect;
      dimensions = {
        x: target.getX() - from.getX(),
        y: target.getY() - from.getY(),
        width: target.getWidth(),
        height: target.getHeight(),
      };
    }
    (this.shaderInstance as unknown as BlendShader).render(
      {
        source: canvas._canvasContext.canvas,
        blendMode: this.globalCompositeOperation,
        opacity: 1,
        area: target || area,
        dimensions,
      },
      1,
    );
    if (copyBack) {
      this.update();
      const context = canvas._canvasContext;
      const operator = context.globalCompositeOperation;
      const alpha = context.globalAlpha;
      context.globalCompositeOperation = Canvas2DPaintCanvas.CompositeOperator.Copy;
      context.globalAlpha = 1;
      context.drawImage(
        gl.canvas as HTMLCanvasElement,
        area ? area.getX() : 0,
        area ? area.getY() : 0,
      );
      context.globalCompositeOperation = operator;
      context.globalAlpha = alpha;
      canvas.setTransform(transform);
      canvas.setOrigin(origin);
      canvas.setScale(scale);
      if (RendererConfig.DELETE_BLEND_AND_GRADIENT_TEXTURES_AFTER_DRAW) this.destroy();
    }
  }

  destroy(): void {
    this._destroy();
  }

  override toString(): string {
    return "[Object GBlender]";
  }
}

Blender.prototype._bgTexture = null;
