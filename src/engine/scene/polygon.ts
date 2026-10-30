// Old: chunk.vendor.js module 284 (GPolygon).
/**
 * The polygon and star, node "polygon": `pts` outer points on a circle of
 * radius `or` around (`cx`, `cy`) starting at angle `oa`, each followed
 * by an inner point on radius `ir`, turned by `ia` - `oa`. Outer and
 * inner corners have their own corner type and radius. A regular polygon
 * is a star whose inner points lie on the edges (isPlainEdges). The
 * anchor points are generated and not saved.
 */
import { Locale } from "../core/locale/locale.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import type { Transform, TransformDecomposition } from "../math/transform.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import type { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { NodeChange } from "./node-change.ts";
import { registerNodeClass, type Node } from "./node.ts";
import { AnchorPoint, PathBase } from "./path-base.ts";
import { miterLimitOfPoints } from "./rectangle.ts";

const GeometryProperties = {
  pts: 6,
  cx: 0,
  cy: 0,
  or: 0,
  ir: 0,
  oa: 0,
  ia: GMath.PI2 - Math.PI / 3,
  oct: PathBase.CornerType.Rounded,
  ict: PathBase.CornerType.Rounded,
  ocr: 0,
  icr: 0,
};

const VisualProperties = {};

/**
 * Called per point with its position, whether it is an inner point and
 * its angle; returning true stops the iteration.
 */
export type PolygonSegmentVisitor = (point: Point, inner: boolean, angle: number) => unknown;

export class Polygon extends PathBase {
  static {
    registerNodeClass(this, "polygon", "GPolygon");
  }

  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;

  declare $pts: number;
  declare $cx: number;
  declare $cy: number;
  declare $or: number;
  declare $ir: number;
  declare $oa: number;
  declare $ia: number;
  declare $oct: string;
  declare $ict: string;
  declare $ocr: number;
  declare $icr: number;

  constructor() {
    super();
    this.$closed = true;
    this._setDefaultProperties(GeometryProperties);
    this._paintSharp = true;
  }

  /** Scales the corner radii of `target` by the square root of the transform's area scale. */
  override _transformStyledCorners(target: PathBase, transform: Transform): void {
    const scale = (transform.decomposed() as TransformDecomposition).scale.getMatrix();
    const area = Math.abs((scale[0] as number) * (scale[3] as number));
    const factor = GMath.isEqualEps(area, 1) ? 1 : Math.sqrt(area);
    if (!GMath.isEqualEps(factor, 1)) {
      target.setProperties(
        ["ocr", "icr"],
        [
          (this.getProperty("ocr") as number) * factor,
          (this.getProperty("icr") as number) * factor,
        ],
      );
    }
  }

  override transferStyledCorners(target: PathBase): void {
    if (target instanceof Polygon) {
      target.setProperties(["ocr", "icr"], [this.getProperty("ocr"), this.getProperty("icr")]);
    }
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GPolygon", "name", this.getNodeName()) as string;
  }

  /** The border's miter limit, raised so that every other corner stays mitered. */
  override calculateMitterLimit(border: BorderPaintLayer): number {
    const points: Point[] = [];
    this.iterateSegments((point) => {
      points.push(point);
    }, true);
    return miterLimitOfPoints(points, border.$_bml as number);
  }

  /** Calls `visitor` for each outer point and the inner point after it, mapped by `trf` when `transformed`. */
  iterateSegments(visitor: PolygonSegmentVisitor, transformed?: boolean): void {
    const stop = this.$oa + GMath.PI2;
    const step = GMath.PI2 / this.$pts;
    const innerOffset = this.$ia - this.$oa;
    const transform = transformed ? this.$trf : null;
    for (let angle = this.$oa; angle < stop - 1e-6; angle += step) {
      let point = new Point(
        this.$or * Math.cos(angle) + this.$cx,
        this.$or * Math.sin(angle) + this.$cy,
      );
      if (transform) point = transform.mapPoint(point);
      if (true === visitor(point, false, angle)) break;
      point = new Point(
        this.$ir * Math.cos(angle + innerOffset) + this.$cx,
        this.$ir * Math.sin(angle + innerOffset) + this.$cy,
      );
      if (transform) point = transform.mapPoint(point);
      if (true === visitor(point, true, angle + innerOffset)) break;
    }
  }

  /** The first outer point, the inner point after it and the second outer point. */
  private _firstThreePoints(transformed?: boolean): [Point | null, Point | null, Point | null] {
    let first: Point | null = null;
    let inner: Point | null = null;
    let second: Point | null = null;
    let count = 0;
    this.iterateSegments((point, isInner) => {
      if (0 !== count || isInner) {
        if (1 === count && isInner) inner = point;
        else {
          if (2 !== count || isInner) return true;
          second = point;
        }
      } else first = point;
      ++count;
      return false;
    }, transformed);
    return [first, inner, second];
  }

  /** Whether the inner points lie on the edges (a plain polygon, not a star). */
  isPlainEdges(): boolean {
    const [first, inner, second] = this._firstThreePoints();
    return !!(
      first &&
      inner &&
      second &&
      GMath.sqrSegmentDist(
        first.getX(),
        first.getY(),
        second.getX(),
        second.getY(),
        inner.getX(),
        inner.getY(),
      ) <= 1e-6
    );
  }

  /** The shorter distance from the first inner point to its two outer neighbours, after `trf`. */
  getPointsMinDistance(): number {
    let distance = 0;
    const [first, inner, second] = this._firstThreePoints(true);
    if (first && inner && second) {
      distance = Math.min(
        GMath.ptDist(inner.getX(), inner.getY(), first.getX(), first.getY()),
        GMath.ptDist(inner.getX(), inner.getY(), second.getX(), second.getY()),
      );
    }
    return distance;
  }

  override assignFrom(other: Node): void {
    if (other instanceof Polygon) this.transferProperties(other, [GeometryProperties]);
    super.assignFrom(other);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, GeometryProperties);
      this._invalidatePath();
    }
    if (
      this._canHandleGeometryChangeForProperties(change, args, GeometryProperties) &&
      change == NodeChange.AfterPropertiesChange &&
      !this.isRecordedTransaction() &&
      // While restoring, the Restore change builds them once all properties are back.
      !this._isRestoring
    ) {
      this._invalidatePath();
    }
    this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    super._handleChange(change, args);
  }

  /** Rebuilds the anchor points from the polygon properties. */
  _invalidatePath(): void {
    const points = this.getAnchorPoints();
    this.beginUpdate();
    points._beginBlockCompositeEvents(true, true, true);
    try {
      points.clearChildren();
      this.iterateSegments((point, inner) => {
        const anchor = new AnchorPoint();
        anchor.setProperties(
          ["tp", "x", "y", "cl", "cr"],
          [
            inner ? this.$ict : this.$oct,
            point.getX(),
            point.getY(),
            inner ? this.$icr : this.$ocr,
            inner ? this.$icr : this.$ocr,
          ],
        );
        points.appendChild(anchor);
      });
    } finally {
      this.endUpdate();
      points._endBlockCompositeEvents(true, true, true);
    }
  }

  /** The center (`cx`, `cy`), mapped by `trf` when `transformed`. */
  override getCenter(transformed?: unknown): Point | null {
    let center = new Point(this.$cx, this.$cy);
    if (transformed && this.$trf) center = this.$trf.mapPoint(center);
    return center;
  }

  override getOrigHalfWidth(): number {
    return this.$or >= this.$ir ? this.$or : this.$ir;
  }

  override getOrigHalfHeight(): number {
    return this.$or >= this.$ir ? this.$or : this.$ir;
  }

  override _requireMiterLimitApproximation(): unknown {
    return true;
  }

  override toString(): string {
    return "[GPolygon]";
  }
}
