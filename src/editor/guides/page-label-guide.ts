// Old: chunk.vendor.js module 743 (GPageLabelGuide).
import type { Color } from "../../engine/color/color.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { registerClass } from "../../engine/core/object.ts";
import { QuadTree } from "../../engine/geometry/quadtree.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Element } from "../../engine/scene/element.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Page } from "../../engine/scene/page.ts";
import { guidePaintContext, type GuidePaintContext } from "./guide.ts";
import { LabelGuide, LabelItem } from "./label-guide.ts";

/**
 * Page names above the pages (`guide.pagelabel`) when the view shows page
 * labels. A label is left out when a later or active page covers it.
 */
export class PageLabelGuide extends LabelGuide {
  static {
    registerClass(this, "GPageLabelGuide");
  }

  static ID = "guide.pagelabel";

  /** Whether the label of `page` shows. */
  _pageFilter(page: Page, context: GuidePaintContext, transform: Transform): boolean {
    if (!context.configuration.multiPageView && !page.hasFlag(NodeFlag.Active)) return false;
    if (this._scene.getActivePage() !== page) {
      const translation = (
        (page.getProperty("off") as Transform | null) || page.getTransform()
      ).getTranslation();
      const x = translation.getX();
      const y = translation.getY();
      const labelHeight = this._scene.getLabelBBox(page.getScaleLabelFactor()).getHeight();
      let factor = page.isScaleLabel() ? transform.getScaleFactor() : 1;
      factor *= PaintCanvas.getScreenDPI();
      let size = this._scene.$lbs * factor;
      size /= transform.getScaleFactor();
      const width = context.canvas.measureText(
        page.$name || (Locale.get(new LocaleKey("GPage", "name")) as string),
        size,
      ).width;
      const labelBox = new Rect(x, y - labelHeight, width, labelHeight);
      const index = page.getElementIndex();
      const covering = this._scene.retrieveChildrenInPaintBBox(
        labelBox,
        QuadTree.RETRIEVE_MODE_INTERSECT,
      ) as Element[];
      for (let i = 0; i < covering.length; i++) {
        const other = covering[i] as Element;
        if (other !== page) {
          if (other.getElementIndex() > index) return false;
          if (other.hasFlag(NodeFlag.Active)) return false;
        }
      }
    }
    return true;
  }

  override getId(): string {
    return PageLabelGuide.ID;
  }

  override _gatherLabels(transform: Transform, paintContext: PaintContext): LabelItem[] | null {
    const context = guidePaintContext(paintContext);
    let labels: LabelItem[] | null = null;
    if (context.configuration.pageLabelsVisible) {
      const canvas = context.canvas;
      const dirty = context.dirtyMatcher.getDirtyRectangles() as Rect[];
      const scale = (this._scene.getActivePage() as Page).isScaleLabel()
        ? transform.getScaleFactor()
        : 1;
      const labelHeight = this._scene.getLabelBBox(scale).getHeight();
      labels = [];
      let visible = (transform.inverted() as Transform).mapRect(
        new Rect(0, 0, canvas.getWidth(), canvas.getHeight()),
      );
      visible = visible.expanded(0, labelHeight, 0, labelHeight);
      let pages = this._scene.retrieveChildrenInPaintBBox(
        visible,
        QuadTree.RETRIEVE_MODE_INTERSECT,
      ) as unknown as Page[];
      pages = pages.filter((page) => this._pageFilter(page, context, transform));
      for (let m = 0; m < dirty.length; ++m) {
        const area = dirty[m] as Rect;
        for (let i = pages.length - 1; i >= 0; i--) {
          const page = pages[i] as Page;
          if (context.configuration.multiPageView || page.hasFlag(NodeFlag.Active)) {
            let box = page.getGeometryBBox();
            const position = page.getPosition(context.configuration.multiPageView);
            if (box) {
              if (!(0 === position.getX() && 0 === position.getY())) {
                box = box.translated(position.getX(), position.getY());
              }
              const labelBox = new Rect(
                box.getX(),
                box.getY() - labelHeight,
                box.getWidth(),
                labelHeight,
              );
              if (area.containsRect(labelBox) || labelBox.intersectsRect(area)) {
                const viewBox = transform.mapRect(box);
                const name = page.$name || (Locale.get(new LocaleKey("GPage", "name")) as string);
                let color: Color | { toScreenCSS(): string } =
                  (this._scene.$lbc as { toScreenCSS(): string } | null) || context.labelColor;
                if (page.hasFlag(NodeFlag.Selected)) color = context.selectionShapeOutlineColor;
                else if (page.hasFlag(NodeFlag.Highlighted)) color = context.highlightOutlineColor;
                labels.push(
                  new LabelItem(
                    new Point(viewBox.getX(), viewBox.getY()),
                    viewBox.getWidth(),
                    name,
                    color,
                    page.isScaleLabel(),
                  ),
                );
                pages.splice(i, 1);
              }
            }
          }
        }
      }
    }
    return labels;
  }

  override toString(): string {
    return "[Object GPageLabelGuide]";
  }
}
