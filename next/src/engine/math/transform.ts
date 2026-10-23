// Old: chunk.vendor.js module 7 (GTransform).
import { GMath } from "./math.ts";
import { Point } from "./point.ts";
import { Rect, type RectSide } from "./rect.ts";

/** What Transform.decomposed returns: scale, then skew, rotation and translation. */
export interface TransformDecomposition {
  scale: Transform;
  translate: Transform;
  rotate: Transform;
  skew: Transform;
}

/** What Transform.noSkewDecomposed returns. */
export interface TransformNoSkewDecomposition {
  rotation: Transform;
  scalation: Transform;
  rotationBack: Transform;
  translation: Transform;
}

/**
 * An immutable 2D affine matrix [sx shx tx; shy sy ty]. Points map as
 * x' = x*sx + y*shx + tx, y' = x*shy + y*sy + ty. `a.multiplied(b)` applies
 * a first, then b.
 */
export class Transform {
  /** File format: [] for the identity, otherwise the six matrix values. */
  static serialize(transform: Transform): number[] {
    return transform.isIdentity() ? [] : transform.getMatrix();
  }

  static deserialize(data: ArrayLike<number> | null | undefined): Transform {
    return data && data.length >= 6
      ? new Transform(data[0], data[1], data[2], data[3], data[4], data[5])
      : new Transform();
  }

  /** Two nulls are equal; otherwise all six values must match within `eps`. */
  static equals(
    a: Transform | null | undefined,
    b: Transform | null | undefined,
    eps?: number,
  ): boolean {
    return (
      (!a && a == b) ||
      (!!(a && b) &&
        GMath.isEqualEps(a._sx, b._sx, eps) &&
        GMath.isEqualEps(a._shy, b._shy, eps) &&
        GMath.isEqualEps(a._shx, b._shx, eps) &&
        GMath.isEqualEps(a._sy, b._sy, eps) &&
        GMath.isEqualEps(a._tx, b._tx, eps) &&
        GMath.isEqualEps(a._ty, b._ty, eps))
    );
  }

  /**
   * A transform with skew or rotation becomes the translation that moves
   * the frame's center where the transform moves it; others pass through.
   */
  static correctForFrame(transform: Transform, frame: Rect): Transform {
    let result = transform;
    const parts = transform.decomposed();
    if (parts && (!parts.skew.isIdentity() || !parts.rotate.isIdentity())) {
      const center = frame.getSide(Rect.Side.CENTER);
      const mapped = transform.mapPoint(center);
      result = new Transform(
        1,
        0,
        0,
        1,
        mapped.getX() - center.getX(),
        mapped.getY() - center.getY(),
      );
    }
    return result;
  }

  /**
   * Rotation around (cx, cy) that turns the direction to the drag start
   * into the direction to the cursor. `snap` rounds the angle to `step`
   * (default 15 degrees); `snapTolerance` snaps to right angles within it.
   */
  static getRotationTransform(
    startX: number,
    startY: number,
    x: number,
    y: number,
    cx: number,
    cy: number,
    snap?: boolean,
    step?: number | null,
    snapTolerance?: number | null,
  ): Transform {
    const toOrigin = new Transform(1, 0, 0, 1, -cx, -cy);
    const back = new Transform(1, 0, 0, 1, cx, cy);
    const startAngle = Math.atan2(startY - cy, startX - cx);
    let angle = Math.atan2(y - cy, x - cx);
    if (snap) {
      const increment = step || Math.PI / 12;
      angle = Math.round(angle / increment) * increment;
    }
    if (snapTolerance) {
      const increment = Math.PI / 2;
      const rightAngle = Math.round(angle / increment) * increment;
      if (Math.abs(angle - rightAngle) < snapTolerance) angle = rightAngle;
    }
    const delta = startAngle - angle;
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const rotation = new Transform(cos, -sin, sin, cos, 0, 0);
    return toOrigin.multiplied(rotation).multiplied(back);
  }

