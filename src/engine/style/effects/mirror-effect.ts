// Old: chunk.vendor.js module 840 (GMirrorEffect).
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
import { LinearGradient } from "../linear-gradient.ts";
import type { Pattern } from "../pattern.ts";
import {
  canvasUserRect,
  fillRectWithPattern,
  restorePattern,
  storePattern,
} from "./effect-paint.ts";

const GeometryProperties = {
  rfh: 0.3,
  pad: 1,
};

const VisualProperties = {
  pat: new LinearGradient(
    [
      { color: RGBColor.WHITE, position: 0, opacity: 1 },
      { color: RGBColor.WHITE, position: 1, opacity: 0 },
    ],
    1,
    GMath.toRadians(90),
    0.5,
    0,
  ) as Pattern | null,
  opc: 0.6,
};

/**
 * A reflection under the element: the content flipped, `rfh` of its
 * height tall, `pad` below it, faded by `pat` used as alpha. One per
 * element (a singleton); it reflects the content with the other effects.
 */
export class MirrorEffect extends Effect {
  static {
    registerNodeClass(this, "mirrorEffect", "GMirrorEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof MirrorEffect &&
      b instanceof MirrorEffect &&
      a.arePropertiesEqual(
        b,
        Object.keys(MirrorEffect.GeometryProperties).concat(
          Object.keys(MirrorEffect.VisualProperties),
        ),
      )
    );
  }

  declare $rfh: number;
  declare $pad: number;
  declare $pat: Pattern | null;
  declare $opc: number;
  /** The padding of the element's other effects, from the last getEffectPadding with a box. */
  declare _theirsPadding: number[] | null;
  /** The mirror's own padding, from the last getEffectPadding with a box. */
  declare _oursPadding: number[] | null;

  constructor() {
    super();
    this._setDefaultProperties(MirrorEffect.GeometryProperties, MirrorEffect.VisualProperties);
    this._theirsPadding = null;
    this._oursPadding = null;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GMirrorEffect", "name", this.getNodeName()) as string;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }

  override isSingleton(): boolean {
    return true;
  }

  override isAffectedByContents(): boolean {
    return true;
  }

  override isOverlayEffect(): boolean {
    return true;
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PostEffect;
  }

  /**
   * The room below the box for the reflection. The argument the effects
   * container passes as "scale" is the element's box; with it the padding
   * is computed and kept, without it the kept one is returned.
   */
  override getEffectPadding(box?: number | Rect): EffectPadding {
    if (box) {
      this._theirsPadding = (this.getParent() as unknown as Effects).getEffectsPadding(
        box as unknown as number,
        null,
        (effect) => effect !== this,
      );
      const height = (box as Rect).getHeight() * this.$rfh + this.$pad;
      this._oursPadding = [0, -height, 0, height];
    }
    return this._oursPadding;
  }

  /** Draws the content flipped into `target` below it, then fades it with `pat`. */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas,
    _root: PaintCanvas | null,
    scale: number,
  ): void {
    if (this.$pat && this.$opc > 0) {
      const effectCanvas = target as Canvas2DPaintCanvas;
      const targetScale = effectCanvas.getScale();
      if (1 != effectCanvas.getScale()) effectCanvas.setScale(1);
      const sourceScale = canvas.getScale();
      if (1 != canvas.getScale()) canvas.setScale(1);
      const offset = effectCanvas.getOffset() as Point;
      const padding = this.$pad * scale;
      const reflectionHeight = this._oursPadding
        ? (this._oursPadding[3] as number) * scale - padding
        : 0;
      const sourceHeight = reflectionHeight / this.$rfh;
      const otherPadding = this._theirsPadding ? (this._theirsPadding[3] as number) * scale : 0;
      const flip = new Transform()
        .translated(offset.getX(), offset.getY() + sourceHeight + padding)
        .preMultiplied(new Transform().scaled(1, -1));
      const previous = effectCanvas.setTransform(
        effectCanvas.getTransform(true).preMultiplied(flip),
      );
      const globalAlpha = effectCanvas._canvasContext.globalAlpha;
      const compositeOperator = effectCanvas._blender.globalCompositeOperation;
      const image = effectCanvas._convertImage(canvas);
      effectCanvas._canvasContext.globalAlpha = 1;
      effectCanvas._blender.globalCompositeOperation =
        Canvas2DPaintCanvas.CompositeOperator.SourceOver;
      effectCanvas._blender.drawImage(
        image,
        0,
        0,
        effectCanvas.getWidth(),
        effectCanvas.getHeight(),
        0,
        -sourceHeight - 2 * otherPadding - padding,
        effectCanvas.getWidth(),
        effectCanvas.getHeight(),
      );
      canvas.setScale(sourceScale as number);
      effectCanvas.setScale(targetScale as number);
      effectCanvas.setTransform(previous);
      effectCanvas._canvasContext.globalAlpha = globalAlpha;
      effectCanvas._blender.globalCompositeOperation = compositeOperator;
      const fadeRect = canvasUserRect(
        effectCanvas,
        new Rect(
          0,
          sourceHeight + padding,
          effectCanvas.getWidth(),
          reflectionHeight + otherPadding,
        ),
      );
      fillRectWithPattern(
        effectCanvas,
        this.$pat,
        fadeRect,
        this.$opc,
        Canvas2DPaintCanvas.CompositeOperator.DestinationIn,
      );
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, MirrorEffect.GeometryProperties);
      this.storeProperties(blob, MirrorEffect.VisualProperties, storePattern);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, MirrorEffect.GeometryProperties);
      this.restoreProperties(blob, MirrorEffect.VisualProperties, restorePattern);
    }
    this._handleVisualChangeForProperties(change, args, MirrorEffect.VisualProperties);
    this._handleGeometryChangeForProperties(change, args, MirrorEffect.GeometryProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GMirrorEffect]";
  }
}

MirrorEffect.prototype._theirsPadding = null;
MirrorEffect.prototype._oursPadding = null;
