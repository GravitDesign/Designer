// Old: chunk.vendor.js module 210 (GGuides).
import type { Color } from "../../engine/color/color.ts";
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { registerClass } from "../../engine/core/object.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { PaintContext } from "../../engine/paint/paint-context.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { SceneWidget } from "../view/scene-widget.ts";
import type { BBoxGuide } from "./bbox-guide.ts";
import { DistanceHelper } from "./distance-helper.ts";
import {
  guidePaintContext,
  type Guide,
  type GuideAxisHit,
  type GuideLine,
  type GuideMapResult,
  type GuidePoint,
  type GuideShape,
  type MapGuide,
  type VisualGuide,
} from "./guide.ts";

/** The part of the scene view (GSceneWidget / GEditorWidget) the guides use. */
export interface GuidesView {
  getScene(): Scene;
  getZoom(): number;
  getLogicalZoom(): number;
  getViewConfiguration(): { multiPageView: boolean };
  getEditor(): { getDistanceHelper(): DistanceHelper | null };
}

/** A snap visual waiting to be painted, with the page it is relative to. */
interface GuideVisualEntry {
  guide: GuideShape;
  page: Page | null;
}

/** An axis hit of mapRect with the guide index and pivot it came from. */
type IndexedHit = GuideAxisHit & { idx: number; pivotIdx: number };

/** The settings the app mirrors into the guides (snap_disabled, snap_zones, snap_guides). */
export interface GuidesOptions {
  snapDistance: number;
  visualsLength: number;
  guides: string[];
  disabled: boolean;
  zones: boolean;
}

/** GGuides.InvalidationRequestEvent: the guides ask for `area` to be repainted. */
export class GuidesInvalidationRequestEvent extends Event {
  static {
    registerClass(this, "GGuides.InvalidationRequestEvent");
  }

  declare area: Rect | null;

  constructor(area: Rect | null) {
    super();
    this.area = area;
  }

  override toString(): string {
    return "[Event GGuides.InvalidationRequestEvent]";
  }
}
(GuidesInvalidationRequestEvent.prototype as unknown as Record<string, unknown>)["area"] = null;

/**
 * The snapping pipeline of one scene: an ordered list of guides, asked in
 * order until both axes snapped (first hit per axis wins), plus the snap
 * lines they leave behind for the next paint.
 */
export class Guides extends EventTarget {
  static {
    registerClass(this, "GGuides");
  }

  static options: GuidesOptions = {
    snapDistance: 5,
    visualsLength: 10,
    guides: [],
    disabled: false,
    zones: false,
  };

  static Orientation = {
    H: 1,
    V: 2,
    O: 3,
  } as const;

  static InvalidationRequestEvent = GuidesInvalidationRequestEvent;

  _scene: Scene;
  _guides: Guide[];
  _counter: number;
  _visuals: GuideVisualEntry[];
  _area: Rect | null = null;
  _view: GuidesView | null = null;
  _bboxGuide: BBoxGuide | null = null;
  _fullPixelsGuide: Guide | null = null;

  constructor(scene: Scene) {
    super();
    this._scene = scene;
    this._guides = [];
    this._counter = 0;
    this._visuals = [];
  }

  setView(view: unknown): void {
    this._view = view && view instanceof SceneWidget ? (view as unknown as GuidesView) : null;
  }

  /** The old code returned the view itself when there was none (null). */
  isMultiPageEnabled(): boolean {
    return (this._view && this._view.getViewConfiguration().multiPageView) as boolean;
  }

  /** Starts a snapping pass; passes nest. `scope` is what is being edited. */
  beginMap(scope?: Node[] | null): void {
    if (0 == this._counter) {
      this._visuals = [];
      if (this._area && !this._area.isEmpty()) this.invalidate(this._area);
      this._area = null;
    }
    ++this._counter;
    for (let i = 0; i < this._guides.length; ++i) {
      const guide = this._guides[i] as Guide;
      if (guide.isScopeSupported()) guide.setScope(scope ?? null);
    }
  }

