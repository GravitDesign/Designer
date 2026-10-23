// Old: chunk.vendor.js module 153 (GBBoxGuide).
import { registerClass } from "../../engine/core/object.ts";
import { QuadTree } from "../../engine/geometry/quadtree.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Block } from "../../engine/scene/block.ts";
import { Accelerated, type AcceleratedApi } from "../../engine/scene/element-accelerated.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Element } from "../../engine/scene/element.ts";
import { Item } from "../../engine/scene/item.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Container, type ContainerNode } from "../../engine/scene/node-container.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { EditorOptions } from "../editor-options.ts";
import {
  Guide,
  GuideMap,
  type GuideLine,
  type GuideMapResult,
  type GuideShape,
  type GuidesHost,
} from "./guide.ts";
import { Guides } from "./guides.ts";

/** A candidate box for equal spacing with its distance on one axis. */
interface DistanceCandidate {
  bBox: Rect;
  delta: number;
  absDelta: number;
}

/** An equal-spacing match: the shift on both axes and the two boxes it spaces against. */
interface DistanceMatch {
  absDeltaX: number;
  deltaX: number;
  absDeltaY: number;
  deltaY: number;
  bbox1: Rect;
  bbox2: Rect;
}

/** A snap visual of the distance check, as GGuides keeps them. */
export interface BBoxGuideVisual {
  guide: GuideShape;
  page: Page | null;
}

type ElementVisitor = (element: Element) => void;

const Priority = {
  DISTANCE_FIRST: 1,
  BBOX_FIRST: 2,
} as const;

/**
 * Smart guides (`guide.bbox`): snaps to the edges and centers of other
 * elements' geometry boxes on the page, and finds equal spacing between
 * boxes.
 */
export class BBoxGuide extends GuideMap(Guide) {
  static {
    registerClass(this, "GBBoxGuide");
  }

  static ID = "guide.bbox";
  static GUIDE_MARGIN = 20;
  static PRIORITY = Priority;

  _priority: number;
  _snapElems: Element[] | null = null;
  _scoped = false;
  _snapMainPage: Node | null = null;
  _eSnapElems: Element[] | null = null;

  constructor(guides: GuidesHost) {
    super(guides);
    this._priority = BBoxGuide.PRIORITY.DISTANCE_FIRST;
  }