  /**
   * Like getRotationTransform, but snaps the direction of the line
   * (l1x,l1y)-(l2x,l2y) after rotation instead of the cursor angle. Without
   * `step` and `tolerance` it snaps to 15 degree steps.
   */
  static getLineConstrainRotation(
    startX: number,
    startY: number,
    x: number,
    y: number,
    cx: number,
    cy: number,
    l1x: number,
    l1y: number,
    l2x: number,
    l2y: number,
    step?: number | null,
    tolerance?: number | null,
  ): Transform {
    const toOrigin = new Transform(1, 0, 0, 1, -cx, -cy);
    const back = new Transform(1, 0, 0, 1, cx, cy);
    let delta = Math.atan2(startY - cy, startX - cx) - Math.atan2(y - cy, x - cx);
    let cos = Math.cos(delta);
    let sin = Math.sin(delta);
    let rotation = new Transform(cos, -sin, sin, cos, 0, 0);
    const rotate = toOrigin.multiplied(rotation).multiplied(back);
    const p1 = rotate.mapPoint(new Point(l1x, l1y));
    const p2 = rotate.mapPoint(new Point(l2x, l2y));
    const lineAngle = Math.atan2(p2.getY() - p1.getY(), p2.getX() - p1.getX());
    let snapped = lineAngle;
    if (step || !tolerance) {
      const increment = step || Math.PI / 12;
      snapped = Math.round(lineAngle / increment) * increment;
    }
    if (tolerance) {
      const increment = Math.PI / 2;
      const rightAngle = Math.round(lineAngle / increment) * increment;
      if (Math.abs(rightAngle - lineAngle) < tolerance) snapped = rightAngle;
    }
    delta += lineAngle - snapped;
    cos = Math.cos(delta);
    sin = Math.sin(delta);
    rotation = new Transform(cos, -sin, sin, cos, 0, 0);
    return toOrigin.multiplied(rotation).multiplied(back);
  }

  /**
   * Scale that moves `side` of `rect` by (dx, dy), anchored at the
   * opposite side or, with `fromCenter`, at the center. `keepRatio`
   * keeps the aspect ratio.
   */
  static getResizeTransform(
    rect: Rect,
    side: RectSide | string,
    dx: number,
    dy: number,
    keepRatio?: boolean,
    fromCenter?: boolean,
  ): Transform {
    let scaleX = 1;
    let scaleY = 1;
    const x = rect.getX();
    const y = rect.getY();
    const width = rect.getWidth();
    const height = rect.getHeight();
    let originX = x + width / 2;
    let originY = y + height / 2;
    const divisorX = width || 1;
    const divisorY = height || 1;
    switch (side) {
      case Rect.Side.TOP_LEFT:
      case Rect.Side.LEFT_CENTER:
      case Rect.Side.BOTTOM_LEFT:
        scaleX = (width - dx) / divisorX;
        if (fromCenter) scaleX += scaleX - 1;
        else originX = x + width;
        break;
      case Rect.Side.TOP_RIGHT:
      case Rect.Side.RIGHT_CENTER:
      case Rect.Side.BOTTOM_RIGHT:
        scaleX = (width + dx) / divisorX;
        if (fromCenter) scaleX += scaleX - 1;
        else originX = x;
    }
    switch (side) {
      case Rect.Side.TOP_LEFT:
      case Rect.Side.TOP_CENTER:
      case Rect.Side.TOP_RIGHT:
        scaleY = (height - dy) / divisorY;
        if (fromCenter) scaleY += scaleY - 1;
        else originY = y + height;
        break;
      case Rect.Side.BOTTOM_LEFT:
      case Rect.Side.BOTTOM_CENTER:
      case Rect.Side.BOTTOM_RIGHT:
        scaleY = (height + dy) / divisorY;
        if (fromCenter) scaleY += scaleY - 1;
        else originY = y;
    }
    if (keepRatio) {
      switch (side) {
        case Rect.Side.TOP_CENTER:
        case Rect.Side.BOTTOM_CENTER:
          scaleX = Math.abs(scaleY);
          break;
        case Rect.Side.LEFT_CENTER:
        case Rect.Side.RIGHT_CENTER:
          scaleY = Math.abs(scaleX);
          break;
        default:
          if (Math.abs(scaleX) > Math.abs(scaleY)) {
            scaleY = GMath.isEqualEps(scaleY, 0)
              ? scaleX
              : (scaleY * Math.abs(scaleX)) / Math.abs(scaleY);
          } else {
            scaleX = GMath.isEqualEps(scaleX, 0)
              ? scaleY
              : (scaleX * Math.abs(scaleY)) / Math.abs(scaleX);
          }
      }
    }
    return new Transform(1, 0, 0, 1, -originX, -originY)
      .multiplied(new Transform(scaleX, 0, 0, scaleY, 0, 0))
      .multiplied(new Transform(1, 0, 0, 1, originX, originY));
  }

  /** Maps the unit square onto `rect`. */
  static getNativeRectTransformation(rect: Rect): Transform {
    return new Transform()
      .scaled(rect.getWidth(), rect.getHeight())
      .translated(rect.getX(), rect.getY());
  }

  private _sx: number;
  private _shy: number;
  private _shx: number;
  private _sy: number;
  private _tx: number;
  private _ty: number;

  /** Missing or non-number values fall back to the identity's. */
  constructor(sx?: number, shy?: number, shx?: number, sy?: number, tx?: number, ty?: number) {
    this._sx = typeof sx === "number" ? sx : 1;
    this._shy = typeof shy === "number" ? shy : 0;
    this._shx = typeof shx === "number" ? shx : 0;
    this._sy = typeof sy === "number" ? sy : 1;
    this._tx = typeof tx === "number" ? tx : 0;
    this._ty = typeof ty === "number" ? ty : 0;
  }