  /** Ends a pass; the last one invalidates the area of the snap lines it drew. */
  finishMap(): void {
    if (!(this._counter > 0)) return;
    --this._counter;
    if (0 != this._counter) return;
    if (this._visuals.length) {
      let minX: number | null = null;
      let minY: number | null = null;
      let maxX: number | null = null;
      let maxY: number | null = null;
      let valueArea: Rect | null = null;
      const addLineBounds = (line: GuidePoint[], page: Page | null): void => {
        if (line && 2 == line.length) {
          for (let k = 0; k < 2; ++k) {
            const entry = line[k] as GuidePoint;
            let point = (entry as { pt?: Point }).pt
              ? (entry as { pt: Point }).pt
              : (entry as Point);
            if (page) point = point.add(page.getPosition(this.isMultiPageEnabled()));
            let size = 0;
            if ((entry as { pt?: Point }).pt) size = 1.414216 * (entry as { size: number }).size;
            const box = new Rect(point.getX() - size, point.getY() - size, 2 * size, 2 * size);
            if (null === minX || minX > box.getX()) minX = box.getX();
            if (null === minY || minY > box.getY()) minY = box.getY();
            if (null === maxX || maxX < box.getX() + box.getWidth())
              maxX = box.getX() + box.getWidth();
            if (null === maxY || maxY < box.getY() + box.getHeight())
              maxY = box.getY() + box.getHeight();
          }
        }
      };
      const prepareGuideLine = (guide: GuideLine, page: Page | null): void => {
        const line = guide.line as Point[];
        if (
          (guide.orient == Guides.Orientation.V || guide.orient == Guides.Orientation.H) &&
          !guide.valueSegments
        ) {
          const bounds = guide.bounds;
          const sourceBounds = guide.srcBounds;
          const free: number[][] = [];
          const values: { bounds: number[] }[] = [];
          let start: number;
          let end: number;
          if (guide.orient == Guides.Orientation.V) {
            start = (line[0] as Point).getY();
            end = (line[1] as Point).getY();
          } else {
            start = (line[0] as Point).getX();
            end = (line[1] as Point).getX();
          }
          if (!guide.freeSegments && !guide.valueSegments && bounds) {
            if (sourceBounds) {
              const edges: number[] = [];
              for (let k = 0; k < bounds.length; ++k) {
                const range = bounds[k] as number[];
                edges.push(range[0] as number, range[1] as number);
              }
              edges.sort((a, b) => a - b);
              const sourceStart = sourceBounds[0] as number;
              const sourceEnd = sourceBounds[1] as number;
              let beforeFound = false;
              let afterFound = false;
              for (let k = 0; k < edges.length && !afterFound; ++k) {
                const edge = edges[k] as number;
                if (
                  sourceStart > edge &&
                  !beforeFound &&
                  (k == edges.length - 1 || (edges[k + 1] as number) >= sourceStart)
                ) {
                  free.push([start, edge]);
                  values.push({ bounds: [edge, sourceStart] });
                  beforeFound = true;
                }
                if (sourceEnd < edge && !afterFound) {
                  if (beforeFound) free.push([sourceStart, sourceEnd]);
                  else free.push([start, sourceEnd]);
                  values.push({ bounds: [sourceEnd, edge] });
                  if (edge < end) free.push([edge, end]);
                  afterFound = true;
                }
              }
              if (beforeFound || afterFound) {
                if (!afterFound && sourceStart < end) free.push([sourceStart, end]);
              } else free.push([start, end]);
            } else free.push([start, end]);
          }
          if (free && free.length) guide.freeSegments = free;
          if (values && values.length) guide.valueSegments = values;
        }
        addLineBounds(line, page);
        if (guide.valueSegments && guide.valueSegments.length) {
          const helper = (this._view as GuidesView).getEditor().getDistanceHelper();
          let valuePoint: Point;
          let valueDirection: number;
          for (let k = 0; k < guide.valueSegments.length; ++k) {
            const segment = guide.valueSegments[k] as {
              bounds: number[];
              value?: number;
              valuePt?: Point;
              valueDir?: number;
            };
            const from = segment.bounds[0] as number;
            const to = segment.bounds[1] as number;
            const value = Math.abs(to - from);
            if (helper) {
              const viewBox = helper.getValueBoxView(value);
              if (guide.orient == Guides.Orientation.V) {
                valuePoint = new Point((line[0] as Point).getX(), from + (to - from) / 2);
                valueDirection = DistanceHelper.ValueDirection.Right;
              } else {
                valuePoint = new Point(from + (to - from) / 2, (line[0] as Point).getY());
                valueDirection = DistanceHelper.ValueDirection.Down;
              }
              segment.value = value;
              segment.valuePt = valuePoint;
              segment.valueDir = valueDirection;
              let box = helper.getValueBoxScene(viewBox, valuePoint, valueDirection);
              if (page) {
                const position = page.getPosition(this.isMultiPageEnabled());
                box = new Transform().translated(position.getX(), position.getY()).mapRect(box);
              }
              valueArea = valueArea ? valueArea.united(box) : box;
            }
          }
        }
      };
      for (let k = 0; k < this._visuals.length; ++k) {
        const entry = this._visuals[k] as GuideVisualEntry;
        const guide = entry.guide;
        const page = entry.page;
        if (guide instanceof Array) addLineBounds(guide, page);
        else prepareGuideLine(guide as GuideLine, page);
      }
      const pad = Math.ceil(1 / (this._view as GuidesView).getZoom());
      // A visual whose line has fewer than two points adds no bounds; null
      // bounds coerce to 0 here, as in the old code.
      let left = Number(minX);
      let top = Number(minY);
      let right = Number(maxX);
      let bottom = Number(maxY);
      left -= pad;
      top -= pad;
      right += pad;
      bottom += pad;
      this._area = new Rect(left, top, right - left, bottom - top);
      if (valueArea) this._area = this._area.united(valueArea);
      this.invalidate(this._area);
    }
    this.cleanExclusions();
    for (let k = 0; k < this._guides.length; ++k) {
      const guide = this._guides[k] as Guide;
      if (guide.isScopeSupported()) guide.setScope(null);
    }
  }

