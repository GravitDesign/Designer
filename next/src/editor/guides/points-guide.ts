// Old: chunk.vendor.js module 741 (GPointsGuide).
import { registerClass } from "../../engine/core/object.ts";
import { QuadTree } from "../../engine/geometry/quadtree.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Accelerated, type AcceleratedApi } from "../../engine/scene/element-accelerated.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Element } from "../../engine/scene/element.ts";
import { Item } from "../../engine/scene/item.ts";
import { Container, type ContainerNode } from "../../engine/scene/node-container.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { EditorOptions } from "../editor-options.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import {
  Guide,
  GuideDetailMap,
  GuideMap,
  type GuideMapResult,
  type GuideMarker,
  type GuidePoint,
} from "./guide.ts";

/** A pivot as findPivots returns it: a point, or a path point with its type. */
interface Pivot {
  point?: Point;
  ptType?: string;
  autoH?: boolean;
}

/** Elements whose pivots count even outside the search strip. */
const ALL_PIVOT_CLASSES = [CompoundPath];

/** The part of an element editor the points guide uses. */
interface PivotEditor {
  findPivots(area: Rect): unknown[] | null;
}

/**
 * Snaps to anchor points (`guide.points`): the pivots of the items on the
 * page (from their editors when open), drawn as node markers.
 */
export class PointsGuide extends GuideMap(GuideDetailMap(Guide)) {
  static {
    registerClass(this, "GPointsGuide");
  }

  static ID = "guide.points";

  _priority: number | null = null;
  _snapElems: Item[] | null = null;
  _scoped = false;
  _snapMainPage: Page | null = null;
  _eSnapElems: Item[] | null = null;

  override getId(): string {
    return PointsGuide.ID;
  }

