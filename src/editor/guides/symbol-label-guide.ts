// Old: chunk.vendor.js module 1077 (GSymbolLabelGuide).
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { Page } from "../../engine/scene/page.ts";
import type { Symbol as SceneSymbol } from "../../engine/scene/symbol.ts";
import { guidePaintContext } from "./guide.ts";
import { LabelGuide, LabelItem } from "./label-guide.ts";

/**
 * Names of the master symbols above their frames (`guide.symbollabel`)
 * when the view shows symbol labels.
 */
export class SymbolLabelGuide extends LabelGuide {
  static {
    registerClass(this, "GSymbolLabelGuide");
  }

  static ID = "guide.symbollabel";

  override getId(): string {
    return SymbolLabelGuide.ID;
  }

  override _gatherLabels(transform: Transform, paintContext: PaintContext): LabelItem[] | null {
    const context = guidePaintContext(paintContext);
    let labels: LabelItem[] | null = null;
    if (context.configuration.symbolLabelsVisible) {
      const dirty = context.dirtyMatcher.getDirtyRectangles() as Rect[];
      labels = [];
      const symbols = this._scene
        .getSymbols()
        .filter((symbol: SceneSymbol) => symbol.isMaster() && symbol.getScene());
      const pages = symbols.map(
        (symbol: SceneSymbol) =>
          symbol.findParent((parent) => {
            if (parent instanceof Page) return true;
            return undefined;
          }) as Page | null,
      );
      for (let u = 0; u < dirty.length; ++u) {
        const area = dirty[u] as Rect;
        for (let g = symbols.length - 1; g >= 0; g--) {
          const page = pages[g] as Page;
          if (context.configuration.multiPageView || page.hasFlag(NodeFlag.Active)) {
            const symbol = symbols[g] as SceneSymbol;
            let frame = symbol.getFrame();
            if (frame) {
              const scale = symbol.isScaleLabel() ? transform.getScaleFactor() : 1;
              const labelHeight = this._scene.getLabelBBox(scale).getHeight();
              const position = page.getPosition(context.configuration.multiPageView);
              frame = frame.translated(position.getX(), position.getY());
              const labelBox = new Rect(
                frame.getX(),
                frame.getY() - labelHeight,
                frame.getWidth(),
                labelHeight,
              );
              if (area.containsRect(labelBox) || labelBox.intersectsRect(area)) {
                const viewBox = transform.mapRect(frame);
                const name =
                  symbol.$name || (Locale.get(new LocaleKey("GSymbol", "name")) as string);
                labels.push(
                  new LabelItem(
                    new Point(viewBox.getX(), viewBox.getY()),
                    viewBox.getWidth(),
                    (symbol.isMaster() ? "○ " : "● ") + name,
                    context.selectionThirdOutlineColor,
                    symbol.isScaleLabel(),
                  ),
                );
                symbols.splice(g, 1);
                pages.splice(g, 1);
              }
            }
          }
        }
      }
    }
    return labels;
  }

  override toString(): string {
    return "[Object GSymbolLabelGuide]";
  }
}