  /**
   * Snaps a point. `mode` is a GGuide.DetailMap mode, `ids` limits the
   * guides by id, `pageRelative` says the point is relative to the active
   * page.
   */
  mapPoint(
    point: Point,
    mode?: number | null,
    ids?: string[] | null,
    pageRelative?: boolean,
  ): Point {
    let x: number | null = null;
    let y: number | null = null;
    const pointGuides: Point[] = [];
    const pointPages: (Page | null)[] = [];
    const activePage = (this._view as GuidesView).getScene().getActivePage();
    const fullPixels = this._isGuideEnabled(this._fullPixelsGuide as Guide);
    for (let i = 0; i < this._guides.length && (null === x || null === y); ++i) {
      const guide = this._guides[i] as Guide;
      if (this.canMapGuide(guide, ids, mode, fullPixels)) {
        const relative = guide.isRelativeToPage();
        const hit = (guide as MapGuide).map(
          point.getX(),
          point.getY(),
          true,
          Guides.options.snapDistance,
          this._view ? this._view.getLogicalZoom() : null,
          pageRelative,
        );
        if (hit) {
          if (hit.x && null === x) {
            x = hit.x.value;
            if (this._visuals && hit.x.guide) {
              const page = relative ? (hit.x.page ? hit.x.page : activePage) : null;
              if (hit.x.guide instanceof Point) {
                pointGuides.push(hit.x.guide);
                pointPages.push(page);
              } else this._visuals.push({ guide: hit.x.guide, page });
            }
          }
          if (hit.y && null === y) {
            y = hit.y.value;
            if (this._visuals && hit.y.guide) {
              const page = relative ? (hit.y.page ? hit.y.page : activePage) : null;
              if (hit.y.guide instanceof Point) {
                pointGuides.push(hit.y.guide);
                pointPages.push(page);
              } else this._visuals.push({ guide: hit.y.guide, page });
            }
          }
        }
      }
    }
    if (null === x) x = point.getX();
    if (null === y) y = point.getY();
    const result = new Point(x, y);
    for (let i = 0; i < pointGuides.length; ++i) {
      const target = pointGuides[i] as Point;
      if (Math.abs(x - target.getX()) >= 2 || Math.abs(y - target.getY()) >= 2) {
        this._visuals.push({ guide: [result, target], page: pointPages[i] as Page | null });
      }
    }
    return result;
  }