  /** Identity within GMath.defaultEps. */
  isIdentity(): boolean {
    return (
      GMath.isEqualEps(this._sx, 1) &&
      GMath.isEqualEps(this._shy, 0) &&
      GMath.isEqualEps(this._shx, 0) &&
      GMath.isEqualEps(this._sy, 1) &&
      GMath.isEqualEps(this._tx, 0) &&
      GMath.isEqualEps(this._ty, 0)
    );
  }

  /** Both scale factors are nonzero (beyond GMath.defaultEps). */
  isValid(): boolean {
    return Math.abs(this._sx) > GMath.defaultEps && Math.abs(this._sy) > GMath.defaultEps;
  }

  /** [sx, shy, shx, sy, tx, ty]. */
  getMatrix(): number[] {
    return [this._sx, this._shy, this._shx, this._sy, this._tx, this._ty];
  }

  getDeterminant(): number {
    return this._sx * this._sy - this._shy * this._shx;
  }

  getDeterminantReciprocal(): number {
    return 1 / (this._sx * this._sy - this._shy * this._shx);
  }

  getTranslation(): Point {
    return new Point(this._tx, this._ty);
  }

  /** Length of the mapped unit diagonal (1/sqrt2, 1/sqrt2). */
  getScaleFactor(): number {
    const x = 0.7071067811865476 * this._sx + 0.7071067811865476 * this._shx;
    const y = 0.7071067811865476 * this._shy + 0.7071067811865476 * this._sy;
    return Math.sqrt(x * x + y * y);
  }

  getRotationFactor(): number {
    return Math.atan2(this._shx, this._sx);
  }

  /** A copy with zero scale factors replaced by defaultEps, or this when invertible. */
  makeInvertible(): Transform {
    if (!this.invertible()) {
      let sx = this._sx;
      let sy = this._sy;
      if (0 === sx) sx = GMath.defaultEps;
      if (0 === sy) sy = GMath.defaultEps;
      return new Transform(sx, this._shy, this._shx, sy, this._tx, this._ty);
    }
    return this;
  }

  /** This transform followed by `other`. */
  multiplied(other: Transform): Transform {
    const sx = this._sx * other._sx + this._shy * other._shx;
    const shx = this._shx * other._sx + this._sy * other._shx;
    const tx = this._tx * other._sx + this._ty * other._shx + other._tx;
    const shy = this._sx * other._shy + this._shy * other._sy;
    const sy = this._shx * other._shy + this._sy * other._sy;
    const ty = this._tx * other._shy + this._ty * other._sy + other._ty;
    return new Transform(sx, shy, shx, sy, tx, ty);
  }

  /** `other` followed by this transform. */
  preMultiplied(other: Transform): Transform {
    const sx = other._sx * this._sx + other._shy * this._shx;
    const shy = other._sx * this._shy + other._shy * this._sy;
    const sy = other._shx * this._shy + other._sy * this._sy;
    return new Transform(
      sx,
      shy,
      other._shx * this._sx + other._sy * this._shx,
      sy,
      other._tx * this._sx + other._ty * this._shx + this._tx,
      other._tx * this._shy + other._ty * this._sy + this._ty,
    );
  }

  invertible(): boolean {
    return this._sx * this._sy - this._shx * this._shy != 0;
  }

  /** The inverse, or null when the determinant is 0. */
  inverted(): Transform | null {
    const determinant = this._sx * this._sy - this._shy * this._shx;
    if (!determinant) return null;
    const reciprocal = 1 / determinant;
    const sx = this._sy * reciprocal;
    const shx = -this._shx * reciprocal;
    const tx = -this._tx * sx - this._ty * shx;
    const shy = -this._shy * reciprocal;
    const sy = this._sx * reciprocal;
    const ty = -this._tx * shy - this._ty * sy;
    return new Transform(sx, shy, shx, sy, tx, ty);
  }

