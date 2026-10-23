// Old: chunk.vendor.js module 60 (GPath).
/**
 * The editable path, node "path": anchor points saved as `pts`, `closed`,
 * and the path edits the tools use (inserting a point at a hit,
 * knife intersections, closing a path whose ends meet).
 */
import { Locale } from "../core/locale/locale.ts";
import { each } from "../core/util.ts";
import type { PolyLine } from "../geometry/boolean/poly-segments.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import { Canvas2DPaintCanvas } from "../paint/paint-canvas.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import type { Effects } from "../style/effects.ts";
import type { PaintLayers } from "../style/paint-layers.ts";
import { StyleLayer } from "../style/stylable-sets.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import type { ContainerNode } from "./node-container.ts";
import { Node, registerNodeClass } from "./node.ts";
import { AnchorPoint, PathBase, type AnchorPoints, type PathPivot } from "./path-base.ts";
import { Shape } from "./shape.ts";

const GeometryProperties = {
  closed: false,
};

const MetaProperties = {
  rtxt: null,
};

const VisualProperties = {};

const Type = AnchorPoint.Type;

/** What insertHitPoint needs from a hit (GHitResult or the knife's equivalent). */
export interface PathHit {
  segment: number | null;
  slope: number | null;
  x?: number | null;
  y?: number | null;
}

/** One knife intersection as GPath.addIntersectionPoints reads it. */
export interface PathIntersection {
  pt: Point;
  polySeg0: PolyLine;
  polySeg1: PolyLine;
  slope0: number;
  slope1: number;
}

/** An intersection on one of the two paths, sorted by segment and slope. */
interface SortedIntersection {
  pt: Point;
  seg: number;
  slope: number;
}

/**
 * The selected anchor points. The old code asked the selector engine
 * (`queryAll(":selected")`, engine-scene-document); until that exists,
 * the anchor points (which have no children) are filtered directly.
 */
function selectedAnchorPoints(points: AnchorPoints): Node[] {
  const query = (points as unknown as { queryAll?: (selector: string) => Node[] }).queryAll;
  if ("function" == typeof query) return query.call(points, ":selected");
  return points.getChildren().filter((point) => point.hasFlag(NodeFlag.Selected));
}

export class Path extends PathBase {
  static {
    registerNodeClass(this, "path", "GPath");
  }

  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override MetaProperties: Readonly<Record<string, unknown>> = MetaProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;

  declare $rtxt: unknown;

  constructor(closed?: boolean, evenOdd?: boolean, anchorPoints?: AnchorPoints | null) {
    super(evenOdd, anchorPoints);
    this._setDefaultProperties(GeometryProperties);
    if (closed) this.setProperty("closed", closed);
    this._paintSharp = true;
  }

  /** A copy that keeps which anchor points are selected. */
  override clone(
    options?: Parameters<PathBase["clone"]>[0],
    constructorArg?: unknown,
  ): this | null {
    const copy = super.clone(options, constructorArg);
    if (copy) {
      const selected = selectedAnchorPoints(this.getAnchorPoints());
      for (let i = 0; i < selected.length; ++i) {
        const index = this.getAnchorPoints().getIndexOfChild(selected[i] as Node);
        const point = copy.getAnchorPoints().getChildByIndex(index);
        if (point) point.setFlag(NodeFlag.Selected);
      }
    }
    return copy;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GPath", "name", this.getNodeName()) as string;
  }

  override assignFrom(other: Node): void {
    if (other instanceof Path) this.transferProperties(other, [GeometryProperties]);
    super.assignFrom(other);
  }

