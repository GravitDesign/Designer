// Old: chunk.vendor.js module 1029 (GCurvedShadowEffect).
import { RGBColor } from "../../color/rgb-color.ts";
import { Locale } from "../../core/locale/locale.ts";
import { GMath } from "../../math/math.ts";
import { Point } from "../../math/point.ts";
import type { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import type { Pattern } from "../pattern.ts";
import {
  canvasUserRect,
  fillRectWithPattern,
  glEffectClass,
  restorePattern,
  storePattern,
} from "./effect-paint.ts";

/** GGLBendBlurShader.RADIUS_TO_BLUR (engine-effects-webgl). */
const RADIUS_TO_BLUR = 2;

/** The shader parameters of GGLBendBlurEffect. */
interface BendBlurParameters {
  softness: number;
  bend: number;
  radius: number;
  cov: number;
}

/** What the shadow uses of GGLBendBlurEffect (engine-effects-webgl). */
interface GLBendBlurEffectLike extends Effect {
  $shp: BendBlurParameters;
}

const GeometryProperties = {
  s: 1,
  b: 10,
  a: 270,
  l: 5,
  c: 0.8,
};

const VisualProperties = {
  pat: RGBColor.BLACK as Pattern | null,
  opc: 0.65,
};

/**
 * A shadow that bends like a lifted page corner: the content's silhouette
 * run through the WebGL bend blur with softness `s`, bend `b`, radius `l`
 * and coverage `c`, moved `l` along the angle `a` (degrees).
 */
export class CurvedShadowEffect extends Effect {
  static {
    registerNodeClass(this, "curvedShadowEffect", "GCurvedShadowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof CurvedShadowEffect &&
      b instanceof CurvedShadowEffect &&
      a.arePropertiesEqual(
        b,
        Object.keys(CurvedShadowEffect.GeometryProperties).concat(
          Object.keys(CurvedShadowEffect.VisualProperties),
        ),
      )
    );
  }

  declare $s: number;
  declare $b: number;
  declare $a: number;
  declare $l: number;
  declare $c: number;
  declare $pat: Pattern | null;
  declare $opc: number;
  declare _bend: GLBendBlurEffectLike | null;

  constructor() {
    super();
    this._setDefaultProperties(
      CurvedShadowEffect.GeometryProperties,
      CurvedShadowEffect.VisualProperties,
    );
    this._bend = new (glEffectClass<GLBendBlurEffectLike>("GGLBendBlurEffect"))();
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PreEffect;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GCurvedShadowEffect", "name", this.getNodeName()) as string;
  }

  override isOverlayEffect(): boolean {
    return true;
  }

  /**
   * Copies the properties into the bend blur's parameters. They are
   * changed in place: the object may be the bend blur class's default.
   */
  _updateGLProperties(): void {
    const parameters = (this._bend as GLBendBlurEffectLike).$shp;
    parameters.softness = this.$s;
    parameters.bend = this.$b;
    parameters.radius = this.$l;
    parameters.cov = this.$c;
  }

  override getEffectPadding(): EffectPadding {
    this._updateGLProperties();
    return (this._bend as GLBendBlurEffectLike).getEffectPadding();
  }

  override render(
    canvas: PaintCanvas,
    target: PaintCanvas,
    _root: PaintCanvas | null,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): void {
    if (this.$pat && this.$opc > 0) {
      fillRectWithPattern(target, this.$pat, canvasUserRect(target), this.$opc);
      const distance = this.$l * RADIUS_TO_BLUR;
      let shift = new Point(distance, 0);
      const angle = GMath.toRadians(this.$a);
      shift = shift.rotated(angle);
      const move = new Transform().translated(shift.getX(), shift.getY());
      target.drawCanvas(
        canvas,
        0,
        0,
        1,
        Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
        false,
      );
      this._updateGLProperties();
      const previous = target.setTransform(target.getTransform(true).preMultiplied(move));
      (this._bend as GLBendBlurEffectLike).render(target, null, null, scale, extents, element);
      target.setTransform(previous);
      target.drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationOut);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, CurvedShadowEffect.GeometryProperties);
      this.storeProperties(blob, CurvedShadowEffect.VisualProperties, storePattern);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, CurvedShadowEffect.GeometryProperties);
      this.restoreProperties(blob, CurvedShadowEffect.VisualProperties, restorePattern);
    }
    this._handleGeometryChangeForProperties(change, args, CurvedShadowEffect.GeometryProperties);
    this._handleVisualChangeForProperties(change, args, CurvedShadowEffect.VisualProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GCurvedShadowEffect]";
  }

  override destroy(): void {
    if (this._bend) this._bend.destroy();
  }
}

CurvedShadowEffect.prototype._bend = null;