  /**
   * Snaps a rectangle through its top-left, bottom-right and center. The
   * bbox guide's equal-spacing check runs first; `ids` limits the guides,
   * `pageRelative` says the rect is relative to the active page.
   */
  mapRect(rect: Rect, ids?: string[] | null, pageRelative?: boolean): Rect {
    let result = rect;
    let topLeft = rect.getSide(Rect.Side.TOP_LEFT);
    let bottomRight = rect.getSide(Rect.Side.BOTTOM_RIGHT);
    let center = rect.getSide(Rect.Side.CENTER);
    const pivotsBySide: Record<string, Point> = {};
    pivotsBySide[Rect.Side.TOP_LEFT] = topLeft;
    pivotsBySide[Rect.Side.BOTTOM_RIGHT] = bottomRight;
    pivotsBySide[Rect.Side.CENTER] = center;
    const sides = Object.keys(pivotsBySide);
    let pivots = Object.values(pivotsBySide);
    let hitsX: IndexedHit[] = [];
    let hitsY: IndexedHit[] = [];
    const distanceDelta: number[] = [];
    const distanceVisualsY: GuideVisualEntry[] = [];
    const distanceVisualsX: GuideVisualEntry[] = [];
    let distanceRect: Rect | null = null;
    const multiPage = this.isMultiPageEnabled();
    const activePage = (this._view as GuidesView).getScene().getActivePage() as Page;
    const activePosition = activePage.getPosition(multiPage);
    const fullPixels = this._isGuideEnabled(this._fullPixelsGuide as Guide);
    const bboxGuide = this._getBBoxGuide();
    const zoom = (): number | null => (this._view ? this._view.getLogicalZoom() : null);
    if (
      bboxGuide &&
      this.canMapGuide(bboxGuide, ids, null, fullPixels) &&
      (distanceRect = bboxGuide.checkDistanceGuidesMapping(
        rect,
        Guides.options.snapDistance,
        zoom(),
        pageRelative,
        distanceDelta,
        distanceVisualsY,
        distanceVisualsX,
      )) &&
      (distanceVisualsY.length || distanceVisualsX.length) &&
      bboxGuide.hasPriorityDistanceFirst()
    ) {
      this._visuals = distanceVisualsY.length
        ? this._visuals.concat(distanceVisualsY)
        : this._visuals.concat(distanceVisualsX);
      return distanceRect;
    }
    // A pivot in the coordinates the guide answered in.
    const toGuideSpace = (
      pivot: Point,
      relative: boolean | undefined,
      page: Page | null | undefined,
      guide: Guide,
    ): Point => {
      let out = pivot;
      if ((relative && page) || (multiPage && page && page != activePage)) {
        if (!relative) out = out.add(activePosition);
        let origin = activePosition;
        if (multiPage && page && page != activePage) origin = page.getPosition(true);
        out = out.subtract(origin);
      } else if (!relative && !page && guide.isRelativeToPage()) out = out.add(activePosition);
      return out;
    };
    for (let t = 0; t < this._guides.length && (!hitsX.length || !hitsY.length); ++t) {
      const guide = this._guides[t] as Guide;
      if (
        !(ids && ids.indexOf(guide.getId()) < 0) &&
        this.canMapGuide(guide, ids, null, fullPixels)
      ) {
        for (let p = 0; p < pivots.length; ++p) {
          if (guide.snapZoneIsAllowed(sides[p] as string)) {
            const pivot = pivots[p] as Point;
            const hit = (guide as MapGuide).map(
              pivot.getX(),
              pivot.getY(),
              false,
              Guides.options.snapDistance,
              zoom(),
              pageRelative,
            );
            if (hit) {
              if (hit.x) {
                if (hitsX.length) {
                  const first = hitsX[0] as IndexedHit;
                  if (
                    first.idx === t &&
                    null !== first.delta &&
                    null !== hit.x.delta &&
                    (hit.x.delta as number) < (first.delta as number)
                  ) {
                    hitsX[0] = { ...hit.x, idx: t, pivotIdx: p };
                  }
                } else hitsX.push({ ...hit.x, idx: t, pivotIdx: p });
              }
              if (hit.y) {
                if (hitsY.length) {
                  const first = hitsY[0] as IndexedHit;
                  if (
                    first.idx === t &&
                    null !== first.delta &&
                    null !== hit.y.delta &&
                    (hit.y.delta as number) < (first.delta as number)
                  ) {
                    hitsY[0] = { ...hit.y, idx: t, pivotIdx: p };
                  }
                } else hitsY.push({ ...hit.y, idx: t, pivotIdx: p });
              }
            }
          }
        }
        if (
          guide === this._bboxGuide &&
          distanceRect &&
          (distanceVisualsY.length || distanceVisualsX.length) &&
          distanceDelta.length
        ) {
          let deltaX = 0;
          let deltaY = 0;
          if (hitsX.length) {
            const first = hitsX[0] as IndexedHit;
            const snapped = toGuideSpace(
              pivots[first.pivotIdx] as Point,
              pageRelative,
              first.page,
              guide,
            );
            deltaX = first.value - snapped.getX();
          }
          if (hitsY.length) {
            const first = hitsY[0] as IndexedHit;
            const snapped = toGuideSpace(
              pivots[first.pivotIdx] as Point,
              pageRelative,
              first.page,
              guide,
            );
            deltaY = first.value - snapped.getY();
          }
          if (
            distanceVisualsY.length &&
            (!deltaY || Math.abs(distanceDelta[1] as number) < Math.abs(deltaY))
          ) {
            this._visuals = this._visuals.concat(distanceVisualsY);
            return distanceRect;
          } else if (
            distanceVisualsX.length &&
            (!deltaX || Math.abs(distanceDelta[0] as number) < Math.abs(deltaX))
          ) {
            this._visuals = this._visuals.concat(distanceVisualsX);
            return distanceRect;
          }
          // When neither spacing wins, the edge snaps and the later guides
          // apply. The old code returned the unsnapped rect here (BUG-047
          // Snapping returns the unsnapped rect when equal spacing loses).
        }
      }
    }
    let shiftX = 0;
    let shiftY = 0;
    if (hitsX.length) {
      const first = hitsX[0] as IndexedHit;
      const snapped = toGuideSpace(
        pivots[first.pivotIdx] as Point,
        pageRelative,
        first.page,
        this._guides[first.idx] as Guide,
      );
      shiftX = first.value - snapped.getX();
    }
    if (hitsY.length) {
      const first = hitsY[0] as IndexedHit;
      const snapped = toGuideSpace(
        pivots[first.pivotIdx] as Point,
        pageRelative,
        first.page,
        this._guides[first.idx] as Guide,
      );
      shiftY = first.value - snapped.getY();
    }
    if (shiftX || shiftY) {
      result = rect.translated(shiftX, shiftY);
      // Map the moved rect once more to find every guide it now touches
      // exactly, for the snap lines.
      hitsY = [];
      hitsX = [];
      const shift = new Point(shiftX, shiftY);
      topLeft = topLeft.add(shift);
      bottomRight = bottomRight.add(shift);
      center = center.add(shift);
      pivots = [topLeft, bottomRight, center];
      let rangeStart: number;
      let rangeEnd: number;
      for (let t = 0; t < this._guides.length && (!hitsX.length || !hitsY.length); ++t) {
        const guide = this._guides[t] as Guide;
        if (
          !(ids && ids.indexOf(guide.getId()) < 0) &&
          this.canMapGuide(guide, ids, null, fullPixels)
        ) {
          for (let p = 0; p < pivots.length; ++p) {
            if (guide.snapZoneIsAllowed(sides[p] as string)) {
              const pivot = pivots[p] as Point;
              const hit: GuideMapResult | null | undefined = (guide as MapGuide).map(
                pivot.getX(),
                pivot.getY(),
                false,
                Guides.options.snapDistance,
                zoom(),
                pageRelative,
              );
              if (hit) {
                if (
                  hit.x &&
                  GMath.isEqualEps(hit.x.delta as number, 0) &&
                  (!hitsX.length || (hitsX[0] as IndexedHit).idx === t)
                ) {
                  if (hit.x.guide) {
                    const from = toGuideSpace(topLeft, pageRelative, hit.x.page, guide);
                    const to = toGuideSpace(bottomRight, pageRelative, hit.x.page, guide);
                    rangeStart = from.getY();
                    rangeEnd = to.getY();
                    const line = guideLinePoints(hit.x.guide);
                    if (rangeStart < pointOf(line[0] as GuidePoint).getY()) {
                      line[0] = new Point(pointOf(line[0] as GuidePoint).getX(), rangeStart);
                    }
                    if (rangeEnd > pointOf(line[1] as GuidePoint).getY()) {
                      line[1] = new Point(pointOf(line[1] as GuidePoint).getX(), rangeEnd);
                    }
                    (hit.x.guide as GuideLine).srcBounds = [rangeStart, rangeEnd];
                  }
                  hitsX.push({ ...hit.x, idx: t, pivotIdx: p });
                }
                if (
                  hit.y &&
                  GMath.isEqualEps(hit.y.delta as number, 0) &&
                  (!hitsY.length || (hitsY[0] as IndexedHit).idx === t)
                ) {
                  if (hit.y.guide) {
                    const from = toGuideSpace(topLeft, pageRelative, hit.y.page, guide);
                    const to = toGuideSpace(bottomRight, pageRelative, hit.y.page, guide);
                    rangeStart = from.getX();
                    rangeEnd = to.getX();
                    const line = guideLinePoints(hit.y.guide);
                    if (rangeStart < pointOf(line[0] as GuidePoint).getX()) {
                      line[0] = new Point(rangeStart, pointOf(line[0] as GuidePoint).getY());
                    }
                    if (rangeEnd > pointOf(line[1] as GuidePoint).getX()) {
                      line[1] = new Point(rangeEnd, pointOf(line[1] as GuidePoint).getY());
                    }
                    (hit.y.guide as GuideLine).srcBounds = [rangeStart, rangeEnd];
                  }
                  hitsY.push({ ...hit.y, idx: t, pivotIdx: p });
                }
              }
            }
          }
        }
      }
      if (this._visuals) {
        for (let t = 0; t < hitsX.length; ++t) {
          const entry = hitsX[t] as IndexedHit;
          if (this._visuals && entry.guide) {
            const owner = this._guides[entry.idx] as Guide;
            const relative = owner.isRelativeToPage();
            const page = relative ? (entry.page ? entry.page : activePage) : null;
            if (entry.guide instanceof Point) {
              const snapped = toGuideSpace(
                pivots[entry.pivotIdx] as Point,
                pageRelative,
                entry.page,
                owner,
              );
              if (
                Math.abs(entry.value - entry.guide.getX()) >= 2 ||
                Math.abs(snapped.getY() - entry.guide.getY()) >= 2
              ) {
                this._visuals.push({
                  guide: [new Point(entry.value, snapped.getY()), entry.guide],
                  page,
                });
              }
            } else this._visuals.push({ guide: entry.guide, page });
          }
        }
        for (let t = 0; t < hitsY.length; ++t) {
          const entry = hitsY[t] as IndexedHit;
          if (this._visuals && entry.guide) {
            const owner = this._guides[entry.idx] as Guide;
            const relative = owner.isRelativeToPage();
            const page = relative ? (entry.page ? entry.page : activePage) : null;
            if (entry.guide instanceof Point) {
              const snapped = toGuideSpace(
                pivots[entry.pivotIdx] as Point,
                pageRelative,
                entry.page,
                owner,
              );
              if (
                Math.abs(entry.value - entry.guide.getY()) >= 2 ||
                Math.abs(snapped.getX() - entry.guide.getX()) >= 2
              ) {
                this._visuals.push({
                  guide: [new Point(snapped.getX(), entry.value), entry.guide],
                  page,
                });
              }
            } else this._visuals.push({ guide: entry.guide, page });
          }
        }
      }
    }
    return result;
  }