  override validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    void reference;
    return (
      "layer" === Node.getName(parent) ||
      "group" === Node.getName(parent) ||
      "page" === Node.getName(parent) ||
      parent instanceof Shape ||
      "compoundpath.paths" === Node.getName(parent) ||
      "[GSymbol]" === parent.toString()
    );
  }

  /**
   * The corner points mapped by `trf`; with `details`, every point with
   * its type and auto-handle flag.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override findPivots(details?: unknown, area?: unknown): unknown[] | null {
    let pivots: (Point | PathPivot)[] | null = null;
    const trf = this.$trf;
    for (
      let point = this.getAnchorPoints().getFirstChild();
      point;
      point = point.getNext() as AnchorPoint | null
    ) {
      const type = point.$tp;
      if (details || (type != Type.Symmetric && type != Type.Mirror)) {
        const position = new Point(point.$x, point.$y);
        let pivot: Point | PathPivot = trf ? trf.mapPoint(position) : position;
        if (details) pivot = { point: pivot, ptType: type, autoH: point.$ah };
        if (pivots) pivots.push(pivot);
        else pivots = [pivot];
      }
    }
    return pivots;
  }

  /** The middle of segment `segment` of the unstyled outline, mapped by `trf`. */
  getSegmentMiddle(segment: number): Point | null {
    const vertices = new VertexContainer();
    this.getAnchorPoints()._generateVertices(vertices, this.$trf, false);
    return VertexInfo.getSegmentPoint(vertices, segment, 0.5);
  }

  /** Two points without curve handles. */
  isLine(): boolean {
    const first = this.getAnchorPoints().getFirstChild();
    if (!first) return false;
    const second = first.getNext() as AnchorPoint | null;
    if (!second) return false;
    if (second.getNext()) return false;
    const x1 = first.getProperty("x") as number;
    const y1 = first.getProperty("y") as number;
    const hrx = first.getProperty("hrx") as number | null;
    const hry = first.getProperty("hry") as number | null;
    if (!(null == hrx || null == hry || (GMath.isEqualEps(hrx, x1) && GMath.isEqualEps(hry, y1)))) {
      return false;
    }
    const x2 = second.getProperty("x") as number;
    const y2 = second.getProperty("y") as number;
    const hlx = second.getProperty("hlx") as number | null;
    const hly = second.getProperty("hly") as number | null;
    return !!(
      null == hlx ||
      null == hly ||
      (GMath.isEqualEps(hlx, x2) && GMath.isEqualEps(hly, y2))
    );
  }

  /** Points on one straight line, without curve handles. */
  isMultiPointsLine(): boolean {
    const first = this.getAnchorPoints().getFirstChild();
    if (!first) return false;
    const second = first.getNext() as AnchorPoint | null;
    if (!second) return false;
    if (!second.getNext()) return this.isLine();
    let x: number;
    let y: number;
    let hrx: number | null;
    let hry: number | null;
    let hlx: number | null;
    let hly: number | null;
    let point: AnchorPoint | null = first;
    const x1 = first.getProperty("x") as number;
    const x2 = second.getProperty("x") as number;
    const y1 = first.getProperty("y") as number;
    const y2 = second.getProperty("y") as number;
    do {
      x = point.getProperty("x") as number;
      y = point.getProperty("y") as number;
      hrx = point.getProperty("hrx") as number | null;
      hry = point.getProperty("hry") as number | null;
      hlx = point.getProperty("hlx") as number | null;
      hly = point.getProperty("hly") as number | null;
      if (!(
        null == hrx ||
        null == hry ||
        null == hlx ||
        null == hly ||
        (GMath.isEqualEps(hrx, x) &&
          GMath.isEqualEps(hry, y) &&
          GMath.isEqualEps(hlx, x) &&
          GMath.isEqualEps(hly, y))
      )) {
        return false;
      }
      if (point !== first && point !== second) {
        const cross = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1);
        if (!GMath.isEqualEps(cross, 0)) return false;
      }
    } while ((point = point.getNext() as AnchorPoint | null));
    return true;
  }

  /**
   * Inserts an anchor point where `hit` lies (segment number from 1,
   * slope strictly between 0 and 1), splitting the curve so the shape
   * stays the same. Returns the new point, or null.
   */
  insertHitPoint(hit: PathHit | null | undefined): AnchorPoint | null {
    if (!hit || !hit.slope || GMath.isEqualEps(hit.slope, 0) || GMath.isEqualEps(hit.slope, 1)) {
      return null;
    }
    const t = hit.slope;
    let counter = 1;
    let point = this.getAnchorPoints().getFirstChild();
    for (; null != point && counter < (hit.segment as number);) {
      point = point.getNext() as AnchorPoint | null;
      counter++;
    }
    const start = point;
    const end = start ? this.getAnchorPoints().getNextPoint(start) : null;
    if (!(start && end)) return null;
    this.beginUpdate();
    start.setProperty("ah", false);
    end.setProperty("ah", false);
    const startType = start.getProperty("tp");
    const endType = end.getProperty("tp");
    const type =
      startType == Type.Connector ||
      startType == Type.Symmetric ||
      startType == Type.Mirror ||
      endType == Type.Connector ||
      endType == Type.Symmetric ||
      endType == Type.Mirror ||
      (startType == Type.Asymmetric && endType == Type.Asymmetric)
        ? Type.Asymmetric
        : startType != Type.Symmetric &&
            startType != Type.Mirror &&
            startType != Type.Connector &&
            startType != Type.Asymmetric
          ? startType
          : endType;
    let inserted: AnchorPoint;
    const x1 = start.getProperty("x") as number;
    const y1 = start.getProperty("y") as number;
    let hrx = start.getProperty("hrx") as number | null;
    let hry = start.getProperty("hry") as number | null;
    const x2 = end.getProperty("x") as number;
    const y2 = end.getProperty("y") as number;
    let hlx = end.getProperty("hlx") as number | null;
    let hly = end.getProperty("hly") as number | null;
    const noStartHandle =
      null == hrx || null == hry || (GMath.isEqualEps(hrx, x1) && GMath.isEqualEps(hry, y1));
    const noEndHandle =
      null == hlx || null == hly || (GMath.isEqualEps(hlx, x2) && GMath.isEqualEps(hly, y2));
    if (noStartHandle && noEndHandle) {
      (inserted = new AnchorPoint()).setProperties(
        ["x", "y", "tp"],
        [x1 + t * (x2 - x1), y1 + t * (y2 - y1), type],
      );
      this.getAnchorPoints().insertChild(inserted, end);
    } else if (noStartHandle || noEndHandle) {
      // A quadratic segment: split it and raise both halves to cubics.
      const controlX = (noStartHandle ? hlx : hrx) as number;
      const controlY = (noStartHandle ? hly : hry) as number;
      const leftX = new Float64Array(3);
      const leftY = new Float64Array(3);
      const rightX = new Float64Array(3);
      const rightY = new Float64Array(3);
      GMath.divideQuadraticCurve(x1, controlX, x2, t, leftX, rightX);
      GMath.divideQuadraticCurve(y1, controlY, y2, t, leftY, rightY);
      (inserted = new AnchorPoint()).setProperties(["x", "y", "tp"], [leftX[2], leftY[2], type]);
      this.getAnchorPoints().insertChild(inserted, end);
      const L = (array: Float64Array, i: number) => array[i] as number;
      if (noStartHandle) {
        if (
          GMath.isEqualEps(L(leftX, 1), L(leftX, 2)) &&
          GMath.isEqualEps(L(leftY, 1), L(leftY, 2))
        ) {
          inserted.setProperties(["hlx", "hly"], [null, null]);
        } else inserted.setProperties(["hlx", "hly"], [leftX[1], leftY[1]]);
        hrx = L(rightX, 0) + (2 / 3) * (L(rightX, 1) - L(rightX, 0));
        hry = L(rightY, 0) + (2 / 3) * (L(rightY, 1) - L(rightY, 0));
        hlx = L(rightX, 2) + (2 / 3) * (L(rightX, 1) - L(rightX, 2));
        hly = L(rightY, 2) + (2 / 3) * (L(rightY, 1) - L(rightY, 2));
        if (GMath.isEqualEps(hrx, L(rightX, 0)) && GMath.isEqualEps(hry, L(rightY, 0))) {
          inserted.setProperties(["hrx", "hry"], [null, null]);
        } else inserted.setProperties(["hrx", "hry"], [hrx, hry]);
        if (GMath.isEqualEps(hlx, L(rightX, 2)) && GMath.isEqualEps(hly, L(rightY, 2))) {
          end.setProperties(["hlx", "hly"], [null, null]);
        } else end.setProperties(["hlx", "hly"], [hlx, hly]);
      } else {
        if (
          GMath.isEqualEps(L(rightX, 0), L(rightX, 1)) &&
          GMath.isEqualEps(L(rightY, 0), L(rightY, 1))
        ) {
          inserted.setProperties(["hrx", "hry"], [null, null]);
        } else inserted.setProperties(["hrx", "hry"], [rightX[1], rightY[1]]);
        hrx = L(leftX, 0) + (2 / 3) * (L(leftX, 1) - L(leftX, 0));
        hry = L(leftY, 0) + (2 / 3) * (L(leftY, 1) - L(leftY, 0));
        hlx = L(leftX, 2) + (2 / 3) * (L(leftX, 1) - L(leftX, 2));
        hly = L(leftY, 2) + (2 / 3) * (L(leftY, 1) - L(leftY, 2));
        if (GMath.isEqualEps(hlx, L(leftX, 2)) && GMath.isEqualEps(hly, L(leftY, 2))) {
          inserted.setProperties(["hlx", "hly"], [null, null]);
        } else inserted.setProperties(["hlx", "hly"], [hlx, hly]);
        if (GMath.isEqualEps(hrx, L(leftX, 0)) && GMath.isEqualEps(hry, L(leftY, 0))) {
          start.setProperties(["hrx", "hry"], [null, null]);
        } else start.setProperties(["hrx", "hry"], [hrx, hry]);
      }
    } else {
      // A cubic segment: de Casteljau split.
      const leftX = new Float64Array(4);
      const leftY = new Float64Array(4);
      const rightX = new Float64Array(4);
      const rightY = new Float64Array(4);
      const c1x = hrx as number;
      const c1y = hry as number;
      const c2x = hlx as number;
      const c2y = hly as number;
      GMath.getCtrlPtsCasteljau(x1, c1x, c2x, x2, t, 1, leftX);
      GMath.getCtrlPtsCasteljau(y1, c1y, c2y, y2, t, 1, leftY);
      GMath.getCtrlPtsCasteljau(x1, c1x, c2x, x2, t, 2, rightX);
      GMath.getCtrlPtsCasteljau(y1, c1y, c2y, y2, t, 2, rightY);
      const L = (array: Float64Array, i: number) => array[i] as number;
      if (GMath.isEqualEps(L(leftX, 1), x1) && GMath.isEqualEps(L(leftY, 1), y1)) {
        start.setProperties(["hrx", "hry"], [null, null]);
      } else start.setProperties(["hrx", "hry"], [leftX[1], leftY[1]]);
      (inserted = new AnchorPoint()).setProperties(["x", "y", "tp"], [leftX[3], leftY[3], type]);
      this.getAnchorPoints().insertChild(inserted, end);
      if (
        GMath.isEqualEps(L(leftX, 2), L(leftX, 3)) &&
        GMath.isEqualEps(L(leftY, 2), L(leftY, 3))
      ) {
        inserted.setProperties(["hlx", "hly"], [null, null]);
      } else inserted.setProperties(["hlx", "hly"], [leftX[2], leftY[2]]);
      if (
        GMath.isEqualEps(L(rightX, 0), L(rightX, 1)) &&
        GMath.isEqualEps(L(rightY, 0), L(rightY, 1))
      ) {
        inserted.setProperties(["hrx", "hry"], [null, null]);
      } else inserted.setProperties(["hrx", "hry"], [rightX[1], rightY[1]]);
      if (
        GMath.isEqualEps(L(rightX, 2), L(rightX, 3)) &&
        GMath.isEqualEps(L(rightY, 2), L(rightY, 3))
      ) {
        end.setProperties(["hlx", "hly"], [null, null]);
      } else end.setProperties(["hlx", "hly"], [rightX[2], rightY[2]]);
    }
    this.endUpdate();
    return inserted;
  }

  /**
   * An open path whose last point lies on the first (same type, no
   * overlapping handles) is closed: the last point is removed and its
   * left handle moves to the first point.
   */
  correctClosedAttribute(): void {
    const first = this.getAnchorPoints().getFirstChild() as AnchorPoint;
    const last = this.getAnchorPoints().getLastChild() as AnchorPoint;
    if (
      first == last ||
      !GMath.isEqualEps(first.getProperty("x") as number, last.getProperty("x") as number) ||
      !GMath.isEqualEps(first.getProperty("y") as number, last.getProperty("y") as number) ||
      first.getProperty("tp") !== last.getProperty("tp") ||
      (null !== first.getProperty("hlx") && null !== first.getProperty("hly")) ||
      (null !== last.getProperty("hrx") && null !== last.getProperty("hry"))
    ) {
      return;
    }
    this.beginUpdate();
    first.setProperties(["hlx", "hly"], [last.getProperty("hlx"), last.getProperty("hly")]);
    this.getAnchorPoints().removeChild(last);
    if (!this.$closed) this.setProperty("closed", true);
    this.endUpdate();
  }

  /** For straight lines through several points: the angle of the (at least 1 wide) source box. */
  override getAngle(): number | null {
    if (!this.isMultiPointsLine()) return super.getAngle();
    let angle = 0;
    let box = this.getSourceBBox();
    if (box) {
      const width = box.getWidth();
      const height = box.getHeight();
      if (width < 1 || height < 1) {
        box = new Rect(box.getX(), box.getY(), width > 0 ? width : 1, height > 0 ? height : 1);
      }
      let left = box.getSide(Rect.Side.BOTTOM_LEFT);
      let right = box.getSide(Rect.Side.BOTTOM_RIGHT);
      if (this.$trf) {
        left = this.$trf.mapPoint(left);
        right = this.$trf.mapPoint(right);
      }
      if (
        (angle = GMath.normalizeAngleRadians(
          -Math.atan2(right.getY() - left.getY(), right.getX() - left.getX()),
        )) > Math.PI
      ) {
        angle -= GMath.PI2;
      }
    }
    return angle;
  }

  /** Saves `closed`, `rtxt` and `pts`; old files with `rtxt` but no `refs` get it as `refs`. */
  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.PrepareRestore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (Object.prototype.hasOwnProperty.call(blob, "rtxt")) {
        if (!Object.prototype.hasOwnProperty.call(blob, "refs")) blob["refs"] = blob["rtxt"];
      }
    } else if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, GeometryProperties);
      this.storeProperties(blob, MetaProperties);
      blob["pts"] = this.getAnchorPoints().serialize();
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, GeometryProperties);
      this.restoreProperties(blob, MetaProperties);
      if (Object.prototype.hasOwnProperty.call(blob, "pts")) {
        this.getAnchorPoints().deserialize(blob["pts"] as unknown[]);
      }
    }
    super._handleChange(change, args);
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    this._handleGeometryChangeForProperties(change, args, PathBase.GeometryProperties);
  }

  override _requireMiterLimitApproximation(): unknown {
    return !this.isLine();
  }

  /**
   * Inserts the knife `intersections` into paths `a` and `b` and returns,
   * per path, the anchor points at the intersections (copies mapped by
   * `trf` for transformed paths). Intersections that land on an existing
   * point use it when `useExisting`; otherwise, or when there is none,
   * the result is null.
   */
  static addIntersectionPoints(
    a: Path | null,
    b: Path | null,
    intersections: readonly PathIntersection[],
    useExisting?: boolean,
  ): AnchorPoint[][] | null {
    let slope: number;
    let segment: number;
    const result: AnchorPoint[][] = [];
    const paths = [a, b];
    const order = (x: SortedIntersection, y: SortedIntersection) =>
      x.seg < y.seg ? -1 : x.seg > y.seg ? 1 : x.slope - y.slope;
    for (let side = 0; side < paths.length; side++) {
      const path = paths[side];
      let inverse: Transform | null = null;
      if (!path) continue;
      if (path.$trf) inverse = path.$trf.inverted();
      let added = 0;
      let lastSegment: number | undefined = undefined;
      let lastSlope: number | undefined = undefined;
      let repeat: number | undefined = undefined;
      const points: AnchorPoint[] = [];
      const sorted: SortedIntersection[] = [];
      for (let i = 0; i < intersections.length; i++) {
        const intersection = intersections[i] as PathIntersection;
        const record = intersection as unknown as Record<string, unknown>;
        sorted.push({
          pt: intersection.pt,
          seg: (record["polySeg" + side] as PolyLine).seg,
          slope: record["slope" + side] as number,
        });
      }
      sorted.sort(order);
      for (let i = 0; i < sorted.length; i++) {
        let point: AnchorPoint | null;
        const entry = sorted[i] as SortedIntersection;
        if (lastSegment === entry.seg) {
          if (repeat) {
            slope = (entry.slope - (lastSlope as number)) / (1 - (lastSlope as number));
            segment = repeat++;
          } else {
            slope = (entry.slope - (lastSlope as number)) / (1 - (lastSlope as number));
            segment = entry.seg + added;
          }
        } else {
          repeat = 0;
          slope = entry.slope;
          segment = entry.seg + added;
        }
        const hit = { segment, x: entry.pt.getX(), y: entry.pt.getY(), slope };
        if ((point = path.insertHitPoint(hit))) {
          added++;
          if (point === path.getAnchorPoints().getFirstChild()) repeat = 1;
          if (inverse) {
            const local = inverse.mapPoint(entry.pt);
            point.setProperty("x", local.getX());
            point.setProperty("y", local.getY());
            point = point._getTransformedCopy(path.$trf as Transform);
          } else {
            point.setProperty("x", entry.pt.getX());
            point.setProperty("y", entry.pt.getY());
          }
        } else {
          if (useExisting) {
            let existing = path.getAnchorPoints().getFirstChild();
            if (!existing) return null;
            const local = inverse ? inverse.mapPoint(entry.pt) : entry.pt;
            do {
              if (
                GMath.isEqualEps(existing.$x, local.getX(), 0) &&
                GMath.isEqualEps(existing.$y, local.getY(), 0)
              ) {
                point = inverse ? existing._getTransformedCopy(path.$trf as Transform) : existing;
                break;
              }
              existing = existing.getNext() as AnchorPoint | null;
            } while (existing);
          }
          if (!point) return null;
        }
        points.push(point);
        lastSegment = entry.seg;
        lastSlope = entry.slope;
      }
      result.push(points);
    }
    return result;
  }

  /**
   * Like GShape's, but a straight line's butt or square cap only adds the
   * border padding across the line (and the cap along it).
   */
  override _calculatePaintBBox(arg?: unknown, includeInvisible?: unknown): Rect | null {
    const geometry = this.getGeometryBBox(includeInvisible);
    if (!geometry) return null;
    const effects = this.getEffects() as Effects;
    let paint = geometry;
    const scaleBox = new Rect(
      geometry.getX(),
      geometry.getY(),
      geometry.getWidth(),
      geometry.getHeight(),
    );
    if (this.hasStyleFill()) {
      // The old code passes a box where the effects expect a scale; kept.
      const fill = effects.getEffectsBBox(geometry, StyleLayer.Fill, scaleBox as unknown as number);
      paint = paint.united(fill);
    }
    let borders: Rect | null = null;
    if (this.hasStyleBorder()) {
      each((this.getPaintLayers() as PaintLayers).getBorderLayers(true), (_index, border) => {
        let box = geometry;
        const padding = this.getStyleBorderPadding(border);
        if (padding) {
          if (this.isLine()) {
            let left = padding;
            let top = padding;
            let right = padding;
            let bottom = padding;
            if (
              border.$_blc === Canvas2DPaintCanvas.LineCap.Butt ||
              border.$_blc === Canvas2DPaintCanvas.LineCap.Square
            ) {
              const first = this.getAnchorPoints().getFirstChild() as AnchorPoint;
              const second = first.getNext() as AnchorPoint;
              let start = new Point(
                first.getProperty("x") as number,
                first.getProperty("y") as number,
              );
              let end = new Point(
                second.getProperty("x") as number,
                second.getProperty("y") as number,
              );
              if (this.$trf) {
                start = this.$trf.mapPoint(start);
                end = this.$trf.mapPoint(end);
              }
              const angle = GMath.normalizeAngleRadians(
                -Math.atan2(end.getY() - start.getY(), end.getX() - start.getX()),
              );
              left = right = padding * Math.abs(Math.sin(angle));
              bottom = top = padding * Math.abs(Math.cos(angle));
              if (border.$_blc === Canvas2DPaintCanvas.LineCap.Square) {
                const half = border.$_bw / 2;
                const cap = GMath.normalizePoint(end.subtract(start)).scale(half);
                left += Math.abs(cap.getX());
                top += Math.abs(cap.getY());
                right += Math.abs(cap.getX());
                bottom += Math.abs(cap.getY());
              }
            }
            box = box.expanded(left, top, right, bottom);
          } else box = box.expanded(padding, padding, padding, padding);
        }
        box = this._calculateMarkersBorderBBox(box, border);
        const withEffects = effects.getEffectsBBox(
          box,
          StyleLayer.Border,
          box as unknown as number,
        );
        paint = paint.united(withEffects);
        borders = borders ? borders.united(box) : box;
      });
    }
    return (paint = effects.getEffectsBBox(
      paint,
      null,
      (borders || scaleBox) as unknown as number,
    ));
  }

  override toString(): string {
    return "[GPath]";
  }
}