  override getId(): string {
    return BBoxGuide.ID;
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
    const margin = useMargin ? BBoxGuide.GUIDE_MARGIN : 0;
    const snapDistance = (zoom ? (distance as number) / zoom : distance) as number;
    let activePosition: Point | undefined;
    let page: Page | null = null;
    let pageBox: Rect | null = null;
    let pagePosition: Point | null = null;
    const activePage = this._scene.getActivePage();
    let point = new Point(x, y);
    let scenePoint = point;
    if (this._guides.isMultiPageEnabled()) {
      if (activePage) {
        activePosition = activePage.getPosition(true);
        if (pageRelative) point = point.subtract(activePosition);
        else scenePoint = point.add(activePosition);
      }
      this._scene.iteratePages((candidate) => {
        let box = candidate.getGeometryBBox();
        const position = candidate.getPosition(true);
        if (box) {
          box = box.translated(position.getX(), position.getY());
          if (box.containsPoint(scenePoint)) {
            page = candidate;
            pageBox = activePosition
              ? box.translated(-activePosition.getX(), -activePosition.getY())
              : box;
            pagePosition = position;
            return false;
          }
          return undefined;
        }
        page = candidate;
        pageBox = null;
        pagePosition = position;
        return false;
      });
    } else if (activePage) {
      page = activePage;
      activePosition = page.getPosition(false);
      pageBox = page.getGeometryBBox();
      pagePosition = activePosition;
      if (pageRelative) point = point.subtract(activePosition);
    }
    const visit: ElementVisitor = (element) => {
      if (this._exclusions && this._exclusions.length) {
        for (let k = 0; k < this._exclusions.length; ++k) {
          if (this._exclusions[k] == element) return;
        }
      }
      const box = element.getGeometryBBox();
      if (!box || box.isEmpty()) return;
      const offset = pagePosition as unknown as Point;
      let topLeft = box.getSide(Rect.Side.TOP_LEFT).add(offset);
      let bottomRight = box.getSide(Rect.Side.BOTTOM_RIGHT).add(offset);
      let center = box.getSide(Rect.Side.CENTER).add(offset);
      if (activePosition) {
        topLeft = topLeft.subtract(activePosition);
        bottomRight = bottomRight.subtract(activePosition);
        center = center.subtract(activePosition);
      }
      const pivots = [topLeft, bottomRight, center];
      const bounds = pageBox as Rect | null;
      let onPage = false;
      for (let k = 0; k < pivots.length && !onPage; ++k) {
        if (!(bounds && !bounds.containsPoint(pivots[k] as Point, true))) onPage = true;
      }
      if (!onPage) return;
      for (let k = 0; k < pivots.length; ++k) {
        const pivot = pivots[k] as Point;
        if (
          !bounds ||
          (bounds.getX() <= pivot.getX() && bounds.getX() + bounds.getWidth() >= pivot.getX())
        ) {
          const dist = Math.abs(point.getX() - pivot.getX());
          if (
            (null === snapX && dist <= snapDistance) ||
            (null !== snapX && dist < Math.abs(point.getX() - snapX))
          ) {
            snapX = pivot.getX();
            deltaX = dist;
            const line: Point[] =
              point.getY() <= topLeft.getY()
                ? [
                    new Point(snapX, point.getY() - margin),
                    new Point(snapX, bottomRight.getY() + margin),
                  ]
                : topLeft.getY() < point.getY() && point.getY() < bottomRight.getY()
                  ? [
                      new Point(snapX, topLeft.getY() - margin),
                      new Point(snapX, bottomRight.getY() + margin),
                    ]
                  : [
                      new Point(snapX, topLeft.getY() - margin),
                      new Point(snapX, point.getY() + margin),
                    ];
            guideX = {
              bounds: [[topLeft.getY(), bottomRight.getY()]],
              orient: Guides.Orientation.V,
              line,
            };
          } else if (null !== snapX && GMath.isEqualEps(dist, Math.abs(point.getX() - snapX))) {
            snapX = pivot.getX();
            deltaX = dist;
            const guide = guideX as unknown as GuideLine;
            const line = guide.line as Point[];
            (guide.bounds as number[][]).push([topLeft.getY(), bottomRight.getY()]);
            if (point.getY() <= topLeft.getY()) {
              if ((line[1] as Point).getY() < bottomRight.getY() + margin) {
                line[1] = new Point(snapX, bottomRight.getY() + margin);
              }
            } else if (topLeft.getY() < point.getY() && point.getY() < bottomRight.getY()) {
              if ((line[1] as Point).getY() < bottomRight.getY() + margin) {
                line[1] = new Point(snapX, bottomRight.getY() + margin);
              }
              if ((line[0] as Point).getY() > topLeft.getY() - margin) {
                line[0] = new Point(snapX, topLeft.getY() - margin);
              }
            } else if ((line[0] as Point).getY() > topLeft.getY() - margin) {
              line[0] = new Point(snapX, topLeft.getY() - margin);
            }
          }
        }
        if (
          !bounds ||
          (bounds.getY() <= pivot.getY() && bounds.getY() + bounds.getHeight() >= pivot.getY())
        ) {
          const dist = Math.abs(point.getY() - pivot.getY());
          if (
            (null === snapY && dist <= snapDistance) ||
            (null !== snapY && dist < Math.abs(point.getY() - snapY))
          ) {
            snapY = pivot.getY();
            deltaY = dist;
            const line: Point[] =
              point.getX() <= topLeft.getX()
                ? [
                    new Point(point.getX() - margin, snapY),
                    new Point(bottomRight.getX() + margin, snapY),
                  ]
                : topLeft.getX() < point.getX() && point.getX() < bottomRight.getX()
                  ? [
                      new Point(topLeft.getX() - margin, snapY),
                      new Point(bottomRight.getX() + margin, snapY),
                    ]
                  : [
                      new Point(topLeft.getX() - margin, snapY),
                      new Point(point.getX() + margin, snapY),
                    ];
            guideY = {
              bounds: [[topLeft.getX(), bottomRight.getX()]],
              orient: Guides.Orientation.H,
              line,
            };
          } else if (null !== snapY && GMath.isEqualEps(dist, Math.abs(point.getY() - snapY))) {
            snapY = pivot.getY();
            deltaY = dist;
            const guide = guideY as unknown as GuideLine;
            const line = guide.line as Point[];
            (guide.bounds as number[][]).push([topLeft.getX(), bottomRight.getX()]);
            if (point.getX() <= topLeft.getX()) {
              if ((line[1] as Point).getX() < bottomRight.getX() + margin) {
                line[1] = new Point(bottomRight.getX() + margin, snapY);
              }
            } else if (topLeft.getX() < point.getX() && point.getX() < bottomRight.getX()) {
              if ((line[1] as Point).getX() < bottomRight.getX() + margin) {
                line[1] = new Point(bottomRight.getX() + margin, snapY);
              }
              if ((line[0] as Point).getX() > topLeft.getX() - margin) {
                line[0] = new Point(topLeft.getX() - margin, snapY);
              }
            } else if ((line[0] as Point).getX() > topLeft.getX() - margin) {
              line[0] = new Point(topLeft.getX() - margin, snapY);
            }
          }
        }
      }
    };
    const snapPage = page as Page | null;
    if (snapPage) {
      if (this._scoped && snapPage != this._snapMainPage) this._setEffectiveScope(snapPage);
      let pivot = point.subtract(pagePosition as unknown as Point);
      if (activePosition) pivot = pivot.add(activePosition);
      this._applySnappingToPivots([pivot], snapDistance, snapPage, visit);
    }
    if (null !== snapX || null !== snapY) {
      result = {
        x: null !== snapX ? { value: snapX, guide: guideX, delta: deltaX, page: activePage } : null,
        y: null !== snapY ? { value: snapY, guide: guideY, delta: deltaY, page: activePage } : null,
      };
    }
    return result;
  }

