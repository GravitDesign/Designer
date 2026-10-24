// Old: chunk.vendor.js module 1235 (what the vector exporters can't write natively).
//
// Used by the PDF exporter to decide which nodes to rasterize: custom
// (WebGL) blend modes, texture, angular and background fills, and with
// effects enabled any effect other than a drop or an inner shadow.
import type { Node } from "../../engine/scene/node.ts";
import { BlendShader } from "../../engine/paint/webgl/blend-shader.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { DropShadowEffect } from "../../engine/style/effects/drop-shadow-effect.ts";
import { InnerShadowEffect } from "../../engine/style/effects/inner-shadow-effect.ts";
import type { Effects } from "../../engine/style/effects.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";

/** The parts of a stylable node these checks read. */
interface StylableNode {
  getEffects(): Effects | null;
  getStyleLayers(): string[] | null;
  getPaintLayers(): PaintLayers | null;
}

function stylable(node: Node): StylableNode {
  return node as unknown as StylableNode;
}

/**
 * The live value of a property, as the old code read it (`e.$_sbl`): a
 * temporary value while one is set (getProperty would give the committed
 * one), the prototype default when the node doesn't own the property.
 */
function liveField(node: unknown, name: string): unknown {
  return (node as Record<string, unknown>)["$" + name];
}

export const ExportCompat = {
  isCompatible(node: Node, withEffects?: boolean): boolean {
    return (
      !ExportCompat.hasCustomBlendMode(node) &&
      !ExportCompat.hasUnsupportedPattern(node) &&
      (!withEffects || !ExportCompat.hasUnsupportedEffect(node))
    );
  },

  /** Whether the first style layer with visible effects has one other than a drop or inner shadow. */
  hasUnsupportedEffect(node: Node): boolean {
    if (node.hasMixin(Stylable) && stylable(node).getEffects()) {
      const effects = (stylable(node).getEffects() as Effects).getLayersEffects(
        stylable(node).getStyleLayers(),
        true,
      );
      for (let i = 0; i < effects.length; i++) {
        const list = effects[i];
        if (list) {
          return !list.every((effect) =>
            [DropShadowEffect, InnerShadowEffect].some((cls) => effect instanceof cls),
          );
        }
      }
    }
    return false;
  },

  hasUnsupportedPattern(node: Node): boolean {
    if (node.hasMixin(Stylable)) {
      const layers = stylable(node).getPaintLayers();
      if (layers) {
        return layers
          .getLayers(null, true)
          .some((layer) => ExportCompat.isUnsupportedPattern(liveField(layer, "_pt")));
      }
    }
    return false;
  },

  hasCustomBlendMode(node: Node): boolean {
    if (ExportCompat.isCustomBlendMode(liveField(node, "_sbl"))) return true;
    if (node.hasMixin(Stylable)) {
      const layers = stylable(node).getPaintLayers();
      if (layers) {
        return layers
          .getLayers(null, true)
          .some((layer) => ExportCompat.isCustomBlendMode(liveField(layer, "_bl")));
      }
    }
    return false;
  },

  /** A blend mode only the WebGL blender implements. */
  isCustomBlendMode(mode: unknown): boolean {
    return !!mode && -1 !== (BlendShader.BlendModes as readonly unknown[]).indexOf(mode);
  },

  isUnsupportedPattern(pattern: unknown): boolean {
    return (
      !!pattern &&
      (pattern instanceof TexturePattern ||
        pattern instanceof AngularGradient ||
        pattern instanceof Background)
    );
  },

  isAffectedByBackground(node: Node): boolean {
    return !!ExportCompat.hasCustomBlendMode(node) || !!ExportCompat.hasBackgroundFill(node);
  },

  hasBackgroundFill(node: Node): boolean {
    if (node.hasMixin(Stylable)) {
      const layers = stylable(node).getPaintLayers();
      if (layers) {
        return !!layers
          .getLayers(null, true)
          .some((layer) => liveField(layer, "_pt") instanceof Background);
      }
    }
    return false;
  },
};
