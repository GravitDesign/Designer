// Old: chunk.vendor.js module 141 (GVertexPixelAligner).
import { registerClass } from "../core/object.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import type { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import { Vertex } from "./vertex.ts";
import { VertexSource, type VertexReader } from "./vertex-source.ts";

/** Nudges values that sit just below a pixel boundary over it before rounding. */
const EPSILON = 1e-10;

/**
 * A vertex source that snaps another source's vertices to device pixels.
 *
 * Each vertex is mapped through `transform` (to device space), aligned
 * and mapped back. Without `full` vertices land on pixel centers (+0.5,
 * for crisp 1px lines), with `full` on pixel corners.
 *
 * With a `bbox`, only the box's corners are snapped (top edge rounded
 * half down, bottom edge half up, to two decimals) and every vertex is
 * moved barycentrically inside the two triangles the box splits into, so
 * the shape stretches to the aligned box instead of each vertex jumping
 * to its own pixel. A bbox needs a transform.
 *
 * Without a transform (or with a singular one) vertices pass unchanged.
 */
export class VertexPixelAligner extends VertexSource {
  static {
    // Not on the old G namespace, so no recorded number.
    registerClass(this, "GVertexPixelAligner");
  }

  private _source: VertexReader;
  private _transform: Transform | null;
  private _invTrf: Transform | null = null;
  private _alignX: number;
  private _alignY: number;
  /** The mapped bbox corners (top left, top right, bottom right, bottom left). */
  private _bbox: Point[] | null = null;
  private _alignedBBox: Point[] | null = null;
  /** Barycentric denominators of the triangles (0,1,2) and (0,2,3). */
  private _bDiv1 = 0;
  private _bDiv2 = 0;

  constructor(
    source: VertexReader,
    transform?: Transform | null,
    full?: boolean,
    bbox?: Rect | null,
  ) {
    super();
    this._source = source;
    this._transform = transform || null;
    this._alignX = this._alignY = full ? 0 : 0.5;
    if (this._transform) this._invTrf = this._transform.inverted();
    if (bbox) {
      // Throws without a transform, as the old code did.
      const corners = (this._transform as Transform).mapQuadrilateral(bbox);
      const [c0, c1, c2, c3] = corners as [Point, Point, Point, Point];
      const topLeft = new Point(
        GMath.round(c0.getX() + EPSILON, true, 2) + this._alignX,
        GMath.round(c0.getY() + EPSILON, true, 2) + this._alignY,
      );
      const topRight = new Point(
        GMath.round(c1.getX() + EPSILON, true, 2) + this._alignX,
        GMath.round(c1.getY() + EPSILON, true, 2) + this._alignY,
      );
      const bottomRight = new Point(
        GMath.round(c2.getX() + EPSILON, false, 2) + this._alignX,
        GMath.round(c2.getY() + EPSILON, false, 2) + this._alignY,
      );
      const bottomLeft = new Point(
        GMath.round(c3.getX() + EPSILON, false, 2) + this._alignX,
        GMath.round(c3.getY() + EPSILON, false, 2) + this._alignY,
      );
      const x0 = c0.getX();
      const y0 = c0.getY();
      let x1 = c1.getX();
      let y1 = c1.getY();
      let x2 = c2.getX();
      let y2 = c2.getY();
      this._bDiv1 = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
      x1 = c2.getX();
      y1 = c2.getY();
      x2 = c3.getX();
      y2 = c3.getY();
      this._bDiv2 = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
      this._bbox = corners;
      this._alignedBBox = [topLeft, topRight, bottomRight, bottomLeft];
    }
  }

  override rewindVertices(index?: number): boolean {
    return this._source.rewindVertices(index);
  }

  override readVertex(vertex: Vertex): boolean {
    if (!this._source.readVertex(vertex)) return false;
    if (
      vertex.command >= Vertex.Command.Move &&
      vertex.command < Vertex.Command.Close &&
      this._invTrf
    ) {
      const transform = this._transform as Transform;
      if (this._bDiv1 !== 0 || this._bDiv2 !== 0) {
        transform.map(vertex);
        const box = this._bbox as Point[];
        const aligned = this._alignedBBox as Point[];
        const x0 = (box[0] as Point).getX();
        const y0 = (box[0] as Point).getY();
        let x1 = (box[1] as Point).getX();
        let y1 = (box[1] as Point).getY();
        let x2 = (box[2] as Point).getX();
        let y2 = (box[2] as Point).getY();
        let w0 = (y1 - y2) * (vertex.x - x2) + (x2 - x1) * (vertex.y - y2);
        let w1 = (y2 - y0) * (vertex.x - x2) + (x0 - x2) * (vertex.y - y2);
        w0 /= this._bDiv1;
        w1 /= this._bDiv1;
        let w2 = 1 - w0 - w1;
        if (w0 >= 0 && w0 <= 1 && w1 >= 0 && w1 <= 1 && w2 >= 0) {
          // Inside the triangle top left, top right, bottom right.
          const a = aligned[0] as Point;
          const b = aligned[1] as Point;
          const c = aligned[2] as Point;
          vertex.x = w0 * a.getX() + w1 * b.getX() + w2 * c.getX();
          vertex.y = w0 * a.getY() + w1 * b.getY() + w2 * c.getY();
        } else if (this._bDiv2 != 0) {
          // The triangle top left, bottom right, bottom left.
          x1 = (box[2] as Point).getX();
          y1 = (box[2] as Point).getY();
          x2 = (box[3] as Point).getX();
          y2 = (box[3] as Point).getY();
          w0 = (y1 - y2) * (vertex.x - x2) + (x2 - x1) * (vertex.y - y2);
          w1 = (y2 - y0) * (vertex.x - x2) + (x0 - x2) * (vertex.y - y2);
          w0 /= this._bDiv2;
          w1 /= this._bDiv2;
          w2 = 1 - w0 - w1;
          const a = aligned[0] as Point;
          const b = aligned[2] as Point;
          const c = aligned[3] as Point;
          vertex.x = w0 * a.getX() + w1 * b.getX() + w2 * c.getX();
          vertex.y = w0 * a.getY() + w1 * b.getY() + w2 * c.getY();
        }
        this._invTrf.map(vertex);
      } else {
        transform.map(vertex);
        vertex.x = Math.floor(vertex.x + EPSILON) + this._alignX;
        vertex.y = Math.floor(vertex.y + EPSILON) + this._alignY;
        this._invTrf.map(vertex);
      }
    }
    return true;
  }

  override hasVertexForRead(): boolean {
    return this._source.hasVertexForRead();
  }

  override toString(): string {
    return "[Object GVertexPixelAligner]";
  }
}