  override useExclusions(exclusions: Node[] | null | undefined): void {
    if (exclusions && exclusions.length) {
      this._exclusions = [];
      for (let i = 0; i < exclusions.length; ++i) {
        const node = exclusions[i] as Node;
        if (node instanceof Item || node instanceof Layer) this._exclusions.push(node);
      }
    }
  }

  setPriority(priority: number): void {
    this._priority = priority;
  }

  getPriority(): number {
    return this._priority;
  }

  /**
   * True for BBOX_FIRST, despite the name (see "BBoxGuide priority names
   * are swapped" in QUESTIONS.md).
   */
  hasPriorityDistanceFirst(): boolean {
    return this._priority === BBoxGuide.PRIORITY.BBOX_FIRST;
  }

  /**
   * Equal spacing: whether moving `rect` by up to `distance` makes its gap
   * to a box equal to the gap between two other boxes. Returns the moved
   * rect or null; fills `delta` with the shift and `visualsY` / `visualsX`
   * with the distance guides of a vertical or horizontal match.
   */
  checkDistanceGuidesMapping(
    rect: Rect,
    distance: number,
    zoom: number | null,
    pageRelative: boolean | undefined,
    delta: number[],
    visualsY: BBoxGuideVisual[],
    visualsX: BBoxGuideVisual[],
  ): Rect | null {
    const candidatesX: DistanceCandidate[] = [];
    const candidatesY: DistanceCandidate[] = [];
    let result: Rect | null = null;
    let matchY: DistanceMatch | null = null;
    let matchX: DistanceMatch | null = null;
    const snapDistance = zoom ? distance / zoom : distance;
    let pivots = [
      rect.getSide(Rect.Side.TOP_LEFT),
      rect.getSide(Rect.Side.BOTTOM_RIGHT),
      rect.getSide(Rect.Side.CENTER),
    ];
    let moving = rect;
    let page: Page | null = null;
    const activePage = this._scene.getActivePage();
    if (this._guides.isMultiPageEnabled()) {
      if (activePage && !pageRelative) {
        const position = activePage.getPosition(true);
        pivots = pivots.map((pivot) => pivot.add(position));
        moving = moving.translated(position.getX(), position.getY());
      }
      let pagePosition: Point | null = null;
      for (let v = 0; v < pivots.length && !page; ++v) {
        this._scene.iteratePages((candidate) => {
          const box = candidate.getGeometryBBox();
          const position = candidate.getPosition(true);
          if (
            box &&
            box.translated(position.getX(), position.getY()).containsPoint(pivots[v] as Point)
          ) {
            page = candidate;
            pagePosition = position;
            return false;
          }
          return undefined;
        });
      }
      const position = pagePosition as Point | null;
      if (position) {
        pivots = pivots.map((pivot) => pivot.subtract(position));
        moving = moving.translated(-position.getX(), -position.getY());
      }
    } else if ((page = activePage) && pageRelative) {
      const position = page.getPosition(false);
      pivots = pivots.map((pivot) => pivot.subtract(position));
      moving = moving.translated(-position.getX(), -position.getY());
    }
    const snapPage = page as Page | null;
    if (!snapPage) return null;
    const visit: ElementVisitor = (element) => {
      if (this._exclusions && this._exclusions.length) {
        for (let k = 0; k < this._exclusions.length; ++k) {
          if (this._exclusions[k] == element) return;
        }
      }
      const box = element.getGeometryBBox();
      if (box && !box.isEmpty()) {
        const sides = [
          box.getSide(Rect.Side.TOP_LEFT),
          box.getSide(Rect.Side.BOTTOM_RIGHT),
          box.getSide(Rect.Side.CENTER),
        ];
        let bestX: DistanceCandidate | null = null;
        let bestY: DistanceCandidate | null = null;
        for (let k = 0; k < sides.length; ++k) {
          const side = sides[k] as Point;
          for (let f = 0; f < pivots.length; ++f) {
            const pivot = pivots[f] as Point;
            let offset = side.getX() - pivot.getX();
            let abs = Math.abs(offset);
            if (abs <= snapDistance && (!bestX || abs < bestX.absDelta)) {
              bestX = { bBox: box, delta: offset, absDelta: abs };
            }
            offset = side.getY() - pivot.getY();
            abs = Math.abs(offset);
            if (abs <= snapDistance && (!bestY || abs < bestY.absDelta)) {
              bestY = { bBox: box, delta: offset, absDelta: abs };
            }
          }
        }
        if (bestX) candidatesX.push(bestX);
        if (bestY) candidatesY.push(bestY);
      }
    };
    if (this._scoped && snapPage != this._snapMainPage) this._setEffectiveScope(snapPage);
    this._applySnappingToPivots(pivots, snapDistance, snapPage, visit);
    // The candidates with the smallest distance, split by its sign; none
    // when one of them overlaps the moving rect.
    const closest = (
      candidates: DistanceCandidate[],
    ): { minDeltaPos: DistanceCandidate[]; minDeltaNeg: DistanceCandidate[] } => {
      let overlaps = false;
      let positive: DistanceCandidate[] = [];
      let negative: DistanceCandidate[] = [];
      let min: number | null = null;
      for (let a = 0; a < candidates.length && !overlaps; ++a) {
        const candidate = candidates[a] as DistanceCandidate;
        overlaps = !moving.intersected(candidate.bBox).isEmpty();
        if (!overlaps && (null === min || candidate.absDelta <= min)) {
          if (null === min || candidate.absDelta < min) {
            if (candidate.delta >= 0) {
              positive = [candidate];
              negative = [];
            } else {
              negative = [candidate];
              positive = [];
            }
            min = candidate.absDelta;
          } else if (candidate.delta >= 0) positive.push(candidate);
          else negative.push(candidate);
        }
      }
      if (overlaps) {
        positive = [];
        negative = [];
      }
      return { minDeltaPos: positive, minDeltaNeg: negative };
    };
    // Among boxes aligned on one axis, the pair whose gap the moving rect
    // can match on the other axis (`vertical`: gaps on y).
    const spacing = (aligned: DistanceCandidate[], vertical: boolean): DistanceMatch | null => {
      const pairs: { offsJfromI: number; i: number; j: number }[] = [];
      for (let a = 0; a < aligned.length - 1; ++a) {
        for (let s = a + 1; s < aligned.length; ++s) {
          const offset = (aligned[a] as DistanceCandidate).bBox.getXYOffset(
            (aligned[s] as DistanceCandidate).bBox,
            true,
            true,
          );
          if (vertical) {
            if (offset.y && !offset.x) pairs.push({ offsJfromI: offset.y, i: a, j: s });
          } else if (offset.x && !offset.y) pairs.push({ offsJfromI: offset.x, i: a, j: s });
        }
      }
      let best: { absDelta: number; delta: number; bbox1: Rect; bbox2: Rect } | null = null;
      for (let p = 0; p < pairs.length; ++p) {
        const pair = pairs[p] as { offsJfromI: number; i: number; j: number };
        const first = (aligned[pair.i] as DistanceCandidate).bBox;
        const second = (aligned[pair.j] as DistanceCandidate).bBox;
        let toFirst: number | null;
        let toSecond: number | null;
        if (vertical) {
          toFirst = moving.getXYOffset(first, false, true).y;
          toSecond = moving.getXYOffset(second, false, true).y;
        } else {
          toFirst = moving.getXYOffset(first, true, false).x;
          toSecond = moving.getXYOffset(second, true, false).x;
        }
        if (toFirst && toSecond) {
          const gap = Math.abs(pair.offsJfromI);
          let diff = Math.abs(Math.abs(toFirst) - gap);
          if (diff <= snapDistance && (!best || diff < best.absDelta)) {
            best = {
              absDelta: diff,
              delta:
                (gap >= Math.abs(toFirst) && toFirst > 0) ||
                (gap < Math.abs(toFirst) && toFirst < 0)
                  ? -diff
                  : diff,
              bbox1: first,
              bbox2: second,
            };
          }
          diff = Math.abs(Math.abs(toSecond) - gap);
          if (diff <= snapDistance && (!best || diff < best.absDelta)) {
            best = {
              absDelta: diff,
              delta:
                (gap >= Math.abs(toSecond) && toSecond > 0) ||
                (gap < Math.abs(toSecond) && toSecond < 0)
                  ? -diff
                  : diff,
              bbox1: first,
              bbox2: second,
            };
          }
          diff = Math.abs(Math.abs(toFirst) - Math.abs(toSecond)) / 2;
          if (diff <= snapDistance && (!best || diff < best.absDelta)) {
            best = {
              absDelta: diff,
              delta:
                (Math.abs(toFirst) >= Math.abs(toSecond) && toFirst < 0 && toSecond > 0) ||
                (Math.abs(toFirst) <= Math.abs(toSecond) && toFirst > 0 && toSecond < 0)
                  ? -diff
                  : diff,
              bbox1: first,
              bbox2: second,
            };
          }
        }
      }
      let match: DistanceMatch | null = null;
      if (best) {
        const head = aligned[0] as DistanceCandidate;
        match = vertical
          ? {
              absDeltaX: head.absDelta,
              deltaX: head.delta,
              absDeltaY: best.absDelta,
              deltaY: best.delta,
              bbox1: best.bbox1,
              bbox2: best.bbox2,
            }
          : {
              absDeltaX: best.absDelta,
              deltaX: best.delta,
              absDeltaY: head.absDelta,
              deltaY: head.delta,
              bbox1: best.bbox1,
              bbox2: best.bbox2,
            };
      }
      return match;
    };
    if (candidatesX.length > 1) {
      const split = closest(candidatesX);
      const positive = split.minDeltaPos;
      const negative = split.minDeltaNeg;
      if (positive.length > 1 || negative.length > 1) {
        let fromPositive: DistanceMatch | null = null;
        let fromNegative: DistanceMatch | null = null;
        if (positive.length > 1) fromPositive = spacing(positive, true);
        if (negative.length > 1) fromNegative = spacing(negative, true);
        if (fromPositive && (!fromNegative || fromPositive.absDeltaY <= fromNegative.absDeltaY)) {
          matchY = fromPositive;
        } else if (fromNegative) matchY = fromNegative;
      }
    }
    if (candidatesY.length > 1) {
      const split = closest(candidatesY);
      const positive = split.minDeltaPos;
      const negative = split.minDeltaNeg;
      if (positive.length > 1 || negative.length > 1) {
        let fromPositive: DistanceMatch | null = null;
        let fromNegative: DistanceMatch | null = null;
        if (positive.length > 1) fromPositive = spacing(positive, false);
        if (negative.length > 1) fromNegative = spacing(negative, false);
        if (fromPositive && (!fromNegative || fromPositive.absDeltaX <= fromNegative.absDeltaX)) {
          matchX = fromPositive;
        } else if (fromNegative) matchX = fromNegative;
      }
    }
    if (matchY || matchX) {
      if (
        matchY &&
        (!matchX ||
          matchY.absDeltaX < matchX.absDeltaY ||
          (matchY.absDeltaX == matchX.absDeltaY && matchY.absDeltaY <= matchX.absDeltaX))
      ) {
        result = rect.translated(matchY.deltaX, matchY.deltaY);
        const moved = moving.translated(matchY.deltaX, matchY.deltaY);
        delta[0] = matchY.deltaX;
        delta[1] = matchY.deltaY;
        const guides = this.getDistGuides(matchY.bbox1, matchY.bbox2, moved, true);
        if (guides) {
          for (let v = 0; v < guides.length; ++v) {
            visualsY.push({ guide: guides[v] as GuideLine, page: snapPage });
          }
        }
      } else if (matchX) {
        result = rect.translated(matchX.deltaX, matchX.deltaY);
        const moved = moving.translated(matchX.deltaX, matchX.deltaY);
        delta[0] = matchX.deltaX;
        delta[1] = matchX.deltaY;
        const guides = this.getDistGuides(matchX.bbox1, matchX.bbox2, moved, false);
        if (guides) {
          for (let v = 0; v < guides.length; ++v) {
            visualsX.push({ guide: guides[v] as GuideLine, page: snapPage });
          }
        }
      }
    }
    return result;
  }

