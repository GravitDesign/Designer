// Old: chunk.vendor.js module 249 (GBlurEffect).
import { Locale } from "../../core/locale/locale.ts";
import type { Rect } from "../../math/rect.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { GLContext } from "../../paint/webgl/gl-context.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import { glEffectClass } from "./effect-paint.ts";
import { StackBlur } from "./stack-blur.ts";

/** What the blur uses of GGLBlurEffect (engine-effects-webgl). */
export interface GLBlurEffectLike extends Effect {
  $shp: { radius: number; clip: boolean } | Record<string, unknown> | null;
  _isAffectedByGLBug: boolean;
  setAffectedByGLBug(affected: boolean): void;
  propertyTransform(name: string, value: number): number;
  propertyInverseTransform(name: string, value: number): number;
}

const GeometryProperties = {
  r: 5,
  b: false,
};

/**
 * Blurs the content by `r`. With CSS filters it uses `ctx.filter`; with
 * `b` (clip to the shape) or without filters it runs the WebGL blur when
 * there is a GL context, StackBlur otherwise.
 */
export class BlurEffect extends Effect {
  static {
    registerNodeClass(this, "blurEffect", "GBlurEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof BlurEffect &&
      b instanceof BlurEffect &&
      a.arePropertiesEqual(b, Object.keys(BlurEffect.GeometryProperties))
    );
  }

  declare $r: number;
  declare $b: boolean;
  declare _glblur: GLBlurEffectLike | null;

  constructor() {
    super();
    this._setDefaultProperties(BlurEffect.GeometryProperties);
    if (GLContext.getGLContext()) {
      this._glblur = new (glEffectClass<GLBlurEffectLike>("GGLBlurEffect"))();
    }
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GBlurEffect", "name", this.getNodeName()) as string;
  }

  /** Clipped: nothing with WebGL, -1 (shrinks the box) without; otherwise the radius. */
  override getEffectPadding(): EffectPadding {
    return this.$b ? (this._glblur ? 0 : -1) : this.$r;
  }

  override getAbsoluteEffectPadding(): number {
    return this.$r;
  }

  propertyTransform(name: string, value: number): number {
    return this._glblur ? this._glblur.propertyTransform(name, value) : value;
  }

  propertyInverseTransform(name: string, value: number): number {
    return this._glblur ? this._glblur.propertyInverseTransform(name, value) : value;
  }

  override canApplyNativeEffect(): boolean {
    return Canvas2DPaintCanvas.hasFilters() && !this.$b;
  }

  override applyNativeEffect(
    canvas: PaintCanvas,
    _target?: PaintCanvas | null,
    _root?: PaintCanvas | null,
    scale?: number,
  ): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Blur, this.$r * (scale as number));
  }

  override removeNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Blur, null);
  }

  /** Blurs `canvas` in place and returns it. */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas | null,
    root: PaintCanvas | null,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): PaintCanvas {
    if (this.$r) {
      if (this.canApplyNativeEffect()) {
        this.applyNativeEffect(canvas, target, root, scale);
        canvas.drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.Copy);
        this.removeNativeEffect(canvas);
      } else if (this._glblur) {
        this._glblur.$shp = { radius: this.$r, clip: this.$b };
        this._glblur.render(canvas, target, root, scale, extents, element);
      } else {
        canvas.getBitmap().applyFilter(StackBlur, this.$r * scale);
      }
    }
    return canvas;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, BlurEffect.GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, BlurEffect.GeometryProperties);
    }
    this._handleGeometryChangeForProperties(change, args, BlurEffect.GeometryProperties);
    super._handleChange(change, args);
  }

  setAffectedByGLBug(affected: boolean): void {
    if (this._glblur) this._glblur.setAffectedByGLBug(affected);
  }

  override toString(): string {
    return "[Object GBlurEffect]";
  }

  override destroy(): void {
    if (this._glblur) this._glblur.destroy();
  }
}

BlurEffect.prototype._glblur = null;
