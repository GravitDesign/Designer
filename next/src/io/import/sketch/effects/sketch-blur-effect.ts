// Old: chunk.vendor.js module 1123 (effects/sketchblureffect).
import { Element } from "../../../../engine/scene/element.ts";
import { Background } from "../../../../engine/style/background.ts";
import { Stylable } from "../../../../engine/style/stylable.ts";
import { GLBlurEffect } from "../../../../engine/style/webgl/effects/gl-blur-effect.ts";
import { GLZoomBlurEffect } from "../../../../engine/style/webgl/effects/gl-zoom-blur-effect.ts";
import type { SceneNodeLike } from "../scene-node.ts";
import type { SketchBlurData } from "../sketch-data.ts";
import { SketchPoint } from "../sketch-point.ts";
import { SketchEffect, type EffectNodeLike } from "./sketch-effect.ts";

const Type = {
  GaussianBlur: 0,
  MotionBlur: 1,
  ZoomBlur: 2,
  BackgroundBlur: 3,
};

export class SketchBlurEffect extends SketchEffect<SketchBlurData> {
  static Type = Type;

  override _getEffect(): EffectNodeLike | undefined {
    let effect: EffectNodeLike | undefined;
    if (this._data.isEnabled) {
      if (this._data.type === Type.ZoomBlur || this._data.type === Type.MotionBlur) {
        const center = SketchPoint.parse(this._data.center);
        effect = new GLZoomBlurEffect();
        effect.setProperty("shp", {
          centerX: 100 * center.getX(),
          centerY: 100 * center.getY(),
          strength: this._data.radius / 50,
        });
      } else {
        effect = new GLBlurEffect();
        effect.setProperty("shp", {
          radius: 3 * this._data.radius,
          clip: this._data.type === Type.BackgroundBlur,
        });
      }
    }
    return effect;
  }

  /** A background blur also gets a fill layer that shows what is behind the shape. */
  override applyTo(node: SceneNodeLike): void {
    super.applyTo(node);
    if (
      this._data.isEnabled &&
      this._data.type === Type.BackgroundBlur &&
      node.hasMixin(Stylable)
    ) {
      const layers = node.getPaintLayers();
      if (layers) {
        layers.appendChild(
          new Stylable.FillPaintLayer(new Background()) as unknown as SceneNodeLike,
        );
        // GElement is a class, not a mixin, so this is never true.
        if (node.hasMixin(Element)) node._requestInvalidation();
      }
    }
  }
}
