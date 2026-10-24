// Old: chunk.vendor.js module 742 (GPageGuide).
import { registerClass } from "../../engine/core/object.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Guide, GuideMap, type GuideLine, type GuideMapResult } from "./guide.ts";
import { Guides } from "./guides.ts";

/**
 * Snaps to the pages (`guide.scene`) of fixed-size scenes: the edges and
 * centers of the page box and of its margin box. In multi-page view the
 * page under the point (within the snap distance) is used.
 */
export class PageGuide extends GuideMap(Guide) {
  static {
    registerClass(this, "GPageGuide");
  }

  static ID = "guide.scene";

  override getId(): string {
    return PageGuide.ID;
  }

  override map(
    x: number,
    y: number,
    useMargin?: boolean,
    distance?: number,
    zoom?: number | null,
    pageRelative?: boolean,
  ): GuideMapResult | null {
    let snapX: number | null = null;
    let snapY: number | null = null;
    let guideX: GuideLine | null = null;
    let guideY: GuideLine | null = null;
    let deltaX: number | null = null;
    let deltaY: number | null = null;
    let result: GuideMapResult | null = null;
    const snapDistance = (zoom ? (distance as number) / zoom : distance) as number;
    let page: Page | undefined;
    if (this._scene.isFixedSized()) {
      const boxes: Rect[] = [];
      const activePage = this._scene.getActivePage();
      let point = new Point(x, y);
      if (this._guides.isMultiPageEnabled()) {
        if (activePage) {
          const activePosition = activePage.getPosition(true);
          if (!pageRelative) point = point.add(activePosition);
        }
        this._scene.iteratePages((candidate) => {
          let goOn = true;
          const box = candidate.getGeometryBBox();
          const position = candidate.getPosition(true);
          let area = box ? box.translated(position.getX(), position.getY()) : null;
          area = area && area.expanded(snapDistance, snapDistance, snapDistance, snapDistance);
          if (area && area.containsPoint(point)) {
            boxes.push(box as Rect);
            goOn = false;
          }
          const marginBox = candidate.getMarginBBox();
          let marginArea = marginBox
            ? marginBox.translated(position.getX(), position.getY())
            : null;
          marginArea =
            marginArea &&
            marginArea.expanded(snapDistance, snapDistance, snapDistance, snapDistance);
          if (marginArea && marginArea.containsPoint(point)) {
            boxes.push(marginBox as Rect);
            goOn = false;
          }
          if (!goOn) {
            page = candidate;
            point = point.subtract(position);
          }
          return goOn;
        });
      } else if (activePage) {
        page = activePage;
        const box = activePage.getGeometryBBox();
        if (box) boxes.push(box);
        const marginBox = activePage.getMarginBBox();
        if (marginBox) boxes.push(marginBox);
        if (pageRelative) point = point.subtract(page.getPosition(false));
      }
      for (let e = 0; e < boxes.length; ++e) {
        const box = boxes[e] as Rect;
        if (box && !box.isEmpty()) {
          const topLeft = box.getSide(Rect.Side.TOP_LEFT);
          const bottomRight = box.getSide(Rect.Side.BOTTOM_RIGHT);
          const pivots = [topLeft, bottomRight, box.getSide(Rect.Side.CENTER)];
          const sides = [Rect.Side.TOP_LEFT, Rect.Side.BOTTOM_RIGHT, Rect.Side.CENTER];
          for (let i = 0; i < sides.length; ++i) {
            const pivot = pivots[i] as Point;
            let dist = Math.abs(point.getX() - pivot.getX());
            if (null === snapX && dist <= snapDistance) {
              snapX = pivot.getX();
              deltaX = dist;
              guideX = {
                bounds: [[topLeft.getY(), bottomRight.getY()]],
                orient: Guides.Orientation.V,
                line: [new Point(snapX, topLeft.getY()), new Point(snapX, bottomRight.getY())],
              };
            }
            dist = Math.abs(point.getY() - pivot.getY());
            if (null === snapY && dist <= snapDistance) {
              snapY = pivot.getY();
              deltaY = dist;
              guideY = {
                bounds: [[topLeft.getX(), bottomRight.getX()]],
                orient: Guides.Orientation.H,
                line: [new Point(topLeft.getX(), snapY), new Point(bottomRight.getX(), snapY)],
              };
            }
          }
        }
      }
    }
    if (null !== snapX || null !== snapY) {
      result = {
        x: null !== snapX ? { value: snapX, guide: guideX, delta: deltaX, page } : null,
        y: null !== snapY ? { value: snapY, guide: guideY, delta: deltaY, page } : null,
      };
    }
    return result;
  }

  override isRelativeToPage(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GPageGuide]";
  }
}
