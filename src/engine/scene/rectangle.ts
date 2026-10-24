// Old: chunk.vendor.js module 73 (GRectangle).
/**
 * The rectangle, node "rectangle": the unit square from (-1, -1) to
 * (1, 1) mapped by `trf`, with four styled corners. Its anchor points are
 * generated from the corner properties and never saved; the file holds
 * only the corners, compactly: `uf`, `ct`, `sl` when all four corners are
 * the same, else `<side>uf`, `<side>ct` and `<side>sl` ([sx, sy]) per
 * corner.
 *
 * With `uf` (uniform), changing the radius or type of one corner sets
 * all four; a corner with `<side>_uf` keeps its x and y radius equal.
 */
import { Locale } from "../core/locale/locale.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect, type RectSide } from "../math/rect.ts";
import type { Transform, TransformDecomposition } from "../math/transform.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import type { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { NodeChange } from "./node-change.ts";
import type { PropertiesChangeArgs } from "./node-properties.ts";
import { registerNodeClass, type Node } from "./node.ts";
import { AnchorPoint, PathBase } from "./path-base.ts";

const GeometryProperties = {
  uf: true,
  tl_uf: true,
  tl_ct: PathBase.CornerType.Rounded,
  tl_sx: 0,
  tl_sy: 0,
  tr_uf: true,
  tr_ct: PathBase.CornerType.Rounded,
  tr_sx: 0,
  tr_sy: 0,
  br_uf: true,
  br_ct: PathBase.CornerType.Rounded,
  br_sx: 0,
  br_sy: 0,
  bl_uf: true,
  bl_ct: PathBase.CornerType.Rounded,
  bl_sx: 0,
  bl_sy: 0,
};

const VisualProperties = {};

/** The corners in drawing order. */
const SIDES: readonly RectSide[] = [
  Rect.Side.TOP_LEFT,
  Rect.Side.TOP_RIGHT,
  Rect.Side.BOTTOM_RIGHT,
  Rect.Side.BOTTOM_LEFT,
];

/** The property prefix of a corner ("tl", "tr", "br", "bl"). */
function getGeometryPropertiesSidePrefix(side: RectSide): string {
  switch (side) {
    case Rect.Side.TOP_LEFT:
      return "tl";
    case Rect.Side.TOP_RIGHT:
      return "tr";
    case Rect.Side.BOTTOM_RIGHT:
      return "br";
    case Rect.Side.BOTTOM_LEFT:
      return "bl";
    default:
      throw new Error("Invalid side");
  }
}

/**
 * Called per corner with its position, side, corner type and radii, and
 * its index; returning true stops the iteration.
 */
export type RectangleSegmentVisitor = (
  point: Point,
  side: RectSide,
  cornerType: string,
  radiusX: number,
  radiusY: number,
  index: number,
) => unknown;

/** The angle at `b` in the triangle a, b, c (law of cosines), or null without three points. */
function angleAt(a: Point | undefined, b: Point | undefined, c: Point | undefined): number | null {
  if (a && b && c) {
    const ac = Math.sqrt(Math.pow(c.getX() - a.getX(), 2) + Math.pow(c.getY() - a.getY(), 2));
    const bc = Math.sqrt(Math.pow(c.getX() - b.getX(), 2) + Math.pow(c.getY() - b.getY(), 2));
    const ab = Math.sqrt(Math.pow(b.getX() - a.getX(), 2) + Math.pow(b.getY() - a.getY(), 2));
    return Math.acos((bc * bc + ac * ac - ab * ab) / (2 * bc * ac));
  }
  return null;
}

/**
 * The miter limit that keeps every corner of `points` mitered: the
 * largest 1/sin(angle/2), rounded up. The old loop walks backwards in
 * steps of two, so only every other corner is looked at.
 */
export function miterLimitOfPoints(points: Point[], start: number): number {
  let limit = start;
  for (let i = points.length - 1; i > 0; i -= 2) {
    const corner = points[i];
    const previous = points[i - 1];
    const angle = angleAt(corner, points[i - 2 < 0 ? points.length - 1 : i - 2], previous);
    if ("number" == typeof angle) limit = Math.max(limit, Math.abs(1 / Math.sin(angle / 2)));
  }
  return Math.ceil(limit);
}