  /** Paints the visual guides, then the snap lines of the last pass, and forgets them. */
  paint(transform: Transform, paintContext: PaintContext): void {
    const context = guidePaintContext(paintContext);
    let pageTransform = transform;
    if (context.configuration.multiPageView) {
      const position = (this._scene.getActivePage() as Page).getPosition(true);
      pageTransform = pageTransform.preMultiplied(
        new Transform(1, 0, 0, 1, position.getX(), position.getY()),
      );
    }
    for (let i = 0; i < this._guides.length; ++i) {
      const guide = this._guides[i] as Guide;
      if (guide.isVisual()) {
        if (guide.isRelativeToPage()) (guide as VisualGuide).paint(pageTransform, context);
        else (guide as VisualGuide).paint(transform, context);
      }
    }
    let half = 0;
    if (EditorOptions.outlineWidth % 2 != 0) half = 0.5;
    const paintLine = (
      line: GuidePoint[],
      page: Page | null,
      outline: boolean,
      color?: Color | null,
    ): void => {
      const lineColor =
        color || (outline ? EditorOptions.guideOutlineColor : EditorOptions.distanceHelperColor);
      let from: Point;
      let to: Point;
      if (page) {
        let lineTransform = transform;
        if (context.configuration.multiPageView) {
          const position = page.getPosition(true);
          lineTransform = lineTransform.preMultiplied(
            new Transform(1, 0, 0, 1, position.getX(), position.getY()),
          );
        }
        from = lineTransform.mapPoint(pointOf(line[0] as GuidePoint));
        to = lineTransform.mapPoint(pointOf(line[1] as GuidePoint));
      } else {
        from = transform.mapPoint(pointOf(line[0] as GuidePoint));
        to = transform.mapPoint(pointOf(line[1] as GuidePoint));
      }
      context.canvas.strokeLine(
        Math.floor(from.getX()) + half,
        Math.floor(from.getY()) + half,
        Math.floor(to.getX()) + half,
        Math.floor(to.getY()) + half,
        EditorOptions.outlineWidth,
        lineColor,
        false,
      );
      const start = line[0] as GuidePoint;
      const end = line[1] as GuidePoint;
      if (isMarker(start)) {
        EditorAnnotation.paintAnnotation(
          context,
          null,
          from,
          start.annot,
          false,
          start.size,
          lineColor,
          lineColor,
        );
      }
      if (isMarker(end)) {
        EditorAnnotation.paintAnnotation(
          context,
          null,
          to,
          end.annot,
          false,
          end.size,
          lineColor,
          lineColor,
        );
      }
    };
    const helper = (this._view as GuidesView).getEditor().getDistanceHelper();
    for (let i = 0; i < this._visuals.length; ++i) {
      const entry = this._visuals[i] as GuideVisualEntry;
      const page = entry.page;
      if (entry.guide instanceof Array) paintLine(entry.guide, page, true);
      else {
        const guide = entry.guide as GuideLine;
        const line = guide.line as Point[];
        if (guide.freeSegments && guide.freeSegments.length) {
          const color = guide.freeSegmentsColor ? guide.freeSegmentsColor : null;
          for (let k = 0; k < guide.freeSegments.length; ++k) {
            const segment = guide.freeSegments[k] as number[];
            paintLine(
              guide.orient == Guides.Orientation.V
                ? [
                    new Point((line[0] as Point).getX(), segment[0] as number),
                    new Point((line[0] as Point).getX(), segment[1] as number),
                  ]
                : [
                    new Point(segment[0] as number, (line[0] as Point).getY()),
                    new Point(segment[1] as number, (line[0] as Point).getY()),
                  ],
              page,
              true,
              color,
            );
          }
        }
        if (guide.valueSegments && guide.valueSegments.length) {
          let valueTransform = transform;
          if (page && context.configuration.multiPageView) {
            const position = page.getPosition(true);
            valueTransform = valueTransform.preMultiplied(
              new Transform(1, 0, 0, 1, position.getX(), position.getY()),
            );
          }
          for (let k = 0; k < guide.valueSegments.length; ++k) {
            const segment = guide.valueSegments[k] as {
              bounds: number[];
              value?: number;
              valuePt?: Point;
              valueDir?: number;
            };
            paintLine(
              guide.orient == Guides.Orientation.V
                ? [
                    new Point((line[0] as Point).getX(), segment.bounds[0] as number),
                    new Point((line[0] as Point).getX(), segment.bounds[1] as number),
                  ]
                : [
                    new Point(segment.bounds[0] as number, (line[0] as Point).getY()),
                    new Point(segment.bounds[1] as number, (line[0] as Point).getY()),
                  ],
              page,
              false,
            );
            if (null != segment.value && helper) {
              helper.paintDistanceHint(
                segment.value,
                segment.valuePt as Point,
                segment.valueDir as number,
                valueTransform,
                context,
                EditorOptions.distanceHelperColor,
              );
            }
          }
        }
      }
    }
    this._visuals = [];
  }

