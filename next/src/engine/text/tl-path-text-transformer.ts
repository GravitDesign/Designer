// Old: chunk.vendor.js module 215 (GTLPathTextTransformer).
import { registerClass } from "../core/object.ts";
import { PolyIntersector, PolyLine } from "../geometry/boolean/poly-segments.ts";
import { QuadTree } from "../geometry/quadtree.ts";
import { Vertex } from "../geometry/vertex.ts";
import { VertexOffsetter } from "../geometry/vertex-offsetter.ts";
import type { VertexReader } from "../geometry/vertex-source.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import {
  TextTransformer,
  type GlyphPlacement,
  type TransformerCore,
} from "./gtl/transformer-util.ts";

/** How text sits on its path. */
export interface PathTransformerParams {
  /** TLPathTextTransformer.INSIDE or OUTSIDE. */
  side: number;
  /** DIRECTION_OUTWARDS or DIRECTION_INWARDS (reverses the path). */
  direction: number;
  /** Distance of the baseline from the path. */
  offset: number;
  /** Where along the path the text starts. */
  distance: number;
}

/** The path the text follows (a GPath element). */
export interface TextBasePath extends VertexReader {
  _calculateGeometryBBox(): Rect;
  /** Whether the path is closed. */
  $closed?: boolean;
  reverseOrder(): void;
}

/**
 * Places glyphs along a path. Each line of text follows the path offset by
 * its baseline (a VertexOffsetter outline, flattened to a polygon with the
 * running length in `m`); a glyph is rotated to the path direction at the
 * length of its center.
 */
export class TLPathTextTransformer extends TextTransformer {
  static {
    registerClass(this, "GTLPathTextTransformer");
  }

  static TYPE = "path";
  static OUTSIDE = 1;
  static INSIDE = -1;
  static DIRECTION_OUTWARDS = 0;
  static DIRECTION_INWARDS = 1;
  /** Sub-paths shorter than this are dropped from the polygon. */
  static MIN_SPATH_LEN = 1;
  static TransformerParams: PathTransformerParams = {
    side: TLPathTextTransformer.INSIDE,
    direction: TLPathTextTransformer.DIRECTION_OUTWARDS,
    offset: 0,
    distance: 0,
  };

  /** Flattened offset outlines by baseline offset. */
  _polys: Record<string, PolyLine> = {};
  _qtrees: Record<string, QuadTree<PolyLine> | null> = {};
  _basePath: TextBasePath;
  _params: PathTransformerParams;
  /** Total length per offset outline; 0 (as the old prototype default) until the first one. */
  _totalDist: Record<string, number> | 0 = 0;

  constructor(
    core: TransformerCore | null,
    basePath: TextBasePath,
    params?: PathTransformerParams,
  ) {
    super(core);
    this._type = TLPathTextTransformer.TYPE;
    this._basePath = basePath;
    this._params = params || TLPathTextTransformer.TransformerParams;
    if (this._params.direction === TLPathTextTransformer.DIRECTION_INWARDS) basePath.reverseOrder();
  }

  private _dist(key: string | number): number {
    return (this._totalDist as Record<string, number>)[key] as number;
  }

  override getMatrix(
    x: number,
    y: number,
    bounds: Rect,
    placement?: GlyphPlacement,
    matrix?: Transform | null,
  ): Transform | null {
    const poly = this._getPolyAtOffset(y);
    if (!poly || !poly.next) return super.getMatrix(x, y, bounds, placement, matrix);
    const center = new Point(x + bounds.getWidth() / 2, y);
    let transform = this._getMtxAtDist(poly, x, center, bounds);
    let origin = new Point(x, y);
    if (transform) {
      origin = transform.mapPoint(origin);
      bounds = transform.mapRect(bounds);
      if (matrix) transform = matrix.multiplied(transform);
    } else {
      transform = matrix ?? null;
    }
    return super.getMatrix(origin.getX(), origin.getY(), bounds, placement, transform);
  }

  override getBoxOrigin(): Point {
    return this._basePath._calculateGeometryBBox().getSide(Rect.Side.TOP_LEFT);
  }

  override getPreTransform(): Transform {
    const origin = this.getBoxOrigin();
    const renderBounds = (this._tlCore as TransformerCore)._calculateRenderBounds();
    const offset = new Point(origin.getX(), origin.getY()).add(
      new Point(renderBounds.getX(), renderBounds.getY()),
    );
    return new Transform().translated(offset.getX(), offset.getY());
  }