  /**
   * The lines between three boxes sorted along the axis (`vertical`: y):
   * the first gap gets a distance value, the others plain lines.
   */
  getDistGuides(first: Rect, second: Rect, moving: Rect, vertical: boolean): GuideLine[] | null {
    const guides: GuideLine[] = [];
    let firstStart: number;
    let firstEnd: number;
    let secondStart: number;
    let secondEnd: number;
    let movingStart: number;
    if (vertical) {
      firstEnd = (firstStart = first.getY()) + first.getHeight();
      secondEnd = (secondStart = second.getY()) + second.getHeight();
      movingStart = moving.getY();
    } else {
      firstEnd = (firstStart = first.getX()) + first.getWidth();
      secondEnd = (secondStart = second.getX()) + second.getWidth();
      movingStart = moving.getX();
    }
    const ordered: Rect[] = [];
    if (firstEnd < secondStart && firstEnd < movingStart) {
      ordered.push(first);
      if (secondEnd < movingStart) ordered.push(second, moving);
      else ordered.push(moving, second);
    } else if (secondEnd < firstStart && secondEnd < movingStart) {
      ordered.push(second);
      if (firstEnd < movingStart) ordered.push(first, moving);
      else ordered.push(moving, first);
    } else {
      ordered.push(moving);
      if (firstEnd < secondStart) ordered.push(first, second);
      else ordered.push(second, first);
    }
    for (let g = 0; g < ordered.length - 1; ++g) {
      const from = ordered[g] as Rect;
      const to = ordered[g + 1] as Rect;
      const fromSides: Point[] = [];
      const toSides: Point[] = [];
      if (vertical) {
        fromSides.push(
          from.getSide(Rect.Side.BOTTOM_LEFT),
          from.getSide(Rect.Side.BOTTOM_CENTER),
          from.getSide(Rect.Side.BOTTOM_RIGHT),
        );
        toSides.push(
          to.getSide(Rect.Side.TOP_LEFT),
          to.getSide(Rect.Side.TOP_CENTER),
          to.getSide(Rect.Side.TOP_RIGHT),
        );
      } else {
        fromSides.push(
          from.getSide(Rect.Side.TOP_RIGHT),
          from.getSide(Rect.Side.RIGHT_CENTER),
          from.getSide(Rect.Side.BOTTOM_RIGHT),
        );
        toSides.push(
          to.getSide(Rect.Side.TOP_LEFT),
          to.getSide(Rect.Side.LEFT_CENTER),
          to.getSide(Rect.Side.BOTTOM_LEFT),
        );
      }
      let firstLine = true;
      for (let b = 0; b < fromSides.length; ++b) {
        const start = fromSides[b] as Point;
        for (let w = 0; w < toSides.length; ++w) {
          const end = toSides[w] as Point;
          if (
            (vertical && GMath.isEqualEps(start.getX(), end.getX())) ||
            (!vertical && GMath.isEqualEps(start.getY(), end.getY()))
          ) {
            const guide: GuideLine = { line: [start, end] };
            if (firstLine) {
              if (vertical) {
                guide.orient = Guides.Orientation.V;
                guide.valueSegments = [{ bounds: [start.getY(), end.getY()] }];
              } else {
                guide.orient = Guides.Orientation.H;
                guide.valueSegments = [{ bounds: [start.getX(), end.getX()] }];
              }
              firstLine = false;
            } else {
              guide.freeSegments = guide.freeSegments ? guide.freeSegments : [];
              guide.freeSegmentsColor = EditorOptions.distanceHelperColor;
              if (vertical) {
                guide.orient = Guides.Orientation.V;
                guide.freeSegments.push([start.getY(), end.getY()]);
              } else {
                guide.orient = Guides.Orientation.H;
                guide.freeSegments.push([start.getX(), end.getX()]);
              }
            }
            guides.push(guide);
          }
        }
      }
    }
    return guides.length ? guides : null;
  }