export class Rectangle extends PathBase {
  static {
    registerNodeClass(this, "rectangle", "GRectangle");
  }

  static override GeometryProperties: Readonly<Record<string, unknown>> = GeometryProperties;
  static override VisualProperties: Readonly<Record<string, unknown>> = VisualProperties;
  static getGeometryPropertiesSidePrefix = getGeometryPropertiesSidePrefix;
  static SIDES = SIDES;

  declare $uf: boolean;
  declare $tl_ct: string;
  declare $tl_sx: number;

  /** The untransformed box; the unit square (-1, -1, 2, 2) unless given. */
  declare _x: number;
  declare _y: number;
  declare _w: number;
  declare _h: number;
  /** Set while the handler applies the uniform-corner rules, so it doesn't recurse. */
  declare _blockHandle: boolean;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    super();
    if (x || 0 === x) this._x = x;
    if (y || 0 === y) this._y = y;
    if (width) this._w = width;
    if (height) this._h = height;
    this.$closed = true;
    this._setDefaultProperties(GeometryProperties);
    this._invalidatePath();
    this._paintSharp = true;
  }

  /** A property of this node by its computed name ("tl_ct", ...). */
  private _field(name: string): unknown {
    return (this as unknown as Record<string, unknown>)["$" + name];
  }

  /**
   * Calls `visitor` for each corner, top left first, mapped by `trf` when
   * `transformed`.
   */
  iterateSegments(visitor: RectangleSegmentVisitor, transformed?: boolean): void {
    const transform = transformed ? this.$trf : null;
    for (let index = 0; index < SIDES.length; ++index) {
      const side = SIDES[index] as RectSide;
      const prefix = getGeometryPropertiesSidePrefix(side);
      let point: Point | null = null;
      switch (side) {
        case Rect.Side.TOP_LEFT:
          point = new Point(this._x, this._y);
          break;
        case Rect.Side.TOP_RIGHT:
          point = new Point(this._x + this._w, this._y);
          break;
        case Rect.Side.BOTTOM_RIGHT:
          point = new Point(this._x + this._w, this._y + this._h);
          break;
        case Rect.Side.BOTTOM_LEFT:
          point = new Point(this._x, this._y + this._h);
      }
      if (transform) point = transform.mapPoint(point as Point);
      if (
        true ===
        visitor(
          point as Point,
          side,
          this._field(prefix + "_ct") as string,
          this._field(prefix + "_sx") as number,
          this._field(prefix + "_sy") as number,
          index,
        )
      ) {
        break;
      }
    }
  }

  /** The shorter side length after `trf`. */
  getPointsMinDistance(): number {
    let topLeft = new Point(this._x, this._y);
    let topRight = new Point(this._x + this._w, this._y);
    let bottomLeft = new Point(this._x, this._y + this._h);
    if (this.$trf) {
      topLeft = this.$trf.mapPoint(topLeft);
      topRight = this.$trf.mapPoint(topRight);
      bottomLeft = this.$trf.mapPoint(bottomLeft);
    }
    return Math.min(
      GMath.ptDist(topLeft.getX(), topLeft.getY(), topRight.getX(), topRight.getY()),
      GMath.ptDist(topLeft.getX(), topLeft.getY(), bottomLeft.getX(), bottomLeft.getY()),
    );
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GRectangle", "name", this.getNodeName()) as string;
  }

  override _handleChange(change: number, args?: unknown): void {
    const fields = this as unknown as Record<string, unknown>;
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      if (this.$uf) {
        blob["uf"] = true;
        blob["ct"] = this.$tl_ct;
        blob["sl"] = this.$tl_sx;
      } else {
        blob["uf"] = false;
        for (let i = 0; i < SIDES.length; ++i) {
          const prefix = getGeometryPropertiesSidePrefix(SIDES[i] as RectSide);
          blob[prefix + "uf"] = fields["$" + prefix + "_uf"];
          blob[prefix + "ct"] = fields["$" + prefix + "_ct"];
          blob[prefix + "sl"] = [fields["$" + prefix + "_sx"], fields["$" + prefix + "_sy"]];
        }
      }
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      if (true !== blob["uf"] && false !== blob["uf"]) {
        this._setDefaultProperties(GeometryProperties);
      } else {
        this.$uf = blob["uf"] as boolean;
        for (let i = 0; i < SIDES.length; ++i) {
          const prefix = getGeometryPropertiesSidePrefix(SIDES[i] as RectSide);
          // A non-uniform blob without "<side>sl" throws here, as before.
          fields["$" + prefix + "_uf"] = blob["uf"] ? blob["uf"] : blob[prefix + "uf"];
          fields["$" + prefix + "_ct"] = blob["uf"] ? blob["ct"] : blob[prefix + "ct"];
          fields["$" + prefix + "_sx"] = blob["uf"]
            ? blob["sl"]
            : (blob[prefix + "sl"] as unknown[])[0];
          fields["$" + prefix + "_sy"] = blob["uf"]
            ? blob["sl"]
            : (blob[prefix + "sl"] as unknown[])[1];
        }
      }
      this._invalidatePath();
    }

    if (
      this._canHandleGeometryChangeForProperties(change, args, GeometryProperties) &&
      change == NodeChange.AfterPropertiesChange &&
      !this.isRecordedTransaction()
    ) {
      const changeArgs = args as PropertiesChangeArgs;
      const names: string[] = [];
      const values: unknown[] = [];
      const changed = changeArgs.properties;
      let blocked = false;
      if (this._blockHandle) blocked = true;
      if (!blocked) {
        if (this.$uf) {
          // The first changed radius and corner type win for all corners.
          let radius: unknown = null;
          let cornerType: unknown = null;
          let radiusFound = false;
          let typeFound = false;
          for (let i = 0; i < SIDES.length && (!radiusFound || !typeFound); ++i) {
            const prefix = getGeometryPropertiesSidePrefix(SIDES[i] as RectSide);
            if (!radiusFound) {
              let name = prefix + "_sx";
              if (changed.indexOf(name) >= 0) {
                radius = fields["$" + name];
                radiusFound = true;
              } else {
                name = prefix + "_sy";
                if (changed.indexOf(name) >= 0) {
                  radius = fields["$" + name];
                  radiusFound = true;
                }
              }
            }
            if (!typeFound) {
              const name = prefix + "_ct";
              if (changed.indexOf(name) >= 0) {
                cornerType = fields["$" + name];
                typeFound = true;
              }
            }
          }
          if (!radiusFound) radius = this.getProperty("tl_sx");
          if (!typeFound) cornerType = this.getProperty("tl_ct");
          names.push("tl_uf", "tr_uf", "br_uf", "bl_uf");
          values.push(true, true, true, true);
          names.push("tl_sx", "tl_sy", "tr_sx", "tr_sy", "br_sx", "br_sy", "bl_sx", "bl_sy");
          values.push(radius, radius, radius, radius, radius, radius, radius, radius);
          names.push("tl_ct", "tr_ct", "br_ct", "bl_ct");
          values.push(cornerType, cornerType, cornerType, cornerType);
        } else {
          // A corner with "<side>_uf" gets the changed radius for x and y.
          for (let i = 0; i < SIDES.length; ++i) {
            const prefix = getGeometryPropertiesSidePrefix(SIDES[i] as RectSide);
            let radius: unknown = null;
            let radiusFound = false;
            if (fields["$" + prefix + "_uf"]) {
              let name = prefix + "_sx";
              if (changed.indexOf(name) >= 0) {
                radius = fields["$" + name];
                radiusFound = true;
              } else {
                name = prefix + "_sy";
                if (changed.indexOf(name) >= 0) {
                  radius = fields["$" + name];
                  radiusFound = true;
                }
              }
              if (!radiusFound) radius = this.getProperty(prefix + "_sx");
              names.push(prefix + "_sx");
              values.push(radius);
              names.push(prefix + "_sy");
              values.push(radius);
            }
          }
        }
        this._blockHandle = true;
        this.setProperties(names, values, false, false, changeArgs.temporary);
        this._invalidatePath();
        this._handleGeometryChangeForProperties(change, args, GeometryProperties);
      }
      this._blockHandle = false;
    } else if (!this._blockHandle) {
      this._handleGeometryChangeForProperties(change, args, GeometryProperties);
    }
    super._handleChange(change, args);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _calculateSourceBBox(includeInvisible?: unknown): Rect | null {
    return new Rect(this._x, this._y, this._w, this._h);
  }

  /** Only a skewed or rotated rectangle needs the approximated miter limit. */
  override _requireMiterLimitApproximation(): unknown {
    if (this.getTransform()) {
      const parts = (this.getTransform() as Transform).decomposed() as TransformDecomposition;
      return !parts.skew.isIdentity() || !parts.rotate.isIdentity();
    }
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override calculateMitterLimit(border?: BorderPaintLayer): number {
    const points: Point[] = [];
    this.iterateSegments((point) => {
      points.push(point);
    }, true);
    return miterLimitOfPoints(points, 0);
  }

  /** Rebuilds the anchor points from the corners. */
  _invalidatePath(): void {
    const points = this.getAnchorPoints();
    this.beginUpdate();
    points._beginBlockCompositeEvents(true, true, true);
    try {
      points.clearChildren();
      this.iterateSegments((point, _side, cornerType, radiusX, radiusY) => {
        const anchor = new AnchorPoint();
        anchor.setProperties(
          ["tp", "x", "y", "cl", "cr", "cu"],
          [cornerType, point.getX(), point.getY(), radiusX, radiusY, false],
        );
        points.appendChild(anchor);
      });
    } finally {
      this.endUpdate();
      points._endBlockCompositeEvents(true, true, true);
    }
  }

  override assignFrom(other: Node): void {
    if (other instanceof Rectangle) this.transferProperties(other, [GeometryProperties]);
    super.assignFrom(other);
  }

  /**
   * Scales the corner radii of `target` by the square root of the
   * transform's area scale.
   */
  override _transformStyledCorners(target: PathBase, transform: Transform): void {
    let scaleX = 1;
    let scaleY = 1;
    const scale = (transform.decomposed() as TransformDecomposition).scale.getMatrix();
    // Both branches are the same in the old code ("cu" is not a rectangle property).
    if (this.getProperty("cu")) {
      const area = Math.abs((scale[0] as number) * (scale[3] as number));
      if (!GMath.isEqualEps(area, 1)) scaleX = scaleY = Math.sqrt(area);
    } else {
      const area = Math.abs((scale[0] as number) * (scale[3] as number));
      if (!GMath.isEqualEps(area, 1)) scaleX = scaleY = Math.sqrt(area);
    }
    if (!GMath.isEqualEps(scaleX, 1) || !GMath.isEqualEps(scaleY, 1)) {
      const names: string[] = [];
      const values: unknown[] = [];
      for (let i = 0; i < SIDES.length; ++i) {
        const prefix = getGeometryPropertiesSidePrefix(SIDES[i] as RectSide);
        let name = prefix + "_sx";
        names.push(name);
        values.push((this.getProperty(name) as number) * scaleX);
        name = prefix + "_sy";
        names.push(name);
        values.push((this.getProperty(name) as number) * scaleY);
      }
      target.setProperties(names, values);
    }
  }

  /** Copies the corner properties to `target` when it is a rectangle. */
  override transferStyledCorners(target: PathBase): void {
    if (target instanceof Rectangle) target.transferProperties(this, [GeometryProperties]);
  }

  override toString(): string {
    return "[GRectangle]";
  }
}

const rectanglePrototype = Rectangle.prototype;
rectanglePrototype._x = -1;
rectanglePrototype._y = -1;
rectanglePrototype._w = 2;
rectanglePrototype._h = 2;
rectanglePrototype._blockHandle = false;
