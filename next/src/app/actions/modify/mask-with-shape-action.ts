// Old: designer.browser.dev.js module 1181 (GMaskWithShapeAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { OverlayEffect } from "../../../engine/style/effects/overlay-effect.ts";
import type { Effects } from "../../../engine/style/effects.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import type { GradientStop } from "../../../engine/style/gradient.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner, type PropertiesNode } from "../host.ts";
import { ClipAction } from "./clip-action.ts";

type StyledNode = PropertiesNode & { getPaintLayers(): PaintLayers | null; getEffects(): Effects };

/**
 * The first fill layer whose pattern is a linear gradient of only black
 * and white stops. Mirrors the old labeled loops: the value left over when
 * none qualifies is null (a gradient that failed the check) or undefined
 * (no linear gradient at all); both mean none.
 */
function findBlackWhiteGradient(layers: PaintLayers): LinearGradient | null | undefined {
  let gradient: LinearGradient | null | undefined;
  for (let layer = layers.getFirstChild(); null !== layer; layer = layer.getNext()) {
    if (layer instanceof FillPaintLayer && layer.getProperty("_pt") instanceof LinearGradient) {
      gradient = layer.getProperty("_pt") as LinearGradient;
      for (let i = 0; i < gradient.getStops().length; ++i) {
        const css = (gradient.getStops()[i] as GradientStop).color.toScreenCSS();
        if ("#FFFFFF" !== css && "#000000" !== css) {
          gradient = null;
          break;
        }
      }
      if (gradient) break;
    }
  }
  return gradient;
}

/**
 * Modify > Mask with Shape (Cmd+Shift+M): clips the selection with its
 * top-most element (Clip Selection in reverse order), names the result
 * "Mask" and replaces its fills with white. A black and white linear
 * gradient fill becomes an alpha-masking overlay effect, white stops
 * transparent.
 */
export class MaskWithShapeAction extends ElementAction {
  static ID = "modify.mask-with-shape";
  static TITLE = new LocaleKey("GMaskWithShapeAction", "title");

  override getId(): string {
    return MaskWithShapeAction.ID;
  }

  override getTitle(): LocaleKey {
    return MaskWithShapeAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.SHIFT, "M"];
  }

  override getIcon(): string {
    return gDesigner().isTouchEnabled() ? "gravit-icon-mask-with-shape" : "";
  }

  override isEnabled(): boolean {
    return ClipAction.prototype.isEnabled.call(this);
  }

  override execute(): void {
    const editor = activeDocument().getEditor();
    editor.beginTransaction();
    try {
      ClipAction.prototype.execute.call(this, true, true);
      if ((editor.getSelection() as Node[]).length > 0) {
        const mask = (editor.getSelection() as Node[])[0] as StyledNode;
        mask.setProperty("name", Locale.get(new LocaleKey("GMaskWithShapeAction", "text.mask")));
        const layers = mask.getPaintLayers();
        if (layers) {
          let gradient = findBlackWhiteGradient(layers);
          const fills: FillPaintLayer[] = [];
          for (let layer = layers.getFirstChild(); null !== layer; layer = layer.getNext()) {
            if (layer instanceof FillPaintLayer) fills.push(layer);
          }
          for (let i = 0; i < fills.length; ++i) layers.removeChild(fills[i] as FillPaintLayer);
          layers.insertChild(new FillPaintLayer(RGBColor.WHITE), undefined);
          if (gradient) {
            gradient = gradient.clone() as LinearGradient;
            for (let i = 0; i < gradient.getStops().length; ++i) {
              const stop = gradient.getStops()[i] as GradientStop;
              if ("#FFFFFF" === stop.color.toScreenCSS()) stop.opacity = 0;
            }
            const overlay = new OverlayEffect();
            mask.getEffects().appendChild(overlay);
            overlay.setProperties(["alm", "opc", "pat"], [true, 1, gradient]);
          }
        }
      }
    } finally {
      editor.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override toString(): string {
    return "[Object GMaskWithShapeAction]";
  }
}