  override isRelativeToPage(): boolean {
    return true;
  }

  override isScopeSupported(): boolean {
    return true;
  }

  /**
   * Limits snapping to the children of the edited containers; the scope's
   * main page is the active page when one of them lies on it.
   */
  override setScope(scope: Node[] | null): void {
    if (scope && scope.length) {
      this._snapElems = [];
      let page: Node | null = null;
      let onActivePage = false;
      const activePage = this._scene.getActivePage();
      for (let r = 0; r < scope.length; ++r) {
        const node = scope[r] as Node;
        if (node.hasMixin(Container)) {
          for (
            let child = (node as ContainerNode).getFirstChild();
            null != child;
            child = child.getNext()
          ) {
            if (child instanceof Block) this._snapElems.push(child);
          }
        }
        if (!onActivePage) {
          page = node instanceof Page ? node : node.findParent((parent) => parent instanceof Page);
          if (page == activePage) onActivePage = true;
        }
      }
      this._scoped = true;
      this._snapMainPage = onActivePage ? activePage : page;
    } else {
      this._snapElems = null;
      this._scoped = false;
      this._snapMainPage = null;
    }
    this._eSnapElems = null;
  }

  _setEffectiveScope(page: Node): void {
    this._eSnapElems = [];
    if (page.hasMixin(Container)) {
      for (
        let child = (page as ContainerNode).getFirstChild();
        null != child;
        child = child.getNext()
      ) {
        if (child instanceof Block) this._eSnapElems.push(child);
      }
    }
  }