  /** Asks for `area` to be repainted, or the area of the last snap lines when none is given. */
  invalidate(area?: Rect | null): void {
    if (!this.hasEventListeners(GuidesInvalidationRequestEvent)) return;
    if (area && !area.isEmpty()) this.trigger(new GuidesInvalidationRequestEvent(area));
    else if (this._area && !this._area.isEmpty()) {
      this._visuals = [];
      this.trigger(new GuidesInvalidationRequestEvent(this._area));
      this._area = null;
    }
  }

  useExclusions(exclusions: Node[] | null | undefined): void {
    if (exclusions && exclusions.length) {
      for (let i = 0; i < this._guides.length; ++i) {
        (this._guides[i] as Guide).useExclusions(exclusions);
      }
    }
  }

  cleanExclusions(): void {
    for (let i = 0; i < this._guides.length; ++i) (this._guides[i] as Guide).cleanExclusions();
  }

  /**
   * The snap zone marks for `bbox` near `point`: two short lines through
   * the bbox side closest to the point, or null when no zone applies.
   */
  getBBoxSnapZones(bbox: Rect | null, point: Point): Point[][] | null {
    let zones: Point[][] | null = null;
    let zonable = false;
    for (let i = 0; i < this._guides.length && !zonable; ++i) {
      const guide = this._guides[i] as Guide;
      if (
        this.canMapGuide(guide, null, null, this._isGuideEnabled(this._fullPixelsGuide as Guide)) &&
        !(guide as MapGuide).mapTopLeftOnly()
      ) {
        zonable = true;
      }
    }
    const pick = EditorOptions.pickDistance;
    if (
      zonable &&
      bbox &&
      !bbox.isEmpty() &&
      bbox.expanded(pick, pick, pick, pick).containsPoint(point, true)
    ) {
      zones = [];
      const side = bbox.getClosestSideName(point);
      const sidePoint = bbox.getSide(side);
      const topLeft = bbox.getSide(Rect.Side.TOP_LEFT);
      const bottomRight = bbox.getSide(Rect.Side.BOTTOM_RIGHT);
      const width = Math.abs(bottomRight.getX() - topLeft.getX());
      const height = Math.abs(bottomRight.getY() - topLeft.getY());
      const length = Guides.options.visualsLength;
      const horizontal = width > 2 * length ? length : width > length ? width / 2 : width;
      let y1 = sidePoint.getY();
      let y2 = y1;
      let x1 = topLeft.getX();
      switch (side) {
        case Rect.Side.TOP_CENTER:
        case Rect.Side.CENTER:
        case Rect.Side.BOTTOM_CENTER:
          x1 = sidePoint.getX() - horizontal / 2;
          break;
        case Rect.Side.TOP_RIGHT:
        case Rect.Side.RIGHT_CENTER:
        case Rect.Side.BOTTOM_RIGHT:
          x1 = sidePoint.getX() - horizontal;
      }
      let x2 = x1 + horizontal;
      zones.push([new Point(x1, y1), new Point(x2, y2)]);
      const vertical = height > 2 * length ? length : height > length ? height / 2 : height;
      x2 = x1 = sidePoint.getX();
      y1 = topLeft.getY();
      switch (side) {
        case Rect.Side.LEFT_CENTER:
        case Rect.Side.CENTER:
        case Rect.Side.RIGHT_CENTER:
          y1 = sidePoint.getY() - vertical / 2;
          break;
        case Rect.Side.BOTTOM_LEFT:
        case Rect.Side.BOTTOM_CENTER:
        case Rect.Side.BOTTOM_RIGHT:
          y1 = sidePoint.getY() - vertical;
      }
      y2 = y1 + vertical;
      zones.push([new Point(x1, y1), new Point(x2, y2)]);
    }
    return zones;
  }