  override map(
    x: number,
    y: number,
    useMargin?: boolean,
    distance?: number,
    zoom?: number | null,
    pageRelative?: boolean,
  ): GuideMapResult | null {
    let activePosition: Point | undefined;
    let snapX: number | null = null;
    let snapY: number | null = null;
    let guideX: GuidePoint[] | null = null;
    let guideY: GuidePoint[] | null = null;
    let deltaX: number | null = null;
    let deltaY: number | null = null;
    let result: GuideMapResult | null = null;
    const snapDistance = (zoom ? (distance as number) / zoom : distance) as number;
    let page: Page | null = null;
    let pageBox: Rect | null = null;
    // Set together with `page` (in the iteratePages callback, so typed
    // explicitly: TypeScript would narrow a plain `= null` to null). The
    // visitor below only runs when there is a page, so it is set there.
    let pagePosition = null as Point | null;
    let point = new Point(x, y);
    let scenePoint = point;
    const activePage = this._scene.getActivePage();
    if (this._guides.isMultiPageEnabled()) {
      if (activePage) {
        activePosition = activePage.getPosition(true);
        if (pageRelative) point = point.subtract(activePosition);
        else scenePoint = point.add(activePosition);
      }
      this._scene.iteratePages((candidate) => {
        const box = candidate.getGeometryBBox();
        const position = candidate.getPosition(true);
        if (box && box.translated(position.getX(), position.getY()).containsPoint(scenePoint)) {
          page = candidate;
          pageBox = box;
          pagePosition = position;
          return false;
        }
        return undefined;
      });
    } else if (activePage) {
      page = activePage;
      activePosition = page.getPosition(false);
      pageBox = page.getGeometryBBox();
      pagePosition = activePosition;
      if (pageRelative) point = point.subtract(activePosition);
    }
    let pagePoint = point;
    if (pagePosition) pagePoint = pagePoint.subtract(pagePosition);
    if (activePosition) pagePoint = pagePoint.add(activePosition);
    const box = pageBox as Rect | null;
    const marker = (at: Point, type: string, auto: boolean): GuideMarker => {
      const node = EditorOptions.annotationHandles.path.node;
      let annot = node.straightType;
      if (
        type === PathBase.AnchorPoint.Type.Asymmetric ||
        type === PathBase.AnchorPoint.Type.Symmetric ||
        type === PathBase.AnchorPoint.Type.Mirror ||
        type === PathBase.AnchorPoint.Type.Connector
      ) {
        annot = node.smoothType;
        if (auto) annot = node.autoType;
      }
      return { pt: at, annot, size: node.size };
    };
    const visit = (element: Item): void => {
      if (this._exclusions && this._exclusions.length) {
        for (let t = 0; t < this._exclusions.length; ++t) {
          if (this._exclusions[t] == element) return;
        }
      }
      const anyPivot = ALL_PIVOT_CLASSES.some((cls) => element instanceof cls);
      const editor = ElementEditor.getEditor(element) as PivotEditor | null;
      const bbox = element.getGeometryBBox() as Rect;
      let column = new Rect(
        pagePoint.getX() - snapDistance,
        bbox.getY() - snapDistance,
        2 * snapDistance,
        bbox.getHeight() + 2 * snapDistance,
      );
      if (box) column = column.intersected(box);
      let pivots = editor ? editor.findPivots(column) : element.findPivots(false, column);
      if (pivots) {
        for (let t = 0; t < pivots.length; ++t) {
          const pivot = pivots[t] as Pivot | Point;
          let at = (pivot as Pivot).point ? ((pivot as Pivot).point as Point) : (pivot as Point);
          if (anyPivot || column.containsPoint(at)) {
            const type = (pivot as Pivot).ptType ? ((pivot as Pivot).ptType as string) : null;
            const auto = !!(pivot as Pivot).autoH;
            at = at.add(pagePosition as Point);
            if (activePosition) at = at.subtract(activePosition);
            const dist = Math.abs(point.getX() - at.getX());
            if (
              (null === snapX && dist <= snapDistance) ||
              (null !== snapX && dist < Math.abs(point.getX() - snapX))
            ) {
              snapX = at.getX();
              deltaX = dist;
              const target = type ? marker(at, type, auto) : at;
              guideX =
                point.getY() <= at.getY()
                  ? [new Point(snapX, point.getY()), target]
                  : [target, new Point(snapX, point.getY())];
            } else if (null !== snapX && dist === Math.abs(point.getX() - snapX)) {
              snapX = at.getX();
              deltaX = dist;
              const line = guideX as unknown as GuidePoint[];
              if (point.getY() <= at.getY()) {
                if (pointY(line[1] as GuidePoint) < at.getY())
                  line[1] = type ? marker(at, type, auto) : at;
              } else if (pointY(line[0] as GuidePoint) > at.getY()) {
                line[0] = type ? marker(at, type, auto) : at;
              }
            }
          }
        }
      }
      let row = new Rect(
        bbox.getX() - snapDistance,
        pagePoint.getY() - snapDistance,
        bbox.getWidth() + 2 * snapDistance,
        2 * snapDistance,
      );
      if (box) row = row.intersected(box);
      // Other elements reuse the pivots found for the column.
      if (anyPivot) pivots = editor ? editor.findPivots(row) : element.findPivots(false, row);
      if (pivots) {
        for (let t = 0; t < pivots.length; ++t) {
          const pivot = pivots[t] as Pivot | Point;
          let at = (pivot as Pivot).point ? ((pivot as Pivot).point as Point) : (pivot as Point);
          if (anyPivot || row.containsPoint(at)) {
            const type = (pivot as Pivot).ptType ? ((pivot as Pivot).ptType as string) : null;
            const auto = !!(pivot as Pivot).autoH;
            at = at.add(pagePosition as Point);
            if (activePosition) at = at.subtract(activePosition);
            const dist = Math.abs(point.getY() - at.getY());
            if (
              (null === snapY && dist <= snapDistance) ||
              (null !== snapY && dist < Math.abs(point.getY() - snapY))
            ) {
              snapY = at.getY();
              deltaY = dist;
              const target = type ? marker(at, type, auto) : at;
              guideY =
                point.getX() <= at.getX()
                  ? [new Point(point.getX(), snapY), target]
                  : [target, new Point(point.getX(), snapY)];
            } else if (null !== snapY && dist === Math.abs(point.getY() - snapY)) {
              snapY = at.getY();
              deltaY = dist;
              const line = guideY as unknown as GuidePoint[];
              if (point.getX() <= at.getX()) {
                if (pointX(line[1] as GuidePoint) < at.getX())
                  line[1] = type ? marker(at, type, auto) : at;
              } else if (pointX(line[0] as GuidePoint) > at.getX()) {
                line[0] = type ? marker(at, type, auto) : at;
              }
            }
          }
        }
      }
    };
    const childrenIn = (node: Node, area: Rect): Element[] => {
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
            const childBox = child.getGeometryBBox();
            if (childBox && childBox.intersectsRect(area)) found.push(child);
          }
        }
      }
      let nested: Element[] = [];
      for (let a = 0; a < found.length; a++)
        nested = nested.concat(childrenIn(found[a] as Element, area));
      return found.concat(nested);
    };
    const snapPage = page as Page | null;
    if (snapPage) {
      // Back over the main page, the scope applies again. The old code kept
      // the other page's elements (BUG-050 Snap scope stays on the other
      // page after the pointer comes back).
      if (this._scoped) {
        if (snapPage != this._snapMainPage) this._setEffectiveScope(snapPage);
        else this._eSnapElems = null;
      }
      if (box) {
        const column = new Rect(
          pagePoint.getX() - snapDistance,
          box.getY() - snapDistance,
          2 * snapDistance,
          box.getHeight() + 2 * snapDistance,
        );
        const row = new Rect(
          box.getX() - snapDistance,
          pagePoint.getY() - snapDistance,
          box.getWidth() + 2 * snapDistance,
          2 * snapDistance,
        );
        let elements = childrenIn(snapPage, column);
        elements = elements.concat(
          childrenIn(snapPage, row).filter((element) => elements.indexOf(element) < 0),
        );
        for (let n = 0; n < elements.length; n++) {
          const element = elements[n] as Element;
          if (element instanceof Item && !element.hasFlag(ElementFlag.Hidden)) {
            let target: Item | null = null;
            const scoped = this._getEffectiveSnapElems();
            if (scoped) {
              for (let l = 0; l < scoped.length && !target; ++l) {
                if (element == scoped[l]) target = element;
              }
            } else target = element;
            if (target) visit(target);
          }
        }
      }
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
        if (node instanceof Item) this._exclusions.push(node);
      }
    }
  }

  override isRelativeToPage(): boolean {
    return true;
  }

  override isScopeSupported(): boolean {
    return true;
  }

  /** Limits snapping to the items in the edited containers, on the active page. */
  override setScope(scope: Node[] | null): void {
    if (scope && scope.length) {
      this._snapElems = [];
      for (let t = 0; t < scope.length; ++t) {
        const node = scope[t] as Node;
        if (node.hasMixin(Container)) {
          for (
            let child = (node as ContainerNode).getFirstChild();
            null != child;
            child = child.getNext()
          ) {
            if (child instanceof Item) this._snapElems.push(child);
          }
        }
      }
      this._scoped = true;
      this._snapMainPage = this._scene.getActivePage();
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
        if (child instanceof Item) this._eSnapElems.push(child);
      }
    }
  }

  _getEffectiveSnapElems(): Item[] | null {
    return this._eSnapElems ? this._eSnapElems : this._snapElems;
  }

  override toString(): string {
    return "[Object GPointsGuide]";
  }
}

function pointX(point: GuidePoint): number {
  return (point as GuideMarker).pt ? (point as GuideMarker).pt.getX() : (point as Point).getX();
}

function pointY(point: GuidePoint): number {
  return (point as GuideMarker).pt ? (point as GuideMarker).pt.getY() : (point as Point).getY();
}