  _getEffectiveSnapElems(): Element[] | null {
    return this._eSnapElems ? this._eSnapElems : this._snapElems;
  }

  /** The elements under `node` (recursively) whose geometry box meets `area`. */
  _getAllChildrenInBBox(node: Node, area: Rect): Element[] {
    let found: Element[] = [];
    if (!node.hasMixin(Container)) return [];
    if (node.hasMixin(Accelerated)) {
      found =
        (node as unknown as AcceleratedApi).retrieveChildrenInGeometryBBox(
          area,
          QuadTree.RETRIEVE_MODE_INTERSECT,
        ) || [];
    } else {
      for (let child = (node as ContainerNode).getFirstChild(); child; child = child.getNext()) {
        if (child instanceof Element) {
          const box = child.getGeometryBBox();
          if (box && box.intersectsRect(area)) found.push(child);
        }
      }
    }
    let nested: Element[] = [];
    for (let a = 0; a < found.length; a++) {
      nested = nested.concat(this._getAllChildrenInBBox(found[a] as Element, area));
    }
    return found.concat(nested);
  }

  /**
   * Calls `visit` for the visible items and layers of `page` in the strips
   * through each pivot (`distance` wide); without a scope only top-level
   * ones (not inside groups).
   */
  _applySnappingToPivots(
    pivots: Point[],
    distance: number,
    page: Page,
    visit: ElementVisitor,
  ): void {
    const box = page.getGeometryBBox();
    if (!box) return;
    let elements: Element[] = [];
    for (let h = 0; h < pivots.length; h++) {
      const px = (pivots[h] as Point).getX();
      const py = (pivots[h] as Point).getY();
      const column = new Rect(
        px - distance,
        box.getY() - distance,
        2 * distance,
        box.getHeight() + 2 * distance,
      );
      const row = new Rect(
        box.getX() - distance,
        py - distance,
        box.getWidth() + 2 * distance,
        2 * distance,
      );
      elements = elements.concat(
        this._getAllChildrenInBBox(page, column).filter((element) => elements.indexOf(element) < 0),
      );
      elements = elements.concat(
        this._getAllChildrenInBBox(page, row).filter((element) => elements.indexOf(element) < 0),
      );
    }
    for (let h = 0; h < elements.length; h++) {
      const element = elements[h] as Element;
      if (
        (element instanceof Item || element instanceof Layer) &&
        !element.hasFlag(ElementFlag.Hidden)
      ) {
        let target: Element | null = null;
        const scoped = this._getEffectiveSnapElems();
        if (scoped || element.getParent() instanceof Item) {
          if (scoped) {
            for (let y = 0; y < scoped.length && !target; ++y) {
              if (element == scoped[y]) target = element;
            }
          }
        } else target = element;
        if (target) visit(target);
      }
    }
  }

  override toString(): string {
    return "[Object GBBoxGuide]";
  }
}