  /** Adds a guide at the end; `isBBoxGuide` marks the smart (bbox) guide. */
  addGuide(guide: Guide, isBBoxGuide?: boolean): void {
    this._guides.push(guide);
    if (isBBoxGuide) this._bboxGuide = guide as BBoxGuide;
    else if (guide.isFullPixelsGuide()) this._fullPixelsGuide = guide;
  }

  /** Whether the guide's id is in options.guides (and in `ids`, when given). */
  _isGuideEnabled(guide: Guide, ids?: string[] | null): boolean {
    const enabled = Guides.options.guides;
    return (
      !!(enabled && enabled.indexOf(guide.getId()) >= 0) &&
      (!ids || !ids.length || ids.indexOf(guide.getId()) >= 0)
    );
  }

  _getBBoxGuide(): BBoxGuide | null {
    return this._bboxGuide || null;
  }

  canMapGuide(
    guide: Guide,
    ids: string[] | null | undefined,
    mode: number | null | undefined,
    fullPixels: boolean,
  ): boolean {
    return (
      this._isGuideEnabled(guide, ids) &&
      (guide as MapGuide).isMappingAllowed(mode) &&
      (!fullPixels || guide.canMapWithFullPixelsGuide())
    );
  }

  override toString(): string {
    return "[Object GGuides]";
  }
}

function isMarker(point: GuidePoint): point is { pt: Point; annot: string; size: number } {
  return !!(point as { pt?: Point }).pt;
}

/** The point of a guide line entry (`e.pt ? e.pt : e` in the old code). */
export function pointOf(point: GuidePoint): Point {
  return isMarker(point) ? point.pt : point;
}

/** The points of a guide: its line, or the guide itself when it is a pair of points. */
function guideLinePoints(guide: GuideShape): GuidePoint[] {
  const line = (guide as GuideLine).line;
  return line ? line : (guide as unknown as GuidePoint[]);
}
