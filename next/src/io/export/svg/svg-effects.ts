// Old: chunk.vendor.js module 1459 (the effects of an element as an SVG filter).
import { Color } from "../../../engine/color/color.ts";
import { uuid } from "../../../engine/core/util.ts";
import type { PropertiesNode as Node } from "../../../engine/scene/node-properties.ts";
import { BlurEffect } from "../../../engine/style/effects/blur-effect.ts";
import { DropShadowEffect } from "../../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../../engine/style/effects/inner-shadow-effect.ts";
import { OverlayEffect } from "../../../engine/style/effects/overlay-effect.ts";
import type { Effects } from "../../../engine/style/effects.ts";
import { GLBlurEffect } from "../../../engine/style/webgl/effects/gl-blur-effect.ts";
import { WebGLEffect } from "../../../engine/style/webgl/webgl-effect.ts";
import type { SvgElement } from "./svg-dom.ts";
import { FilterBuilder } from "./filter-builder.ts";
import { BlurFilter } from "./filters/blur.ts";
import { DropShadowFilter } from "./filters/drop-shadow.ts";
import { InnerShadowFilter } from "./filters/inner-shadow.ts";
import { OverlayFilter } from "./filters/overlay.ts";

/** Where getEffectMarkup reports the filter url ("url(#<id>)") of the element. */
export interface EffectMarkupResult {
  filter?: string;
}

/** An element with effects (GStylable). */
export interface EffectsHost extends Node {
  getEffects(): Effects | null;
}

export const SvgEffects = {
  /**
   * Writes the element's visible blur, shadow and color overlay effects
   * (a WebGL blur counts as a blur) and its fill opacity as one `<filter>`
   * into `defs`, and sets `result.filter` to its url. Nothing is written
   * when there is neither a filter nor a fill opacity below 1.
   */
  getEffectMarkup(
    element: EffectsHost,
    result: EffectMarkupResult,
    defs: SvgElement,
  ): string | undefined {
    const builder = new FilterBuilder();
    for (let effect of (element.getEffects() as Effects).getChildren() as Node[]) {
      if (0 == effect.getProperty("vs")) continue;
      if (effect instanceof WebGLEffect && effect instanceof GLBlurEffect) {
        const blur = new BlurEffect();
        blur.setProperty("r", (effect.getProperty("shp") as { radius: number }).radius);
        blur.setProperty("vs", effect.getProperty("vs"));
        blur.setProperty("ly", effect.getProperty("ly"));
        effect = blur;
      }
      if (effect instanceof BlurEffect) BlurFilter.apply(builder, effect, element);
      else if (effect instanceof DropShadowEffect) DropShadowFilter.apply(builder, effect, element);
      else if (effect instanceof InnerShadowEffect)
        InnerShadowFilter.apply(builder, effect, element);
      else if (effect instanceof OverlayEffect && effect.getProperty("pat") instanceof Color) {
        OverlayFilter.apply(builder, effect, element);
      } else console.warn("Unhandled filter: " + effect);
    }
    const fillOpacity = element.getProperty("_sfop") as number;
    if (1 != fillOpacity) builder.setFillOpacity(fillOpacity);
    if (0 === builder.filters.length && 1 == fillOpacity) return "";
    const id = uuid();
    result.filter = "url(#" + id + ")";
    builder.setId(id);
    builder.toXml(defs);
    return undefined;
  },
};