  /**
   * Maps a point near the path back to text space: x the length along the
   * path, y the signed distance from it. Searches the quadtrees with a
   * growing box for the closest segment.
   */
  override _inverseTransform(point: Point, first?: boolean): Point {
    let size = 8;
    let x = point.getX();
    let y = point.getY();
    const candidates: Record<string, PolyLine[]> = {};
    let found = false;
    let firstTotal = -1;
    const pathBox = this._basePath._calculateGeometryBBox();
    for (x += pathBox.getX(), y += pathBox.getY(); size < 1 << 20 && !found;) {
      const query = new PolyLine();
      query.x = x - size / 2;
      query.y = y - size / 2;
      query.width = size;
      query.height = size;
      for (const key in this._qtrees) {
        const tree = this._qtrees[key] as QuadTree<PolyLine>;
        if (firstTotal < 0) firstTotal = this._dist(key);
        const hits = tree.retrieve(query, QuadTree.RETRIEVE_MODE_INTERSECT);
        if (hits && hits.length) {
          found = true;
          if (candidates[key]) Array.prototype.push.apply(candidates[key], hits);
          else candidates[key] = hits;
        }
        if (first) break;
      }
      size <<= 1;
    }
    if (!found) {
      console.warn("Path transformer: closest polygon not found");
      return super._inverseTransform(point, first);
    }
    let offset = 0;
    let side = 0;
    let param = 0;
    let total = 0;
    let closest: PolyLine | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    const out: number[] = [];
    for (const key in candidates) {
      const segments = candidates[key] as PolyLine[];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i] as PolyLine;
        const start = segment.point as Point;
        const next = segment.next as PolyLine;
        if (!segment.isLastSegment && next.point) {
          const distance = GMath.sqrSegmentDist(
            start.getX(),
            start.getY(),
            next.point.getX(),
            next.point.getY(),
            x,
            y,
            out,
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            param = out[0] as number;
            offset = parseFloat(key);
            total = this._dist(key);
            closest = segment;
            side = -GMath.segmentSide(
              start.getX(),
              start.getY(),
              next.point.getX(),
              next.point.getY(),
              x,
              y,
            );
          }
        }
      }
    }
    if (null === closest) {
      console.warn("Path transformer: closest point not found");
      return super._inverseTransform(point, first);
    }
    const scale = total / firstTotal;
    const distance = Math.max(0, Math.min(this._params.distance, total - 10));
    let along = closest.m + ((closest.next as PolyLine).m - closest.m) * param - distance * scale;
    const across = offset + side * Math.sqrt(closestDistance) + this._params.offset;
    if (!first && along < 0) along += total;
    return super._inverseTransform(new Point(along, across), first);
  }

  /**
   * The transform that puts a glyph (bounds at x, center `center`) on the
   * polygon: rotated to the segment direction at the glyph center's length,
   * moved to that point relative to the path box. Null when the length is
   * past the segment's end.
   */
  _getMtxAtDist(poly: PolyLine, x: number, center: Point, bounds: Rect): Transform | null {
    let distance = this._params.distance;
    x += bounds.getWidth() / 2;
    if (this._basePath.$closed || this._params.distance > 0) {
      let firstTotal = -1;
      for (const key in this._polys) {
        if (firstTotal < 0) firstTotal = this._dist(key);
        if (this._polys[key] === poly) {
          const total = this._dist(key);
          if (this._params.distance > 0) {
            distance = Math.max(0, Math.min(total - 10, distance));
            x += distance * (total / firstTotal);
          }
          if (this._basePath.$closed && total <= x) x %= total;
          break;
        }
      }
    } else {
      x += distance;
    }
    const segment = this._getSegmentAtParam(poly, x);
    let next = segment.next as PolyLine;
    const start = segment.point as Point;
    let end = next.point;
    while (
      end &&
      Point.equals(start, end) &&
      ((end = (next = next.next as PolyLine).point),
      !next.isLastSegment || (next.next as PolyLine).point)
    );
    if (!end) return new Transform();
    let position: Point;
    let t: number;
    if (Point.equals(start, end)) {
      position = next.isLastSegment && !(next.next as PolyLine).point ? end : start;
      t = 0;
    } else {
      t = (x - segment.m) / (next.m - segment.m);
      position = GMath.getPointAtSegment(start.getX(), start.getY(), end.getX(), end.getY(), t);
    }
    if (t > 1) return null;
    let direction = end.subtract(position);
    while (end && !next.isLastSegment && GMath.isEqualEps(direction.dot(direction), 0)) {
      if ((end = (next = next.next as PolyLine).point) && !next.isLastSegment) {
        direction = end.subtract(position);
      }
    }
    const pathBox = this._basePath._calculateGeometryBBox();
    if (!end || GMath.isEqualEps(direction.dot(direction), 0)) {
      return new Transform().translated(
        position.getX() - pathBox.getX(),
        position.getY() - pathBox.getY(),
      );
    }
    const angle = Math.atan2(direction.getY(), direction.getX());
    return new Transform()
      .translated(-center.getX(), -center.getY())
      .rotated(angle)
      .translated(position.getX() - pathBox.getX(), position.getY() - pathBox.getY());
  }

  /**
   * The polygon for the line whose baseline is at or below `y` (the last
   * line past the end), offset from the path by baseline minus offset and
   * the first line's descent (inside) or ascent (outside). Built on first
   * use and cached with its quadtree.
   */
  _getPolyAtOffset(y: number): PolyLine | null | undefined {
    const lines = this._tlCore ? this._tlCore.getLines() : [];
    let offset = this._params.offset;
    if (lines.length > 0) {
      if (this._params.side === TLPathTextTransformer.INSIDE) {
        offset += (lines[0] as (typeof lines)[number]).descent;
      } else {
        offset += (lines[0] as (typeof lines)[number]).ascent;
      }
    }
    let index: number;
    for (index = 0; index < lines.length; index++) {
      const line = lines[index] as (typeof lines)[number];
      if (y <= line.baseline) {
        y = line.baseline - offset;
        break;
      }
    }
    if (index === lines.length && index > 0) {
      y = (lines[lines.length - 1] as (typeof lines)[number]).baseline - offset;
    }
    const cached = this._polys[y];
    if (cached) return cached;
    let source: VertexReader;
    if (0 !== y) {
      const inside = this._params.side === TLPathTextTransformer.INSIDE;
      source = new VertexOffsetter(this._basePath, y, inside, !inside, 0, null);
      const vertex = new Vertex();
      if (!source.rewindVertices(0) || !source.readVertex(vertex)) return null;
    } else {
      source = this._basePath;
    }
    this._polys[y] = PolyIntersector.polyFromVertexSource(source, false, false);
    const poly = this._generateDistancesFilterSubpaths(y);
    // Like the old code this throws when the polygon was empty (poly undefined).
    this._qtrees[y] = PolyIntersector.quadTreeFromPolygon(poly as PolyLine);
    return poly;
  }

  /**
   * Writes the running length into every node's `m`, drops sub-paths
   * shorter than MIN_SPATH_LEN and records the total length. Returns the
   * (possibly new) first node, or undefined for an empty polygon.
   */
  _generateDistancesFilterSubpaths(key: number): PolyLine | undefined {
    let node = this._polys[key] as PolyLine;
    let next = node.next;
    let total = 0;
    let subPathLength = 0;
    let previousLast: PolyLine | null = null;
    let first = node;
    if (next && next.point) {
      do {
        if (node.isLastSegment) {
          if (subPathLength < TLPathTextTransformer.MIN_SPATH_LEN) {
            if (previousLast) previousLast.next = next;
            else first = this._polys[key] = next;
            total -= subPathLength;
          }
          previousLast = node;
          subPathLength = 0;
        } else {
          const start = node.point as Point;
          const end = next.point as Point;
          const length = GMath.ptDist(start.getX(), start.getY(), end.getX(), end.getY());
          subPathLength += length;
          total += length;
        }
        next.m = total;
        next = (node = next).next as PolyLine;
      } while (next.point);
      if (!this._totalDist) this._totalDist = {};
      this._totalDist[key] = total;
      return first;
    }
    return undefined;
  }

  /** The node whose segment contains length `x` (a sub-path start instead of a gap). */
  _getSegmentAtParam(poly: PolyLine, x: number): PolyLine {
    let node = poly;
    let next = node.next;
    if (!next || !next.point) return poly;
    do {
      const m = next.m;
      if ((next.isLastSegment && !(next.next as PolyLine).point) || x < m) {
        return node.isLastSegment && !next.isLastSegment ? next : node;
      }
      next = (node = node.next as PolyLine).next as PolyLine;
    } while (next.point);
    return node;
  }
}
