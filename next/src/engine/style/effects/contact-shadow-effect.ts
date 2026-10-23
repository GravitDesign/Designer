// Old: chunk.vendor.js module 1028 (GContactShadowEffect, whose toString says GContactShadow).
import { Color } from "../../color/color.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import { Locale } from "../../core/locale/locale.ts";
import { GMath } from "../../math/math.ts";
import type { Point } from "../../math/point.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import type { Effects } from "../effects.ts";
import type { Pattern } from "../pattern.ts";
import { RadialGradient } from "../radial-gradient.ts";
import { BlurEffect } from "./blur-effect.ts";
import {
  canvasUserRect,
  fillRectWithPattern,
  restorePattern,
  storePattern,
} from "./effect-paint.ts";

const GeometryProperties = {
  r: 5,
  a: 5,
  o: 5,
};

const VisualProperties = {
  pat: RGBColor.BLACK as Pattern | null,
  opc: 0.75,
};

/**
 * A shadow on the ground under the element: the content squashed by the
 * viewing angle `a` (degrees above the ground), `o` below it, faded with a
 * radial gradient of the color and blurred by `r`.
 */
export class ContactShadowEffect extends Effect {
  static {
    registerNodeClass(this, "contactShadowEffect", "GContactShadowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;

  static RANGES = {
    r: [5, 200],
  };

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof ContactShadowEffect &&
      b instanceof ContactShadowEffect &&
      a.arePropertiesEqual(
        b,
        Object.keys(ContactShadowEffect.GeometryProperties).concat(
          Object.keys(ContactShadowEffect.VisualProperties),
        ),
      )
    );
  }

  declare $r: number;
  declare $a: number;
  declare $o: number;
  declare $pat: Pattern | null;
  declare $opc: number;
  /** The element box (grown by the other effects) from the last getEffectPadding with a box. */
  declare _savedBBox: Rect | null;
  /** The bottom padding of the other effects. */
  declare _padding: number | null;
  declare _blur: BlurEffect | null;

  constructor() {
    super();
    this._setDefaultProperties(
      ContactShadowEffect.GeometryProperties,
      ContactShadowEffect.VisualProperties,
    );
    this._blur = new BlurEffect();
  }

  override isOverlayEffect(): boolean {
    return true;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GContactShadowEffect", "name", this.getNodeName()) as string;
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PostEffect;
  }

  /**
   * The radius around the squashed shadow below the box. The argument the
   * effects container passes as "scale" is the element's box. Quirk: the
   * kept box grows by the other effects' padding on every call.
   */
  override getEffectPadding(box?: number | Rect): EffectPadding {
    const others = (this.getParent() as unknown as Effects).getEffectsPadding(
      box as number | undefined,
      null,
      (effect) => effect !== this,
    );
    if (box) this._savedBBox = box as Rect;
    if (others) {
      if (this._savedBBox) {
        this._savedBBox = this._savedBBox.expanded(others[0], others[1], others[2], others[3]);
      }
      this._padding = others[3];
    }
    const height = this._savedBBox
      ? this._getIsometricTransform().mapRect(this._savedBBox).getHeight()
      : 0;
    return [this.$r, this.$r - height - this.$o, this.$r, this.$r + height + this.$o];
  }

  /** Draws the squashed content into `target`, colors it with the fading gradient and blurs it. */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas,
    root: PaintCanvas,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): void {
    if (this.$pat && this.$opc > 0) {
      if (!this._savedBBox) return;
      const targetScale = target.getScale();
      if (1 != target.getScale()) target.setScale(1);
      const offset = target.getOffset() as Point;
      const box = root.getTransform(false).mapRect(this._savedBBox);
      const padding = (this._padding || 0) * scale;
      const shadowHeight =
        this._getIsometricTransform().mapRect(this._savedBBox).getHeight() * scale;
      const radius = this.$r * scale;
      const distance = this.$o * scale;
      const x = offset.getX();
      const y = offset.getY() + box.getHeight() + distance - padding;
      const squash = new Transform().translated(x, y).preMultiplied(this._getIsometricTransform());
      const previous = target.setTransform(target.getTransform(true).preMultiplied(squash));
      // No smoothing (the old code passed 1).
      target.drawImage(canvas, 0, 0, true, this.$opc);
      target.setScale(targetScale as number);
      target.setTransform(previous);
      // The gradient starts from the color, or a gradient's first stop color.
      let color: unknown = this.$pat;
      if (!(color instanceof Color)) {
        if (color instanceof RadialGradient) {
          const stops = color.getStops();
          color =
            stops && stops[0] && stops[0].color && stops[0].color instanceof Color
              ? stops[0].color
              : RGBColor.BLACK;
        } else {
          color = RGBColor.BLACK;
        }
      }
      const fade = new RadialGradient([
        { color: color as Color, position: 0, opacity: 1 },
        { color: RGBColor.WHITE, position: 1, opacity: 0 },
      ]);
      const fadeRect = canvasUserRect(
        target,
        new Rect(0, y - offset.getY(), target.getWidth(), shadowHeight),
      );
      fillRectWithPattern(
        target,
        fade,
        fadeRect,
        1,
        Canvas2DPaintCanvas.CompositeOperator.SourceIn,
      );
      if (radius > 0) {
        const blur = this._blur as BlurEffect;
        blur.$r = this.$r;
        blur.render(target, null, null, scale, extents, element);
      }
    }
  }

  /** Squashes y by the viewing angle (an x rotation of 90 - a degrees, seen from above). */
  _getIsometricTransform(): Transform {
    const angle = GMath.toRadians(90 - this.$a);
    return new Transform(
      Math.cos(0),
      Math.cos(angle) * Math.sin(0),
      -Math.sin(0),
      Math.cos(angle) * Math.cos(0),
      0,
      0,
    );
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, ContactShadowEffect.GeometryProperties);
      this.storeProperties(blob, ContactShadowEffect.VisualProperties, storePattern);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, ContactShadowEffect.GeometryProperties);
      this.restoreProperties(blob, ContactShadowEffect.VisualProperties, restorePattern);
    }
    this._handleVisualChangeForProperties(change, args, ContactShadowEffect.VisualProperties);
    this._handleGeometryChangeForProperties(change, args, ContactShadowEffect.GeometryProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GContactShadow]";
  }

  override destroy(): void {
    if (this._blur) this._blur.destroy();
    this._savedBBox = null;
    this._padding = null;
  }
}

ContactShadowEffect.prototype._savedBBox = null;
ContactShadowEffect.prototype._padding = null;
ContactShadowEffect.prototype._blur = null;