  rotated(angle: number): Transform {
    return this.multiplied(
      new Transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0),
    );
  }

  translated(dx: number, dy: number): Transform {
    return this.multiplied(new Transform(1, 0, 0, 1, dx, dy));
  }

  /** Scales by (sx, sy); a missing or zero sy means sy = sx. */
  scaled(sx: number, sy?: number): Transform {
    if (!sy) sy = sx;
    return this.multiplied(new Transform(sx, 0, 0, sy, 0, 0));
  }

  skewed(angleX: number, angleY: number): Transform {
    return this.multiplied(new Transform(1, Math.tan(angleY), Math.tan(angleX), 1, 0, 0));
  }

  /** Maps an {x, y} object in place (vertices and plain objects alike). */
  map(target: { x: number; y: number }): void {
    if (!this.isIdentity()) {
      const x = target.x;
      target.x = x * this._sx + target.y * this._shx + this._tx;
      target.y = x * this._shy + target.y * this._sy + this._ty;
    }
  }

  /** The mapped point; the identity returns the same point object. */
  mapPoint(point: Point): Point {
    if (this.isIdentity()) return point;
    const x = point.getX();
    const y = point.getY();
    return new Point(
      x * this._sx + y * this._shx + this._tx,
      x * this._shy + y * this._sy + this._ty,
    );
  }

  /** The four mapped corners (top left, top right, bottom right, bottom left), or []. */
  mapQuadrilateral(rect: Rect | null | undefined): Point[] {
    if (!rect) return [];
    const topLeft = rect.getSide(Rect.Side.TOP_LEFT);
    const topRight = rect.getSide(Rect.Side.TOP_RIGHT);
    const bottomRight = rect.getSide(Rect.Side.BOTTOM_RIGHT);
    const bottomLeft = rect.getSide(Rect.Side.BOTTOM_LEFT);
    return [
      this.mapPoint(topLeft),
      this.mapPoint(topRight),
      this.mapPoint(bottomRight),
      this.mapPoint(bottomLeft),
    ];
  }

  /**
   * Splits the matrix into scale, skew (x only), rotation and translation
   * (QR style). The singular check compares with undefined and never
   * fires, so a singular matrix gives NaN parts; that is the old behaviour.
   */
  decomposed(): TransformDecomposition | null {
    let a = this._sx;
    let b = this._shy;
    let c = this._shx;
    let d = this._sy;
    if (GMath.isEqualEps(a * d - b * c)) return null;
    let scaleX = Math.sqrt(a * a + b * b);
    a /= scaleX;
    b /= scaleX;
    let skew = a * c + b * d;
    c -= a * skew;
    d -= b * skew;
    const scaleY = Math.sqrt(c * c + d * d);
    skew /= scaleY;
    c /= scaleY;
    d /= scaleY;
    if (a * d < b * c) {
      a = -a;
      b = -b;
      skew = -skew;
      scaleX = -scaleX;
    }
    return {
      scale: new Transform(scaleX, 0, 0, scaleY, 0, 0),
      translate: new Transform(1, 0, 0, 1, this._tx, this._ty),
      rotate: new Transform(a, b, -b, a, 0, 0),
      skew: new Transform(1, 0, skew, 1, 0, 0),
    };
  }

  /**
   * Splits the matrix into rotation, axis-aligned scale, back rotation and
   * translation. Null when the matrix is singular or has skew left over.
   */
  noSkewDecomposed(): TransformNoSkewDecomposition | null {
    const a = this._sx;
    const b = this._shy;
    const c = this._shx;
    const d = this._sy;
    if (GMath.isEqualEps(a * d - b * c, 0)) return null;
    const p = 2 * (a * c + b * d);
    const q = a * a + b * b - c * c - d * d;
    let length = q * q + p * p;
    if (GMath.isEqualEps(length, 0)) return null;
    const cos2 = q / (length = Math.sqrt(length));
    const sin2 = p / length;
    const cos = Math.sqrt((1 + cos2) / 2);
    const sin = GMath.isEqualEps(cos, 0) ? (cos >= 0 ? 1 : -1) : sin2 / (2 * cos);
    const rotation = new Transform(cos, -sin, sin, cos);
    const rotationBack = new Transform(cos, sin, -sin, cos);
    const translation = new Transform(1, 0, 0, 1, this._tx, this._ty);
    const scale = rotationBack
      .multiplied(this)
      .multiplied(new Transform(1, 0, 0, 1, -this._tx, -this._ty))
      .multiplied(rotation);
    if (
      GMath.isEqualEps(scale._shy, 0, 1e-7) &&
      GMath.isEqualEps(scale._shx, 0, 1e-7) &&
      GMath.isEqualEps(scale._tx, 0, 1e-7) &&
      GMath.isEqualEps(scale._ty, 0, 1e-7)
    ) {
      scale._shy = 0;
      scale._shx = 0;
      scale._tx = 0;
      scale._ty = 0;
      return { rotation, scalation: scale, rotationBack, translation };
    }
    return null;
  }

  /** Bounding box of the mapped rectangle; the identity returns the same rect. */
  mapRect(rect: Rect): Rect {
    return this.isIdentity() ? rect : Rect.fromPoints(...this.mapQuadrilateral(rect));
  }

  toString(): string {
    return (
      "[Object GTransform(sx=" +
      this._sx.toString() +
      ", shy=" +
      this._shy.toString() +
      ", shx=" +
      this._shx.toString() +
      ", sy=" +
      this._sy.toString() +
      ", tx=" +
      this._tx.toString() +
      ", ty=" +
      this._ty.toString() +
      ")]"
    );
  }
}
