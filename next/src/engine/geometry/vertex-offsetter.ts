// Old: chunk.vendor.js module 651 (GVertexOffsetter).
import { registerClass } from "../core/object.ts";
import { GMath, type NumberList, type RootInterval, type SturmCache } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexSource, type VertexReader } from "./vertex-source.ts";

// The old prototypes defaulted these fields to null. They are typed as
// present because the algorithm only reads them where the segment kind
// guarantees a value (an arc has a center and a radius, an offset segment
// has a base point); reading one elsewhere throws, as it did before.
const NO_POINT = null as unknown as Point;
const NO_NUMBER = null as unknown as number;

const LineCap = PaintCanvas.LineCap;

/**
 * One vertex of a polyline made of lines and circular arcs. `point` is
 * where the segment starts; it ends at the next segment's point. A
 * non-zero `bulge` makes it an arc: the tangent of a quarter of the arc's
 * angle, negative for one direction, with `center` and `radius`.
 */
class PolySegment {
  point: Point;
  bulge: number;
  center: Point = NO_POINT;
  radius: number = NO_NUMBER;
  // A cap segment closes an open path's offset. It is a plain boolean
  // when constructed, but some joins copy it from a variable that may
  // still be undefined (see _splitForClipping).
  isCap: boolean | undefined;
  // null at the ends of a container.
  next: PolySegment = null as unknown as PolySegment;
  previous: PolySegment = null as unknown as PolySegment;

  constructor(
    point: Point,
    bulge?: number,
    center?: Point | null,
    radius?: number | null,
    isCap?: boolean,
  ) {
    this.point = point;
    this.isCap = !!isCap;
    if (!bulge || !center || !radius || radius < 0) {
      this.bulge = 0;
    } else {
      this.bulge = bulge;
      this.center = center;
      this.radius = radius;
    }
  }
}

/**
 * A segment of an offset polyline: from `point` to `point2`, offset
 * from the source segment that starts at `basepoint`.
 */
class PolyOffsetSegment extends PolySegment {
  static {
    registerClass(this, "GVertexOffsetter.PolyOffsetSegment");
  }

  basepoint: Point;
  point2: Point = NO_POINT;

  constructor(
    basepoint: Point,
    point: Point,
    point2: Point | null | undefined,
    bulge?: number,
    center?: Point | null,
    radius?: number | null,
    isCap?: boolean,
  ) {
    super(point, bulge, center, radius, isCap);
    this.basepoint = basepoint;
    if (point2) this.point2 = point2;
  }
}

/**
 * Where an intersection lies relative to a segment: on it (TIP, true
 * intersection point), on its extension (FIP, false intersection point),
 * and for FIP whether it is past the segment's end (PFIP, positive FIP).
 */
class IntersectionType {
  TIP = false;
  FIP = false;
  PFIP = false;
}

class IntersectionResult {
  point: Point | null = null;
  intTypes: [IntersectionType, IntersectionType] = [new IntersectionType(), new IntersectionType()];

  clear(): void {
    this.point = null;
    this.intTypes[0].TIP = false;
    this.intTypes[0].FIP = false;
    this.intTypes[0].PFIP = false;
    this.intTypes[1].TIP = false;
    this.intTypes[1].FIP = false;
    this.intTypes[1].PFIP = false;
  }
}

/** A doubly linked list of segments. */
class PolySegmentContainer<S extends PolySegment = PolySegment> {
  // null while empty.
  head: S = null as unknown as S;
  end: S = null as unknown as S;
  closed: boolean = null as unknown as boolean;
  count = 0;

  /** Appends `segment`, or inserts it before `before`. Returns it. */
  insertSegment<T extends S>(segment: T, before?: S): T {
    segment.next = null as unknown as PolySegment;
    segment.previous = null as unknown as PolySegment;
    if (this.head) {
      if (before) {
        if (this.head == before) {
          this.head = segment;
        } else {
          segment.previous = before.previous;
          before.previous.next = segment;
        }
        segment.next = before;
        before.previous = segment;
      } else {
        this.end.next = segment;
        segment.previous = this.end;
        this.end = segment;
      }
    } else {
      this.head = segment;
      this.end = segment;
    }
    ++this.count;
    return segment;
  }

  /** Links the segments of `other` in front (they are shared, not copied). */
  prependContainer(other: PolySegmentContainer<S>): void {
    if (this.head) {
      other.end.next = this.head;
      this.head.previous = other.end;
      this.head = other.head;
    } else {
      this.head = other.head;
      this.end = other.end;
    }
    this.count += other.count;
  }

  /** Links the segments of `other` at the end (they are shared, not copied). */
  appendContainer(other: PolySegmentContainer<S>): void {
    if (this.head) {
      this.end.next = other.head;
      other.head.previous = this.end;
      this.end = other.end;
    } else {
      this.head = other.head;
      this.end = other.end;
    }
    this.count += other.count;
  }

  deleteSegment(segment: S): S {
    if (segment.previous) segment.previous.next = segment.next;
    if (segment.next) segment.next.previous = segment.previous;
    if (this.head == segment) this.head = segment.next as S;
    if (this.end == segment) this.end = segment.previous as S;
    --this.count;
    return segment;
  }
}

/**
 * An intersection on segment `segm` (index `segmIdx` in its container).
 * `slope` is the line parameter on a straight segment, or the bulge of
 * the arc from the segment's start to the intersection.
 */
class IntersectionPt {
  x: number;
  y: number;
  slope: number;
  segm: PolySegment;
  segmIdx: number;

  constructor(x: number, y: number, slope: number, segm: PolySegment, segmIdx: number) {
    this.x = x;
    this.y = y;
    this.slope = slope;
    this.segm = segm;
    this.segmIdx = segmIdx;
  }
}

/** A run of output vertices before the runs are joined into sub-paths. */
interface Piece {
  stPt: Point;
  endPt: Point;
  vrt: { c: number; x: number; y: number }[];
}

type Polyline = PolySegmentContainer;
type OffsetPolyline = PolySegmentContainer<PolyOffsetSegment>;

/**
 * A vertex source with the offset outline of another source: Offset
 * Path, Outline Stroke, Expand/Shrink and the vectorized border. Each
 * sub-path is flattened to a polyline of lines and circular arcs
 * (curves become arcs), offset on one or both sides, trimmed where
 * segments overlap and turned back into lines and cubic curves.
 *
 * `offset` is the distance (its sign is ignored); `makeInset` and
 * `makeOutset` pick the sides; `tolerance` the flattening precision
 * (default 0.03); `cap` the line cap of open paths (GPaintCanvas.LineCap,
 * round when unset).
 */
export class VertexOffsetter extends VertexSource {
  static {
    registerClass(this, "GVertexOffsetter");
  }

  static MAX_RECURS = 100;
  static PolySegment = PolySegment;
  static PolyOffsetSegment = PolyOffsetSegment;
  static IntersectionType = IntersectionType;
  static IntersectionResult = IntersectionResult;
  static PolySegmentContainer = PolySegmentContainer;
  static IntersectionPt = IntersectionPt;

  _source: VertexReader;
  _offset: number;
  _makeInset: boolean;
  _makeOutset: boolean;
  _tolerance: number;
  /** 10^n for the smallest n that makes the tolerance >= 1; output is rounded to it. */
  _tolRange = 1;
  _polyline: Polyline = null as unknown as Polyline;
  _polyinset: Polyline[] = null as unknown as Polyline[];
  _polyoutset: Polyline[] = null as unknown as Polyline[];
  _pieces: VertexContainer[] | null = null;
  _pieceIdx = 0;
  _cap: string | null | undefined;
  /** The Move that starts the next sub-path, or null once the source is used up. */
  _startVertex: Vertex | null;

  constructor(
    source: VertexReader,
    offset: number,
    makeInset: boolean,
    makeOutset: boolean,
    tolerance?: number,
    cap?: string | null,
  ) {
    super();
    this._tolerance = tolerance ? tolerance / 3 : 0.01;
    this._source = source;
    this._offset = offset;
    this._makeInset = makeInset;
    this._makeOutset = makeOutset;
    this._startVertex = null;
    this._cap = cap;
    let range = 1;
    for (let scaled = this._tolerance; scaled < 1;) {
      scaled *= 10;
      range *= 10;
    }
    this._tolRange = range;
  }

  /** Only rewinding to 0 is supported; other indexes return false and do nothing. */
  override rewindVertices(index?: number): boolean {
    if (0 != index) return false;
    this._pieces = null;
    this._pieceIdx = 0;
    this._startVertex = null;
    return this._source.rewindVertices(0);
  }

  override readVertex(vertex: Vertex): boolean {
    if (this._pieces && this._pieces.length && this._readVertex(vertex)) return true;
    // Each pass through generatePolyLine consumes exactly one sub-path of
    // the source. A sub-path that collapses under the offset (an inset
    // wider than the sub-path) yields no pieces; keep going with the
    // remaining sub-paths instead of reporting the end.
    for (;;) {
      this._polyline = new PolySegmentContainer();
      this._polyoutset = [];
      this._polyinset = [];
      this._pieces = [];
      this._pieceIdx = 0;
      this._startVertex = this.generatePolyLine(this._tolerance, this._startVertex);
      if (this._polyline.count) {
        this.generatePolyOffset(
          Math.abs(this._offset),
          this._makeInset,
          this._makeOutset,
          this._tolerance,
        );
        this.generateOffset(this._makeInset, this._makeOutset, this._tolerance);
        if (this._pieces.length) {
          this._rewindVertices();
          this._pieceIdx = 0;
          if (this._readVertex(vertex)) return true;
        }
      }
      if (null == this._startVertex) return false;
    }
  }

  override hasVertexForRead(): boolean {
    return true;
  }

  /**
   * Adds a quadratic curve as one or two arcs (a biarc), splitting it
   * at the point of largest deviation while the biarc is further than
   * `tolerance` from the curve.
   */
  addCurveToPolyline(
    start: Point,
    control: Point,
    end: Point,
    tolerance: number,
    depth: number,
  ): void {
    ++depth;
    const eps = 1e-9;
    if (this._isQudraticCurveFlat(start, control, end, tolerance)) {
      this._polyline.insertSegment(new PolySegment(start, 0));
      return;
    }
    const startToControl = GMath.ptDist(start.getX(), start.getY(), control.getX(), control.getY());
    const controlToEnd = GMath.ptDist(control.getX(), control.getY(), end.getX(), end.getY());
    const startToEnd = GMath.ptDist(start.getX(), start.getY(), end.getX(), end.getY());
    if (GMath.isEqualEps(startToControl, 0, eps) || GMath.isEqualEps(controlToEnd, 0, eps)) {
      this._polyline.insertSegment(new PolySegment(start, 0));
      return;
    }
    if (GMath.isEqualEps(startToEnd, 0, eps)) {
      // The curve folds back onto its start: go to the middle of the hull and back.
      this._polyline.insertSegment(new PolySegment(start, 0));
      this._polyline.insertSegment(
        new PolySegment(
          new Point((start.getX() + control.getX()) / 2, (start.getY() + control.getY()) / 2),
          0,
        ),
      );
      return;
    }
    const dirIn = new Point(
      (control.getX() - start.getX()) / startToControl,
      (control.getY() - start.getY()) / startToControl,
    );
    const dirOut = new Point(
      (end.getX() - control.getX()) / controlToEnd,
      (end.getY() - control.getY()) / controlToEnd,
    );
    const dirChord = new Point(
      (end.getX() - start.getX()) / startToEnd,
      (end.getY() - start.getY()) / startToEnd,
    );
    const cosTurn = GMath.vDotProduct(dirIn.getX(), dirIn.getY(), dirOut.getX(), dirOut.getY());
    const normalIn = new Point(
      startToControl * (dirOut.getX() - dirIn.getX() * cosTurn),
      startToControl * (dirOut.getY() - dirIn.getY() * cosTurn),
    );
    let a = startToControl * cosTurn - controlToEnd;
    let b = controlToEnd * cosTurn - startToControl;
    const normalOut = new Point(
      normalIn.getX() + a * dirIn.getX() + b * dirOut.getX(),
      normalIn.getY() + a * dirIn.getY() + b * dirOut.getY(),
    );
    a = Math.sqrt(
      GMath.vDotProduct(normalIn.getX(), normalIn.getY(), normalIn.getX(), normalIn.getY()),
    );
    b = Math.sqrt(
      GMath.vDotProduct(normalOut.getX(), normalOut.getY(), normalOut.getX(), normalOut.getY()),
    );
    // Falls back to two lines along the hull (start and control).
    const addHull = (): void => {
      this._polyline.insertSegment(new PolySegment(start, 0));
      this._polyline.insertSegment(new PolySegment(control, 0));
    };
    if (GMath.isEqualEps(a, 0, eps) || GMath.isEqualEps(b, 0, eps)) {
      addHull();
      return;
    }
    const unitNormalIn = new Point(normalIn.getX() / a, normalIn.getY() / a);
    const unitNormalOut = new Point(normalOut.getX() / b, normalOut.getY() / b);
    const oneMinusCos = 1 - cosTurn;
    const outDotNormalIn = GMath.vDotProduct(
      dirOut.getX(),
      dirOut.getY(),
      unitNormalIn.getX(),
      unitNormalIn.getY(),
    );
    const chordDotIn = GMath.vDotProduct(
      dirChord.getX(),
      dirChord.getY(),
      dirIn.getX(),
      dirIn.getY(),
    );
    const chordDotNormalIn = GMath.vDotProduct(
      dirChord.getX(),
      dirChord.getY(),
      unitNormalIn.getX(),
      unitNormalIn.getY(),
    );
    const inDotNormalOut = GMath.vDotProduct(
      dirIn.getX(),
      dirIn.getY(),
      unitNormalOut.getX(),
      unitNormalOut.getY(),
    );
    const chordDotOut = GMath.vDotProduct(
      dirChord.getX(),
      dirChord.getY(),
      dirOut.getX(),
      dirOut.getY(),
    );
    const chordDotNormalOut = GMath.vDotProduct(
      dirChord.getX(),
      dirChord.getY(),
      unitNormalOut.getX(),
      unitNormalOut.getY(),
    );
    if (
      GMath.isEqualEps(chordDotNormalOut, 0, eps) ||
      GMath.isEqualEps(chordDotNormalIn, 0, eps) ||
      GMath.isEqualEps(inDotNormalOut, 0, eps) ||
      GMath.isEqualEps(outDotNormalIn, 0, eps)
    ) {
      addHull();
      return;
    }
    const qb =
      (outDotNormalIn * chordDotIn) / chordDotNormalIn +
      (inDotNormalOut * chordDotOut) / chordDotNormalOut;
    const qc = (-outDotNormalIn * inDotNormalOut) / (chordDotNormalIn * chordDotNormalOut * 2);
    let roots: number[] = [];
    GMath.getQuadraticRoots(oneMinusCos, qb, qc, roots);
    let ratio: number;
    if (null != roots[0] && roots[0] < 1 && roots[0] > 0) ratio = roots[0];
    else {
      if (!(null != roots[1] && roots[1] < 1 && roots[1] > 0)) {
        addHull();
        return;
      }
      ratio = roots[1];
    }
    const startOffset = (ratio * startToEnd * chordDotNormalOut) / inDotNormalOut;
    const endOffset = (ratio * startToEnd * chordDotNormalIn) / outDotNormalIn;
    if (GMath.isEqualEps(chordDotIn, 1, eps) || GMath.isEqualEps(chordDotOut, 1, eps)) {
      addHull();
      return;
    }
    const sinHalfStart = Math.sqrt((1 - chordDotIn) / 2);
    const cosHalfStart = Math.sqrt((1 + chordDotIn) / 2);
    const startRadius = (startOffset * cosHalfStart) / sinHalfStart;
    const sinHalfEnd = Math.sqrt((1 - chordDotOut) / 2);
    const cosHalfEnd = Math.sqrt((1 + chordDotOut) / 2);
    const endRadius = (endOffset * cosHalfEnd) / sinHalfEnd;
    const startCenter = new Point(
      start.getX() + startRadius * unitNormalIn.getX(),
      start.getY() + startRadius * unitNormalIn.getY(),
    );
    const endCenter = new Point(
      end.getX() + endRadius * unitNormalOut.getX(),
      end.getY() + endRadius * unitNormalOut.getY(),
    );
    a = 2 * startToControl * chordDotIn;
    roots = [];
    GMath.getQuadraticRoots(startToEnd - a, a, -startOffset * (1 + chordDotIn), roots);
    let joinT: number;
    if (null != roots[0] && roots[0] < 1 && roots[0] > 0) joinT = roots[0];
    else {
      if (!(null != roots[1] && roots[1] < 1 && roots[1] > 0)) {
        addHull();
        return;
      }
      joinT = roots[1];
    }
    const sinChordIn = Math.sqrt(1 - chordDotIn * chordDotIn);
    const joinError = Math.abs(
      (2 * startToControl * joinT * (1 - joinT) - startOffset) * sinChordIn,
    );
    const sqStartToControl = startToControl * startToControl;
    const sqControlToEnd = controlToEnd * controlToEnd;
    const mixed = startToControl * controlToEnd * cosTurn;
    a = sqStartToControl + sqControlToEnd - mixed;
    const sinTurn = Math.sqrt(1 - cosTurn * cosTurn);
    let maxError = joinError;
    let splitT = joinT;
    // The largest distance of the curve from the first arc (before the
    // join) and from the second arc (after it).
    roots = [];
    GMath.getQuadraticRoots(
      a,
      3 * (mixed - sqStartToControl),
      2 * sqStartToControl - startRadius * controlToEnd * sinTurn,
      roots,
    );
    if (null != roots[0] && roots[0] < joinT && roots[0] > 0) {
      const onCurve = new Point(
        GMath.getCurveAtT(start.getX(), end.getX(), control.getX(), roots[0]),
        GMath.getCurveAtT(start.getY(), end.getY(), control.getY(), roots[0]),
      );
      const error = Math.abs(
        startRadius -
          GMath.ptDist(onCurve.getX(), onCurve.getY(), startCenter.getX(), startCenter.getY()),
      );
      if (maxError < error) {
        maxError = error;
        splitT = roots[0];
      }
    }
    if (null != roots[1] && roots[1] < joinT && roots[1] > 0) {
      const onCurve = new Point(
        GMath.getCurveAtT(start.getX(), end.getX(), control.getX(), roots[1]),
        GMath.getCurveAtT(start.getY(), end.getY(), control.getY(), roots[1]),
      );
      const error = Math.abs(
        startRadius -
          GMath.ptDist(onCurve.getX(), onCurve.getY(), startCenter.getX(), startCenter.getY()),
      );
      if (maxError < error) {
        maxError = error;
        splitT = roots[1];
      }
    }
    roots = [];
    GMath.getQuadraticRoots(
      a,
      -2 * sqStartToControl + sqControlToEnd + mixed,
      sqStartToControl + mixed - endRadius * startToControl * sinTurn,
      roots,
    );
    if (null != roots[0] && roots[0] < 1 && roots[0] > joinT) {
      const onCurve = new Point(
        GMath.getCurveAtT(start.getX(), end.getX(), control.getX(), roots[0]),
        GMath.getCurveAtT(start.getY(), end.getY(), control.getY(), roots[0]),
      );
      const error = Math.abs(
        endRadius -
          GMath.ptDist(onCurve.getX(), onCurve.getY(), endCenter.getX(), endCenter.getY()),
      );
      if (maxError < error) {
        maxError = error;
        splitT = roots[0];
      }
    }
    if (null != roots[1] && roots[1] < 1 && roots[1] > joinT) {
      const onCurve = new Point(
        GMath.getCurveAtT(start.getX(), end.getX(), control.getX(), roots[1]),
        GMath.getCurveAtT(start.getY(), end.getY(), control.getY(), roots[1]),
      );
      const error = Math.abs(
        endRadius -
          GMath.ptDist(onCurve.getX(), onCurve.getY(), endCenter.getX(), endCenter.getY()),
      );
      if (maxError < error) {
        maxError = error;
        splitT = roots[1];
      }
    }
    if (maxError > tolerance && depth < VertexOffsetter.MAX_RECURS) {
      const leftX = new Float64Array(3);
      const leftY = new Float64Array(3);
      const rightX = new Float64Array(3);
      const rightY = new Float64Array(3);
      GMath.divideQuadraticCurve(start.getX(), control.getX(), end.getX(), splitT, leftX, rightX);
      GMath.divideQuadraticCurve(start.getY(), control.getY(), end.getY(), splitT, leftY, rightY);
      this.addCurveToPolyline(
        start,
        new Point(leftX[1] as number, leftY[1] as number),
        new Point(leftX[2] as number, leftY[2] as number),
        tolerance,
        depth,
      );
      this.addCurveToPolyline(
        new Point(rightX[0] as number, rightY[0] as number),
        new Point(rightX[1] as number, rightY[1] as number),
        end,
        tolerance,
        depth,
      );
    } else {
      const join = new Point(
        start.getX() + startOffset * (dirIn.getX() + dirChord.getX()),
        start.getY() + startOffset * (dirIn.getY() + dirChord.getY()),
      );
      let startBulge = sinHalfStart / (cosHalfStart + 1);
      if (
        GMath.segmentSide(
          start.getX(),
          start.getY(),
          join.getX(),
          join.getY(),
          startCenter.getX(),
          startCenter.getY(),
        ) > 0
      )
        startBulge = -startBulge;
      this._polyline.insertSegment(new PolySegment(start, startBulge, startCenter, startRadius));
      let endBulge = sinHalfEnd / (cosHalfEnd + 1);
      if (startBulge < 0) endBulge = -endBulge;
      this._polyline.insertSegment(new PolySegment(join, endBulge, endCenter, endRadius));
    }
  }

  /** Adds a cubic curve, split at its extrema and inflections, as arcs. */
  addCubicCurveToPolyline(
    start: Point,
    control1: Point,
    control2: Point,
    end: Point,
    tolerance: number,
  ): void {
    const derivX = new Float64Array(3);
    const derivY = new Float64Array(3);
    GMath.getBezierDerivativeEquationCoeffs(
      start.getX(),
      start.getY(),
      end.getX(),
      end.getY(),
      control1.getX(),
      control1.getY(),
      control2.getX(),
      control2.getY(),
      derivX,
      derivY,
    );
    const splits: number[] = [];
    const splitCount = GMath.getCubicCurveSplits(derivX, derivY, splits);
    const xs = new Float64Array(4);
    const ys = new Float64Array(4);
    for (let i = 0; i < splitCount - 1; ++i) {
      const t0 = splits[i] as number;
      const t1 = splits[i + 1] as number;
      GMath.getCtrlPts(start.getX(), end.getX(), control1.getX(), control2.getX(), t0, t1, xs);
      GMath.getCtrlPts(start.getY(), end.getY(), control1.getY(), control2.getY(), t0, t1, ys);
      this._addCubicSegmToPolyline(xs, ys, tolerance, 0);
    }
  }

  _isQudraticCurveFlat(start: Point, control: Point, end: Point, tolerance: number): boolean {
    const midX = GMath.getCurveAtT(start.getX(), end.getX(), control.getX(), 0.5);
    const midY = GMath.getCurveAtT(start.getY(), end.getY(), control.getY(), 0.5);
    return (
      GMath.ptSqrDist(
        midX,
        midY,
        (start.getX() + end.getX()) / 2,
        (start.getY() + end.getY()) / 2,
      ) <=
      tolerance * tolerance
    );
  }

  _isCubicCurveFlat(xs: ArrayLike<number>, ys: ArrayLike<number>, tolerance: number): boolean {
    const x0 = xs[0] as number;
    const x1 = xs[1] as number;
    const x2 = xs[2] as number;
    const x3 = xs[3] as number;
    const y0 = ys[0] as number;
    const y1 = ys[1] as number;
    const y2 = ys[2] as number;
    const y3 = ys[3] as number;
    let ux = 3 * x1 - 2 * x0 - x3;
    ux *= ux;
    let uy = 3 * y1 - 2 * y0 - y3;
    uy *= uy;
    let vx = 3 * x2 - 2 * x3 - x0;
    vx *= vx;
    let vy = 3 * y2 - 2 * y3 - y0;
    if (ux < vx) ux = vx;
    if (uy < (vy *= vy)) uy = vy;
    return ux + uy <= 16 * tolerance * tolerance;
  }

  /**
   * Adds a cubic piece without inflections as one arc through its ends
   * and the incenter of its control triangle, halving it while the arc
   * is further than `tolerance` from the curve.
   */
  _addCubicSegmToPolyline(
    xs: Float64Array,
    ys: Float64Array,
    tolerance: number,
    depth: number,
  ): void {
    ++depth;
    const x0 = xs[0] as number;
    const y0 = ys[0] as number;
    const x3 = xs[3] as number;
    const y3 = ys[3] as number;
    const x1 = xs[1] as number;
    const y1 = ys[1] as number;
    const x2 = xs[2] as number;
    const y2 = ys[2] as number;
    if (this._isCubicCurveFlat(xs, ys, tolerance)) {
      this._polyline.insertSegment(new PolySegment(new Point(x0, y0), 0));
      return;
    }
    // The apex of the control triangle: where the end tangents meet.
    let apex: Point;
    const hasStartTangent = !GMath.isEqualEps(x0, x1) || !GMath.isEqualEps(y0, y1);
    const hasEndTangent = !GMath.isEqualEps(x3, x2) || !GMath.isEqualEps(y3, y2);
    if (hasStartTangent && hasEndTangent) {
      apex = GMath.getIntersectionPoint(x0, y0, x1, y1, x2, y2, x3, y3, []) || new Point(x1, y1);
    } else if (hasStartTangent) apex = new Point(x1, y1);
    else {
      if (!hasEndTangent) {
        this._polyline.insertSegment(new PolySegment(new Point(x0, y0), 0));
        return;
      }
      apex = new Point(x2, y2);
    }
    const chord = GMath.ptDist(x0, y0, x3, y3);
    const startToApex = GMath.ptDist(x0, y0, apex.getX(), apex.getY());
    const endToApex = GMath.ptDist(x3, y3, apex.getX(), apex.getY());
    const perimeter = chord + startToApex + endToApex;
    const incenterX = (x0 * endToApex + x3 * startToApex + apex.getX() * chord) / perimeter;
    const incenterY = (y0 * endToApex + y3 * startToApex + apex.getY() * chord) / perimeter;
    if (
      GMath.isEqualEps(x0, incenterX) ||
      GMath.isEqualEps(y0, incenterY) ||
      GMath.isEqualEps(x3, incenterX) ||
      GMath.isEqualEps(y3, incenterY)
    ) {
      this._polyline.insertSegment(new PolySegment(new Point(x0, y0), 0));
      return;
    }
    // The circle through start, incenter and end.
    const slopeStart = (y0 - incenterY) / (x0 - incenterX);
    const slopeEnd = (y3 - incenterY) / (x3 - incenterX);
    const centerX =
      (slopeStart * slopeEnd * (y0 - y3) +
        slopeEnd * (x0 + incenterX) -
        slopeStart * (incenterX + x3)) /
      2 /
      (slopeEnd - slopeStart);
    const centerY = (-1 / slopeStart) * (centerX - (x0 + incenterX) / 2) + (y0 + incenterY) / 2;
    const radius = GMath.ptDist(x0, y0, centerX, centerY);
    // The squared distance of the curve from the center is a degree 6
    // polynomial in t; its extrema give the largest deviation from the arc.
    const dx1 = x1 - x0;
    const cx = 3 * dx1;
    const dy1 = y1 - y0;
    const cy = 3 * dy1;
    let d2 = x2 - x1 - dx1;
    const bx = 3 * d2;
    const bx2 = 2 * d2;
    const by = 3 * (d2 = y2 - y1 - dy1);
    const by2 = 2 * d2;
    const ax = x3 - x2 - dx1 - bx2;
    const ay = y3 - y2 - dy1 - by2;
    const ox = x0 - centerX;
    const oy = y0 - centerY;
    const poly = new Float64Array(7);
    poly[0] = ax * ax + ay * ay;
    poly[1] = 2 * (ax * bx + ay * by);
    poly[2] = bx * bx + by * by + 2 * (ax * cx + ay * cy);
    poly[3] = 2 * (ax * ox + bx * cx + ay * oy + by * cy);
    poly[4] = cx * cx + cy * cy + 2 * (bx * ox + by * oy);
    poly[5] = 2 * (cx * ox + cy * oy);
    poly[6] = ox * ox + oy * oy;
    const deriv1 = new Float64Array(6);
    GMath.getCoeffPolyDeriv(poly, 6, deriv1);
    const deriv2 = new Float64Array(5);
    GMath.getCoeffPolyDeriv(deriv1, 5, deriv2);
    const deriv3 = new Float64Array(4);
    GMath.getCoeffPolyDeriv(deriv2, 4, deriv3);
    const unit = new Float64Array(6);
    GMath.inversePolyUnaryInterval(deriv1, 5, unit);
    let valueLo = NO_NUMBER;
    let valueHi = NO_NUMBER;
    let sturmCache: SturmCache = NO_NUMBER as unknown as SturmCache;
    let sturmValues: SturmCache = NO_NUMBER as unknown as SturmCache;
    let rootCount = GMath.estimPositiveRootsDescartes(unit, 5);
    let maxError = 0;
    const sturm: NumberList[] = [];
    let lo = NO_NUMBER;
    let hi = NO_NUMBER;
    if (rootCount > 0) {
      lo = 0;
      hi = 1;
      valueLo = GMath.evalPoly(deriv1, 5, lo) as number;
      if (GMath.isEqualEps(valueLo, 0)) {
        lo += 0.005;
        valueLo = GMath.evalPoly(deriv1, 5, lo) as number;
      }
      valueHi = GMath.evalPoly(deriv1, 5, hi) as number;
      if (GMath.isEqualEps(valueHi, 0)) {
        hi -= 0.005;
        valueHi = GMath.evalPoly(deriv1, 5, hi) as number;
      }
      if (rootCount > 1) {
        GMath.getSturmPRS(deriv1, 5, deriv2, sturm);
        sturmCache = [];
        sturmValues = [valueLo, valueHi];
        rootCount = GMath.countRootsNSturm(
          deriv1,
          5,
          deriv2,
          lo,
          hi,
          sturm,
          sturmCache,
          sturmValues,
        );
      }
    }
    if (0 == rootCount) {
      // No extremum: the arc is exact enough.
    } else if (1 == rootCount) {
      let t = GMath.locateByNewton(lo, hi, valueLo, valueHi, deriv1, 5, deriv2, deriv3, 0.005);
      if (null == t) t = (lo + hi) / 2;
      const px = GMath.evalCubic(ax, bx, cx, x0, t);
      const py = GMath.evalCubic(ay, by, cy, y0, t);
      maxError = Math.abs(GMath.ptDist(px, py, centerX, centerY) - radius);
    } else {
      const intervals: RootInterval[] = [];
      GMath.locRootsSturm(
        deriv1,
        5,
        deriv2,
        lo,
        hi,
        sturm,
        rootCount,
        sturmCache,
        sturmValues,
        intervals,
        0,
      );
      for (let i = 0; i < intervals.length; ++i) {
        const interval = intervals[i] as RootInterval;
        let t = GMath.locateByNewton(
          interval[0],
          interval[1],
          interval[2] as number,
          interval[3] as number,
          deriv1,
          5,
          deriv2,
          deriv3,
          0.005,
          sturm,
        );
        if (null == t) t = (interval[0] + interval[1]) / 2;
        const px = GMath.evalCubic(ax, bx, cx, x0, t);
        const py = GMath.evalCubic(ay, by, cy, y0, t);
        const error = Math.abs(GMath.ptDist(px, py, centerX, centerY) - radius);
        if (error > maxError) maxError = error;
      }
    }
    if (maxError > tolerance && depth < VertexOffsetter.MAX_RECURS) {
      const leftX = new Float64Array(4);
      const leftY = new Float64Array(4);
      const rightX = new Float64Array(4);
      const rightY = new Float64Array(4);
      GMath.getCtrlPtsCasteljau(x0, x1, x2, x3, 0.5, null, leftX, rightX);
      GMath.getCtrlPtsCasteljau(y0, y1, y2, y3, 0.5, null, leftY, rightY);
      this._addCubicSegmToPolyline(leftX, leftY, tolerance, depth);
      this._addCubicSegmToPolyline(rightX, rightY, tolerance, depth);
    } else {
      const halfChordRatio = chord / 2 / radius;
      let bulge = halfChordRatio / (Math.sqrt(1 - halfChordRatio * halfChordRatio) + 1);
      if (GMath.segmentSide(x0, y0, x3, y3, centerX, centerY) > 0) bulge = -bulge;
      this._polyline.insertSegment(
        new PolySegment(new Point(x0, y0), bulge, new Point(centerX, centerY), radius),
      );
    }
  }

  /**
   * Reads one sub-path from the source into _polyline. `startVertex` is
   * the Move left over from the previous call. Returns the Move of the
   * next sub-path (a synthetic one after a Close), or null at the end.
   */
  generatePolyLine(tolerance: number, startVertex: Vertex | null): Vertex | null {
    let nextMove: Vertex | null = null;
    let first = startVertex;
    let previous = first;
    let vertex = new Vertex();
    let reading = true;
    while (reading && this._source.readVertex(vertex)) {
      switch (vertex.command) {
        case Vertex.Command.Move:
          if (first && this._polyline.count) {
            nextMove = vertex;
            reading = false;
          } else {
            first = previous = vertex;
            vertex = new Vertex();
          }
          break;
        case Vertex.Command.Line:
          if (previous) {
            this._polyline.insertSegment(new PolySegment(new Point(previous.x, previous.y), 0));
          }
          previous = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Curve:
          if (previous) {
            const start = new Point(previous.x, previous.y);
            previous = vertex;
            vertex = new Vertex();
            if (this._source.readVertex(vertex)) {
              this.addCurveToPolyline(
                start,
                new Point(vertex.x, vertex.y),
                new Point(previous.x, previous.y),
                tolerance,
                0,
              );
              vertex = new Vertex();
            }
          } else {
            previous = vertex;
            vertex = new Vertex();
          }
          break;
        case Vertex.Command.Curve2:
          if (previous) {
            const start = new Point(previous.x, previous.y);
            const end = new Point(vertex.x, vertex.y);
            previous = vertex;
            vertex = new Vertex();
            const control2 = new Vertex();
            if (this._source.readVertex(vertex) && this._source.readVertex(control2)) {
              this.addCubicCurveToPolyline(
                start,
                new Point(vertex.x, vertex.y),
                new Point(control2.x, control2.y),
                end,
                tolerance,
              );
              vertex = new Vertex();
            }
          } else {
            previous = vertex;
            vertex = new Vertex();
          }
          break;
        case Vertex.Command.Close:
          if (previous) {
            this._polyline.insertSegment(new PolySegment(new Point(previous.x, previous.y), 0));
            previous = null;
          }
          this._polyline.closed = true;
          this._polyline.insertSegment(new PolySegment(this._polyline.head.point, 0));
          nextMove = new Vertex();
          nextMove.command = Vertex.Command.Move;
          nextMove.x = this._polyline.head.point.getX();
          nextMove.y = this._polyline.head.point.getY();
          reading = false;
          break;
        default:
          // The old message referred to an undeclared variable.
          throw new ReferenceError("vertex is not defined");
      }
    }
    if (previous && this._polyline.count) {
      this._polyline.insertSegment(new PolySegment(new Point(previous.x, previous.y), 0));
      if (
        GMath.isEqualEps(previous.x, this._polyline.head.point.getX()) &&
        GMath.isEqualEps(previous.y, this._polyline.head.point.getY())
      )
        this._polyline.closed = true;
    }
    return nextMove;
  }

  /**
   * Offsets _polyline into _polyoutset and _polyinset: offsets every
   * segment, joins an open path's two sides with caps, trims the joins
   * and drops the parts that come closer to the source than the offset.
   */
  generatePolyOffset(
    offset: number,
    makeInset: boolean,
    makeOutset: boolean,
    tolerance: number,
  ): void {
    let segment: PolyOffsetSegment | null;
    let outset: OffsetPolyline = null as unknown as OffsetPolyline;
    let inset: OffsetPolyline = null as unknown as OffsetPolyline;
    if (makeOutset) outset = new PolySegmentContainer();
    if (makeInset) inset = new PolySegmentContainer();
    let joined = false;
    let current = this._polyline.head;
    for (let i = 0; i < this._polyline.count; ++i) {
      if (makeOutset && (segment = this._offsetPolySegment(current, -offset, tolerance)))
        outset.insertSegment(segment);
      if (makeInset && (segment = this._offsetPolySegment(current, offset, tolerance)))
        inset.insertSegment(segment);
      current = current.next;
    }
    if (makeOutset && makeInset && !this._polyline.closed) {
      // An open path with both sides: one outline around it, the outset,
      // a cap, the reversed inset and the other cap.
      this._genCap(
        inset.head.point,
        outset.head.point,
        this._polyline.head.point,
        this._polyline.head.next ? this._polyline.head.next.point : null,
        true,
        offset,
        outset,
        this._cap,
        tolerance,
      );
      this._genCap(
        inset.end.point2,
        outset.end.point2,
        this._polyline.end.point,
        this._polyline.end.previous ? this._polyline.end.previous.point : null,
        false,
        offset,
        inset,
        this._cap,
        tolerance,
      );
      // (The old code also set an unused `makeInset` property here.)
      makeInset = false;
      joined = true;
      const reversed: OffsetPolyline = new PolySegmentContainer();
      let source = inset.end;
      for (let i = 0; i < inset.count; ++i) {
        reversed.insertSegment(
          new PolyOffsetSegment(
            0 == i ? this._polyline.head.point : (source.next as PolyOffsetSegment).basepoint,
            source.point2,
            source.point,
            this._cap === LineCap.Round && 0 === i ? source.bulge : -source.bulge,
            source.center,
            source.radius,
            source.isCap,
          ),
        );
        source = source.previous as PolyOffsetSegment;
      }
      outset.appendContainer(reversed);
    }
    const trimmedOutset = new PolySegmentContainer();
    const trimmedInset = new PolySegmentContainer();
    if (makeOutset) this._trimOffsetPoly(outset, -offset, trimmedOutset);
    if (makeInset) this._trimOffsetPoly(inset, offset, trimmedInset);
    const outsetHits: IntersectionPt[] = [];
    const insetHits: IntersectionPt[] = [];
    if (makeInset && makeOutset)
      this._calcIntersectionPoints(trimmedOutset, trimmedInset, outsetHits, insetHits);
    if (makeOutset) this._calcSelfIntersectionPoints(trimmedOutset, outsetHits, joined);
    if (makeInset) this._calcSelfIntersectionPoints(trimmedInset, insetHits);
    if (outsetHits.length > 0) this._sortInsertsectionPoints(outsetHits);
    if (insetHits.length > 0) this._sortInsertsectionPoints(insetHits);
    const outsetParts: Polyline[] = [];
    const insetParts: Polyline[] = [];
    if (makeOutset) {
      if (outsetHits.length > 0) {
        const split = this._splitForClipping(trimmedOutset, outsetHits);
        for (let i = 0; i < split.length; ++i) {
          const part = split[i] as Polyline;
          const partHits: IntersectionPt[] = [];
          const sourceHits: IntersectionPt[] = [];
          this._calcIntersectionPoints(part, this._polyline, partHits, sourceHits);
          if (0 == partHits.length) outsetParts.push(part);
          else if (!this._polyline.closed) {
            let nearEnd = false;
            for (let j = 0; j < partHits.length; ++j) {
              if ((partHits[j] as IntersectionPt).segm.isCap) {
                nearEnd = true;
                break;
              }
            }
            for (let j = 0; j < sourceHits.length && !nearEnd; ++j) {
              const hit = sourceHits[j] as IntersectionPt;
              if (0 == hit.segmIdx || hit.segmIdx == this._polyline.count - 1) nearEnd = true;
            }
            if (nearEnd) this._excludeCircleInside(part, partHits, sourceHits, offset, outsetParts);
          }
        }
      } else outsetParts[0] = trimmedOutset;
    }
    if (makeInset) {
      if (insetHits.length > 0) {
        const split = this._splitForClipping(trimmedInset, insetHits);
        for (let i = 0; i < split.length; ++i) {
          const part = split[i] as Polyline;
          const partHits: IntersectionPt[] = [];
          const sourceHits: IntersectionPt[] = [];
          this._calcIntersectionPoints(part, this._polyline, partHits, sourceHits);
          if (0 == partHits.length) insetParts.push(part);
          else if (!this._polyline.closed) {
            // The old code looped up to `sourceHits.count`, which an array
            // doesn't have, and dropped every such part (BUGS-FIXED.md
            // "BUG-012 Offset drops inset parts of an open path that come
            // near the source").
            let nearEnd = false;
            for (let j = 0; j < sourceHits.length; ++j) {
              const hit = sourceHits[j] as IntersectionPt;
              if (0 == hit.segmIdx || hit.segmIdx == this._polyline.count - 1) {
                nearEnd = true;
                break;
              }
            }
            if (nearEnd) this._excludeCircleInside(part, partHits, sourceHits, offset, insetParts);
          }
        }
      } else insetParts[0] = trimmedInset;
    }
    if ((makeInset && makeOutset) || this._polyline.closed || joined) {
      if (outsetParts && outsetParts.length > 1)
        this._gcppFilter(outsetParts, this._polyline, offset, 3 * tolerance, this._polyoutset);
      else this._polyoutset = outsetParts;
      if (insetParts && insetParts.length > 1)
        this._gcppFilter(insetParts, this._polyline, offset, 3 * tolerance, this._polyinset);
      else this._polyinset = insetParts;
    } else {
      this._gcppClipping(outsetParts, this._polyline, offset, this._polyoutset);
      this._gcppClipping(insetParts, this._polyline, offset, this._polyinset);
    }
  }

  /** Turns the offset polylines into vertex containers (_pieces). */
  generateOffset(makeInset: boolean, makeOutset: boolean, tolerance: number): void {
    const pieces: Piece[] = [];
    // The old code had a separate branch for open paths with both sides,
    // with the same order (outset first), so one path covers both.
    if (makeOutset) this._genCurves(this._polyoutset, pieces, tolerance);
    if (makeInset) this._genCurves(this._polyinset, pieces, tolerance);
    this._pieces = this._mergePieces(pieces);
  }

  /** Joins pieces whose ends meet exactly and makes one container per joined run. */
  _mergePieces(pieces: Piece[]): VertexContainer[] {
    const result: VertexContainer[] = [];
    while (pieces.length > 0) {
      let piece = pieces[0] as Piece;
      pieces.splice(0, 1);
      let merged =
        piece.stPt.getX() != piece.endPt.getX() || piece.stPt.getY() != piece.endPt.getY();
      while (merged) {
        merged = false;
        for (let i = pieces.length - 1; i >= 0; --i) {
          const other = pieces[i] as Piece;
          if (other.stPt.getX() == piece.endPt.getX() && other.stPt.getY() == piece.endPt.getY()) {
            piece.endPt = other.endPt;
            for (const v of other.vrt) piece.vrt.push(v);
            merged = true;
            pieces.splice(i, 1);
          } else if (
            piece.stPt.getX() == other.endPt.getX() &&
            piece.stPt.getY() == other.endPt.getY()
          ) {
            other.endPt = piece.endPt;
            for (const v of piece.vrt) other.vrt.push(v);
            piece = other;
            merged = true;
            pieces.splice(i, 1);
          }
        }
      }
      const container = new VertexContainer();
      container.addVertex(Vertex.Command.Move, piece.stPt.getX(), piece.stPt.getY());
      for (let i = 0; i < piece.vrt.length; ++i) {
        const v = piece.vrt[i] as Piece["vrt"][number];
        container.addVertex(v.c, v.x, v.y);
      }
      result.push(container);
    }
    return result;
  }

  /**
   * The segment offset by `offset` (signed: negative for the outset), or
   * null when it vanishes (a zero-length line, an arc whose radius equals
   * the offset, an open path's last vertex).
   */
  _offsetPolySegment(
    segment: PolySegment,
    offset: number,
    tolerance: number,
  ): PolyOffsetSegment | null {
    let result: PolyOffsetSegment | null = null;
    const distance = Math.abs(offset);
    const x = segment.point.getX();
    const y = segment.point.getY();
    let nextX: number;
    let nextY: number;
    if (segment.bulge) {
      if (segment.radius) {
        let radius = segment.radius;
        let scale: number | null = null;
        if (offset * segment.bulge > 0) scale = (radius += distance) / segment.radius;
        else if (!GMath.isEqualEps(segment.radius, distance, tolerance)) {
          if (segment.radius > distance) scale = (radius -= distance) / segment.radius;
          else {
            // The arc flips through its center.
            radius = distance - segment.radius;
            scale = distance / segment.radius;
          }
        }
        if (null != scale) {
          const cx = segment.center.getX();
          const cy = segment.center.getY();
          if (segment.next) {
            nextX = segment.next.point.getX();
            nextY = segment.next.point.getY();
          } else {
            nextX = this._polyline.head.point.getX();
            nextY = this._polyline.head.point.getY();
          }
          const from = new Point(cx + scale * (x - cx), cy + scale * (y - cy));
          const to = new Point(cx + scale * (nextX - cx), cy + scale * (nextY - cy));
          result = new PolyOffsetSegment(
            segment.point,
            from,
            to,
            segment.bulge,
            segment.center,
            radius,
          );
        }
      }
    } else if (segment.next || this._polyline.closed) {
      if (segment.next) {
        nextX = segment.next.point.getX();
        nextY = segment.next.point.getY();
      } else {
        nextX = this._polyline.head.point.getX();
        nextY = this._polyline.head.point.getY();
      }
      const length = GMath.ptDist(x, y, nextX, nextY);
      if (!GMath.isEqualEps(length, 0)) {
        const normal = new Point(
          (-offset * (nextY - y)) / length,
          (-offset * (x - nextX)) / length,
        );
        const from = new Point(x + normal.getX(), y + normal.getY());
        const to = new Point(nextX + normal.getX(), nextY + normal.getY());
        result = new PolyOffsetSegment(segment.point, from, to, 0);
      }
    }
    return result;
  }

  /**
   * Intersects two consecutive offset segments (as infinite lines or
   * full circles) and classifies the hit on each.
   */
  _insersectOffsetSegments(
    first: PolyOffsetSegment,
    second: PolyOffsetSegment,
    result: IntersectionResult,
  ): void {
    if (0 == first.bulge && 0 == second.bulge) {
      const params: (number | null)[] = [null, null];
      const point = GMath.getIntersectionPoint(
        first.point.getX(),
        first.point.getY(),
        first.point2.getX(),
        first.point2.getY(),
        second.point.getX(),
        second.point.getY(),
        second.point2.getX(),
        second.point2.getY(),
        params as number[],
      );
      result.point = point;
      if (point) {
        this._fillLineIntType(params[0] as number, result.intTypes[0]);
        this._fillLineIntType(params[1] as number, result.intTypes[1]);
      }
    } else if ((0 != first.bulge && 0 == second.bulge) || (0 == first.bulge && 0 != second.bulge)) {
      const params: (number | null)[] = [null, null];
      let hitX: number | null = null;
      let hitY: number | null = null;
      let hitParam: number | null = null;
      if (0 == first.bulge) {
        const px = first.point.getX();
        const py = first.point.getY();
        const dx = first.point2.getX() - first.point.getX();
        const dy = first.point2.getY() - first.point.getY();
        GMath.circleLineIntersection(
          px,
          py,
          dx,
          dy,
          second.center.getX(),
          second.center.getY(),
          second.radius,
          params as number[],
        );
        if (null != params[0]) {
          hitX = px + dx * params[0];
          hitY = py + dy * params[0];
          hitParam = params[0];
        }
        if (null != params[0] && null != params[1]) {
          // Of two hits, the one nearer the source vertex.
          const otherX = px + dx * params[1];
          const otherY = py + dy * params[1];
          const sqDist = GMath.ptSqrDist(
            hitX as number,
            hitY as number,
            second.basepoint.getX(),
            second.basepoint.getY(),
          );
          if (
            GMath.ptSqrDist(otherX, otherY, second.basepoint.getX(), second.basepoint.getY()) <
            sqDist
          ) {
            hitX = otherX;
            hitY = otherY;
            hitParam = params[1];
          }
        }
        if (null != hitParam) {
          result.point = new Point(hitX as number, hitY as number);
          this._fillLineIntType(hitParam, result.intTypes[0]);
          this._fillArcIntType(second, hitX as number, hitY as number, result.intTypes[1]);
        }
      } else {
        const px = second.point.getX();
        const py = second.point.getY();
        const dx = second.point2.getX() - second.point.getX();
        const dy = second.point2.getY() - second.point.getY();
        GMath.circleLineIntersection(
          px,
          py,
          dx,
          dy,
          first.center.getX(),
          first.center.getY(),
          first.radius,
          params as number[],
        );
        if (null != params[0]) {
          hitX = px + dx * params[0];
          hitY = py + dy * params[0];
          hitParam = params[0];
        }
        if (null != params[0] && null != params[1]) {
          const otherX = px + dx * params[1];
          const otherY = py + dy * params[1];
          const sqDist = GMath.ptSqrDist(
            hitX as number,
            hitY as number,
            second.basepoint.getX(),
            second.basepoint.getY(),
          );
          if (
            GMath.ptSqrDist(otherX, otherY, second.basepoint.getX(), second.basepoint.getY()) <
            sqDist
          ) {
            hitX = otherX;
            hitY = otherY;
            hitParam = params[1];
          }
        }
        if (null != hitParam) {
          result.point = new Point(hitX as number, hitY as number);
          this._fillLineIntType(hitParam, result.intTypes[1]);
          this._fillArcIntType(first, hitX as number, hitY as number, result.intTypes[0]);
        }
      }
    } else {
      const hits: (Point | null)[] = [null, null];
      GMath.circleCircleIntersection(
        first.center.getX(),
        first.center.getY(),
        first.radius,
        second.center.getX(),
        second.center.getY(),
        second.radius,
        hits as Point[],
      );
      let index: number | null = null;
      if (null != hits[0]) index = 0;
      if (null != hits[0] && null != hits[1]) {
        const sqDist = GMath.ptSqrDist(
          hits[0].getX(),
          hits[0].getY(),
          second.basepoint.getX(),
          second.basepoint.getY(),
        );
        if (
          GMath.ptSqrDist(
            hits[1].getX(),
            hits[1].getY(),
            second.basepoint.getX(),
            second.basepoint.getY(),
          ) < sqDist
        )
          index = 1;
      }
      if (null !== index) {
        const hit = hits[index] as Point;
        result.point = hit;
        this._fillArcIntType(first, hit.getX(), hit.getY(), result.intTypes[0]);
        this._fillArcIntType(second, hit.getX(), hit.getY(), result.intTypes[1]);
      }
    }
  }

  _fillArcIntType(arc: PolyOffsetSegment, x: number, y: number, type: IntersectionType): void {
    const x1 = arc.point.getX();
    const y1 = arc.point.getY();
    const x2 = arc.point2.getX();
    const y2 = arc.point2.getY();
    const cx = arc.center.getX();
    const cy = arc.center.getY();
    if (GMath.segmentSide(x1, y1, x2, y2, x, y) == GMath.segmentSide(x1, y1, x2, y2, cx, cy)) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const scale = arc.radius / GMath.ptDist(midX, midY, cx, cy);
      const farX = cx + (cx - midX) * scale;
      const farY = cy + (cy - midY) * scale;
      if (
        GMath.segmentSide(x1, y1, farX, farY, x, y) == GMath.segmentSide(x1, y1, farX, farY, cx, cy)
      ) {
        type.FIP = true;
        type.PFIP = true;
      } else type.FIP = true;
    } else type.TIP = true;
  }

  _fillLineIntType(param: number, type: IntersectionType): void {
    if (param < 0) type.FIP = true;
    else if (param > 1) {
      type.FIP = true;
      type.PFIP = true;
    } else type.TIP = true;
  }

  /**
   * Copies the offset segments into `out`, joining each pair of
   * neighbours at their intersection, or with a round join arc around
   * the source vertex where they don't meet.
   */
  _trimOffsetPoly(input: OffsetPolyline, offset: number, out: Polyline): void {
    const eps = 1e-6;
    let joint: PolyOffsetSegment;
    let current = input.head;
    if (!current) return;
    out.insertSegment(
      new PolySegment(current.point, current.bulge, current.center, current.radius, current.isCap),
    );
    const hit = new IntersectionResult();
    for (let i = 0; i < input.count - 1; ++i) {
      joint = new PolyOffsetSegment(
        current.basepoint,
        out.end.point,
        current.point2,
        out.end.bulge,
        current.center,
        current.radius,
        current.isCap,
      );
      current = current.next as PolyOffsetSegment;
      if (
        GMath.isEqualEps(joint.point2.getX(), current.point.getX(), eps) &&
        GMath.isEqualEps(joint.point2.getY(), current.point.getY(), eps)
      ) {
        out.insertSegment(
          new PolySegment(
            current.point,
            current.bulge,
            current.center,
            current.radius,
            current.isCap,
          ),
        );
        continue;
      }
      hit.clear();
      this._insersectOffsetSegments(joint, current, hit);
      const [type0, type1] = hit.intTypes;
      if (0 == joint.bulge && 0 == current.bulge) {
        if (hit.point) {
          if ((type0.TIP && type1.TIP) || (type0.FIP && type1.FIP && type0.PFIP)) {
            out.insertSegment(new PolySegment(hit.point, 0)).isCap = current.isCap;
          } else {
            out.insertSegment(new PolySegment(joint.point2, 0)).isCap = joint.isCap;
            out.insertSegment(new PolySegment(current.point, 0)).isCap = current.isCap;
          }
        } else out.insertSegment(new PolySegment(joint.point2, 0)).isCap = joint.isCap;
      } else if (0 == joint.bulge && 0 != current.bulge) {
        if (hit.point) {
          if (
            (type0.TIP && type1.TIP) ||
            (type0.TIP && type1.FIP && !type1.PFIP) ||
            (type0.PFIP && type1.TIP)
          ) {
            const bulge = this._calculateBulge(
              hit.point.getX(),
              hit.point.getY(),
              current.point2.getX(),
              current.point2.getY(),
              current.center.getX(),
              current.center.getY(),
              current.bulge,
            );
            out.insertSegment(
              new PolySegment(hit.point, bulge, current.center, current.radius, current.isCap),
            );
          } else if (type0.PFIP && type1.FIP) {
            out.insertSegment(this._constructJoinArc(joint, current, true));
            out.insertSegment(this._copyArc(current));
          } else {
            out.insertSegment(new PolySegment(joint.point2, 0)).isCap = joint.isCap;
            out.insertSegment(this._copyArc(current));
          }
        } else {
          out.insertSegment(this._constructJoinArc(joint, current, true));
          out.insertSegment(this._copyArc(current));
        }
      } else if (0 != joint.bulge && 0 == current.bulge) {
        if (hit.point) {
          if (type0.TIP && type1.TIP) {
            out.end.bulge = this._calculateBulge(
              joint.point.getX(),
              joint.point.getY(),
              hit.point.getX(),
              hit.point.getY(),
              joint.center.getX(),
              joint.center.getY(),
              joint.bulge,
            );
            out.insertSegment(new PolySegment(hit.point, 0));
          } else if (type0.FIP && type1.FIP && !type1.PFIP) {
            out.insertSegment(this._constructJoinArc(joint, current, true));
            out.insertSegment(new PolySegment(current.point, 0)).isCap = current.isCap;
          } else {
            out.insertSegment(new PolySegment(joint.point2, 0)).isCap = joint.isCap;
            out.insertSegment(new PolySegment(current.point, 0)).isCap = current.isCap;
          }
        } else {
          out.insertSegment(this._constructJoinArc(joint, current, true));
          out.insertSegment(new PolySegment(current.point, 0)).isCap = current.isCap;
        }
      } else if (hit.point) {
        if ((type0.FIP && !type0.PFIP) || type1.PFIP) {
          out.insertSegment(this._constructJoinArc(joint, current, false));
          out.insertSegment(this._copyArc(current));
        } else {
          out.end.bulge = this._calculateBulge(
            joint.point.getX(),
            joint.point.getY(),
            hit.point.getX(),
            hit.point.getY(),
            joint.center.getX(),
            joint.center.getY(),
            joint.bulge,
          );
          const bulge = this._calculateBulge(
            hit.point.getX(),
            hit.point.getY(),
            current.point2.getX(),
            current.point2.getY(),
            current.center.getX(),
            current.center.getY(),
            current.bulge,
          );
          out.insertSegment(
            new PolySegment(hit.point, bulge, current.center, current.radius, current.isCap),
          );
        }
      } else {
        out.insertSegment(this._constructJoinArc(joint, current, true));
        out.insertSegment(this._copyArc(current));
      }
    }
    if (!this._polyline.closed) {
      out.insertSegment(new PolySegment(current.point2, 0)).isCap = current.isCap;
      return;
    }
    // Closed: join the last segment with the first, moving the start to
    // the joint where they meet. These segments don't carry isCap.
    joint = new PolyOffsetSegment(
      current.basepoint,
      out.end.point,
      current.point2,
      out.end.bulge,
      current.center,
      current.radius,
    );
    current = input.head;
    if (
      GMath.isEqualEps(joint.point2.getX(), current.point.getX(), eps) &&
      GMath.isEqualEps(joint.point2.getY(), current.point.getY(), eps)
    ) {
      out.insertSegment(new PolySegment(current.point, 0));
      return;
    }
    hit.clear();
    this._insersectOffsetSegments(joint, current, hit);
    const [type0, type1] = hit.intTypes;
    if (0 == joint.bulge && 0 == current.bulge) {
      if (hit.point) {
        if ((type0.TIP && type1.TIP) || (type0.FIP && type1.FIP && type0.PFIP)) {
          out.insertSegment(new PolySegment(hit.point, 0));
          out.head.point = hit.point;
        } else {
          out.insertSegment(new PolySegment(joint.point2, 0));
          out.insertSegment(new PolySegment(current.point, 0));
        }
      } else out.insertSegment(new PolySegment(joint.point2, 0));
    } else if (0 == joint.bulge && 0 != current.bulge) {
      if (hit.point) {
        if (
          (type0.TIP && type1.TIP) ||
          (type0.TIP && type1.FIP && !type1.PFIP) ||
          (type0.PFIP && type1.TIP)
        ) {
          const bulge = this._calculateBulge(
            hit.point.getX(),
            hit.point.getY(),
            current.point2.getX(),
            current.point2.getY(),
            current.center.getX(),
            current.center.getY(),
            current.bulge,
          );
          out.insertSegment(new PolySegment(hit.point, 0));
          out.head.point = hit.point;
          out.head.bulge = bulge;
        } else if (type0.PFIP && type1.FIP) {
          out.insertSegment(this._constructJoinArc(joint, current, true));
          out.insertSegment(new PolySegment(current.point, 0));
        } else {
          out.insertSegment(new PolySegment(joint.point2, 0));
          out.insertSegment(new PolySegment(current.point, 0));
        }
      } else {
        out.insertSegment(this._constructJoinArc(joint, current, true));
        out.insertSegment(new PolySegment(current.point, 0));
      }
    } else if (0 != joint.bulge && 0 == current.bulge) {
      if (hit.point) {
        if (type0.TIP && type1.TIP) {
          out.end.bulge = this._calculateBulge(
            joint.point.getX(),
            joint.point.getY(),
            hit.point.getX(),
            hit.point.getY(),
            joint.center.getX(),
            joint.center.getY(),
            joint.bulge,
          );
          out.insertSegment(new PolySegment(hit.point, 0));
          out.head.point = hit.point;
        } else if (type0.FIP && type1.FIP && !type1.PFIP) {
          out.insertSegment(this._constructJoinArc(joint, current, true));
          out.insertSegment(new PolySegment(current.point, 0));
        } else {
          out.insertSegment(new PolySegment(joint.point2, 0));
          out.insertSegment(new PolySegment(current.point, 0));
        }
      } else {
        out.insertSegment(this._constructJoinArc(joint, current, true));
        out.insertSegment(new PolySegment(current.point, 0));
      }
    } else if (hit.point) {
      if ((type0.FIP && !type0.PFIP) || type1.PFIP) {
        out.insertSegment(this._constructJoinArc(joint, current, false));
        out.insertSegment(new PolySegment(current.point, 0));
      } else {
        out.end.bulge = this._calculateBulge(
          joint.point.getX(),
          joint.point.getY(),
          hit.point.getX(),
          hit.point.getY(),
          joint.center.getX(),
          joint.center.getY(),
          joint.bulge,
        );
        out.insertSegment(new PolySegment(hit.point, 0));
        const bulge = this._calculateBulge(
          hit.point.getX(),
          hit.point.getY(),
          current.point2.getX(),
          current.point2.getY(),
          current.center.getX(),
          current.center.getY(),
          current.bulge,
        );
        out.head.point = hit.point;
        out.head.bulge = bulge;
      }
    } else {
      out.insertSegment(this._constructJoinArc(joint, current, true));
      out.insertSegment(new PolySegment(current.point, 0));
    }
  }

  /** A copy of an arc segment (point, bulge, center, radius, cap flag). */
  private _copyArc(segment: PolySegment): PolySegment {
    return new PolySegment(
      segment.point,
      segment.bulge,
      segment.center,
      segment.radius,
      segment.isCap,
    );
  }

  /**
   * The join from the end of `first` to the start of `second`: an arc
   * around the source vertex, or a line when they are collinear.
   * `outward` flips the arc's direction.
   */
  _constructJoinArc(
    first: PolyOffsetSegment,
    second: PolyOffsetSegment,
    outward: boolean,
  ): PolySegment {
    let side: number;
    if (first.bulge) {
      // Which side of the arc's end tangent the second segment starts on.
      const sign = first.bulge > 0 ? 1 : -1;
      const tx = (first.point2.getY() - first.center.getY()) * sign;
      const ty = (first.center.getX() - first.point2.getX()) * sign;
      side = -GMath.segmentSide(
        first.point2.getX(),
        first.point2.getY(),
        first.point2.getX() + tx,
        first.point2.getY() + ty,
        second.point.getX(),
        second.point.getY(),
      );
    } else
      side = -GMath.segmentSide(
        first.point.getX(),
        first.point.getY(),
        first.point2.getX(),
        first.point2.getY(),
        second.point.getX(),
        second.point.getY(),
      );
    if (!outward) side = -side;
    let bulge = 0;
    if (side)
      bulge = this._calculateBulge(
        first.point2.getX(),
        first.point2.getY(),
        second.point.getX(),
        second.point.getY(),
        second.basepoint.getX(),
        second.basepoint.getY(),
        side,
      );
    return bulge
      ? new PolySegment(
          first.point2,
          bulge,
          second.basepoint,
          GMath.ptDist(
            first.point2.getX(),
            first.point2.getY(),
            second.basepoint.getX(),
            second.basepoint.getY(),
          ),
        )
      : new PolySegment(first.point2, 0);
  }

  /**
   * The bulge of the arc around (cx,cy) from (x1,y1) to (x2,y2), with
   * the direction of `direction` (an earlier bulge or a side); a reflex
   * arc gets -1/bulge. 0 when the points are not equally far from the
   * center.
   */
  _calculateBulge(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    direction: number,
  ): number {
    const sqRadius1 = GMath.ptSqrDist(x1, y1, cx, cy);
    const sqRadius2 = GMath.ptSqrDist(x2, y2, cx, cy);
    let bulge = 0;
    if (GMath.isEqualEps(sqRadius1, sqRadius2, 1e-8)) {
      const sqMidDist = GMath.ptSqrDist((x1 + x2) / 2, (y1 + y2) / 2, cx, cy);
      if (GMath.isEqualEps(sqMidDist, 0, 1e-8)) bulge = 1;
      else {
        const cosHalf = Math.sqrt(sqMidDist / sqRadius1);
        bulge = Math.sqrt((1 - cosHalf) / (1 + cosHalf));
      }
      const radius = Math.sqrt(sqRadius1);
      bulge =
        ((y1 - cy) / radius) * ((x2 - cx) / radius) - ((x1 - cx) / radius) * ((y2 - cy) / radius) <
        0
          ? -bulge
          : bulge;
      if (direction && ((direction < 0 && bulge > 0) || (direction > 0 && bulge < 0)))
        bulge = -1 / bulge;
    }
    return bulge;
  }

  /** Intersections between the segments of two polylines. */
  _calcIntersectionPoints(
    a: Polyline,
    b: Polyline,
    hitsA: IntersectionPt[],
    hitsB: IntersectionPt[],
  ): void {
    let segmentB: PolySegment;
    let segmentA = a.head;
    for (let i = 0; i < a.count - 1; ++i) {
      segmentB = b.head;
      for (let j = 0; j < b.count - 1; ++j) {
        this._calcSegmIntersectionPoints(segmentA, segmentB, i, j, hitsA, hitsB);
        segmentB = segmentB.next;
      }
      segmentA = segmentA.next;
    }
  }

  /** Intersections of a polyline with itself; both hits of a pair go to `hits`. */
  _calcSelfIntersectionPoints(polyline: Polyline, hits: IntersectionPt[], joined?: boolean): void {
    let other: PolySegment;
    let segment = polyline.head;
    for (let i = 0; i < polyline.count - 2; ++i) {
      other = segment.next;
      for (let j = i + 1; j < polyline.count - 1; ++j) {
        // The first and the last segment of a closed outline meet at the
        // start; check them the other way round so that join is skipped.
        if (0 != i || j != polyline.count - 2 || (!joined && !this._polyline.closed))
          this._calcSegmIntersectionPoints(segment, other, i, j, hits, hits, j == i + 1);
        else this._calcSegmIntersectionPoints(other, segment, j, i, hits, hits, true);
        other = other.next;
      }
      segment = segment.next;
    }
  }

  /**
   * Intersections of two segments within their extents. `neighbours`
   * skips the point the segments share (the end of `a`, the start of `b`),
   * and for two lines skips the test entirely.
   */
  _calcSegmIntersectionPoints(
    a: PolySegment,
    b: PolySegment,
    indexA: number,
    indexB: number,
    hitsA: IntersectionPt[],
    hitsB: IntersectionPt[],
    neighbours?: boolean,
  ): void {
    if (a.bulge || b.bulge) {
      if (!a.bulge && b.bulge) {
        const params: (number | null)[] = [null, null];
        const dx = a.next.point.getX() - a.point.getX();
        const dy = a.next.point.getY() - a.point.getY();
        GMath.circleLineIntersection(
          a.point.getX(),
          a.point.getY(),
          dx,
          dy,
          b.center.getX(),
          b.center.getY(),
          b.radius,
          params as number[],
        );
        for (const param of params) {
          if (
            null != param &&
            param >= 0 &&
            param <= 1 &&
            (!neighbours || !GMath.isEqualEps(param, 1))
          ) {
            const x = a.point.getX() + dx * param;
            const y = a.point.getY() + dy * param;
            const bulge = this._calculateBulge(
              b.point.getX(),
              b.point.getY(),
              x,
              y,
              b.center.getX(),
              b.center.getY(),
              b.bulge,
            );
            if ((bulge < 0 && bulge >= b.bulge) || (bulge > 0 && bulge <= b.bulge)) {
              hitsA.push(new IntersectionPt(x, y, param, a, indexA));
              hitsB.push(new IntersectionPt(x, y, bulge, b, indexB));
            }
          }
        }
      } else if (a.bulge && !b.bulge) {
        const params: (number | null)[] = [null, null];
        const dx = b.next.point.getX() - b.point.getX();
        const dy = b.next.point.getY() - b.point.getY();
        GMath.circleLineIntersection(
          b.point.getX(),
          b.point.getY(),
          dx,
          dy,
          a.center.getX(),
          a.center.getY(),
          a.radius,
          params as number[],
        );
        for (const param of params) {
          if (
            null != param &&
            param >= 0 &&
            param <= 1 &&
            (!neighbours || !GMath.isEqualEps(param, 0))
          ) {
            const x = b.point.getX() + dx * param;
            const y = b.point.getY() + dy * param;
            const bulge = this._calculateBulge(
              a.point.getX(),
              a.point.getY(),
              x,
              y,
              a.center.getX(),
              a.center.getY(),
              a.bulge,
            );
            if ((bulge < 0 && bulge >= a.bulge) || (bulge > 0 && bulge <= a.bulge)) {
              hitsA.push(new IntersectionPt(x, y, bulge, a, indexA));
              hitsB.push(new IntersectionPt(x, y, param, b, indexB));
            }
          }
        }
      } else {
        const points: (Point | null)[] = [null, null];
        GMath.circleCircleIntersection(
          a.center.getX(),
          a.center.getY(),
          a.radius,
          b.center.getX(),
          b.center.getY(),
          b.radius,
          points as Point[],
        );
        for (const point of points) {
          if (
            point &&
            (!neighbours ||
              (!GMath.isEqualEps(point.getX(), b.point.getX()) &&
                !GMath.isEqualEps(point.getY(), b.point.getY())))
          ) {
            const bulgeA = this._calculateBulge(
              a.point.getX(),
              a.point.getY(),
              point.getX(),
              point.getY(),
              a.center.getX(),
              a.center.getY(),
              a.bulge,
            );
            if ((bulgeA < 0 && bulgeA >= a.bulge) || (bulgeA > 0 && bulgeA <= a.bulge)) {
              const bulgeB = this._calculateBulge(
                b.point.getX(),
                b.point.getY(),
                point.getX(),
                point.getY(),
                b.center.getX(),
                b.center.getY(),
                b.bulge,
              );
              if ((bulgeB < 0 && bulgeB >= b.bulge) || (bulgeB > 0 && bulgeB <= b.bulge)) {
                hitsA.push(new IntersectionPt(point.getX(), point.getY(), bulgeA, a, indexA));
                hitsB.push(new IntersectionPt(point.getX(), point.getY(), bulgeB, b, indexB));
              }
            }
          }
        }
      }
    } else if (!neighbours) {
      const params: (number | null)[] = [null, null];
      const point = GMath.getIntersectionPoint(
        a.point.getX(),
        a.point.getY(),
        a.next.point.getX(),
        a.next.point.getY(),
        b.point.getX(),
        b.point.getY(),
        b.next.point.getX(),
        b.next.point.getY(),
        params as number[],
      );
      const paramA = params[0] as number;
      const paramB = params[1] as number;
      if (point && 0 <= paramA && paramA <= 1 && 0 <= paramB && paramB <= 1) {
        hitsA.push(new IntersectionPt(point.getX(), point.getY(), paramA, a, indexA));
        hitsB.push(new IntersectionPt(point.getX(), point.getY(), paramB, b, indexB));
      }
    }
  }

  /** Sorts by segment, then along the segment (arcs with a negative bulge run backwards). */
  _sortInsertsectionPoints(hits: IntersectionPt[]): void {
    hits.sort((a, b) =>
      a.segmIdx != b.segmIdx
        ? a.segmIdx - b.segmIdx
        : a.slope > 0
          ? a.slope - b.slope
          : b.slope - a.slope,
    );
  }

  /** Cuts a polyline at the sorted intersections into separate polylines. */
  _splitForClipping(polyline: Polyline, hits: IntersectionPt[]): Polyline[] {
    const eps = 1e-4;
    let bulge: number;
    // Shared across iterations, as in the old code: an arc split reads
    // the cap flag the last line split left here (undefined before).
    let lineIsCap: boolean | undefined;
    let index = 0;
    let current = polyline.head;
    let original = current;
    let parts: Polyline[] = [];
    let p: number;
    let u: number;
    for (p = 0; p < hits.length; ++p) {
      const hit = hits[p] as IntersectionPt;
      const part = (parts[p] = new PolySegmentContainer());
      for (u = index; u < hit.segmIdx; ++u) {
        part.insertSegment(
          new PolySegment(
            current.point,
            current.bulge,
            current.center,
            current.radius,
            current.isCap,
          ),
        );
        original = current = original.next;
      }
      if (current.bulge) {
        if (
          GMath.isEqualEps(hit.x, current.point.getX(), eps) &&
          GMath.isEqualEps(hit.y, current.point.getY(), eps)
        ) {
          part.insertSegment(new PolySegment(current.point, 0)).isCap = current.isCap;
        } else {
          if (current == original) {
            part.insertSegment(
              new PolySegment(
                current.point,
                hit.slope,
                current.center,
                current.radius,
                current.isCap,
              ),
            );
          } else {
            // A second cut on the same arc: the bulge between the two cuts.
            const previousSlope = (hits[p - 1] as IntersectionPt).slope;
            bulge = (hit.slope - previousSlope) / (1 + hit.slope * previousSlope);
            part.insertSegment(
              new PolySegment(current.point, bulge, current.center, current.radius, current.isCap),
            );
          }
          part.insertSegment(new PolySegment(new Point(hit.x, hit.y), 0)).isCap = lineIsCap;
          bulge = (original.bulge - hit.slope) / (1 + original.bulge * hit.slope);
          current = new PolySegment(
            new Point(hit.x, hit.y),
            bulge,
            current.center,
            current.radius,
            current.isCap,
          );
        }
      } else {
        lineIsCap = current.isCap;
        part.insertSegment(new PolySegment(current.point, 0)).isCap = lineIsCap;
        if (!(
          GMath.isEqualEps(hit.x, current.point.getX(), eps) &&
          GMath.isEqualEps(hit.y, current.point.getY(), eps)
        )) {
          current = new PolySegment(new Point(hit.x, hit.y), 0);
          part.insertSegment(current).isCap = lineIsCap;
        }
      }
      index = u;
      if (
        original.next &&
        GMath.isEqualEps(hit.x, original.next.point.getX(), eps) &&
        GMath.isEqualEps(hit.y, original.next.point.getY(), eps)
      ) {
        ++index;
        original = current = original.next;
      }
    }
    const closed = this._polyline.closed;
    if (index != polyline.count - 1) {
      const part = (parts[p] = new PolySegmentContainer());
      for (u = index; u < polyline.count; ++u) {
        part.insertSegment(
          new PolySegment(
            current.point,
            current.bulge,
            current.center,
            current.radius,
            current.isCap,
          ),
        );
        original = current = original.next;
      }
    }
    if (1 == (parts[0] as Polyline).count) parts = parts.slice(1);
    if (closed) {
      const count = parts.length;
      const last = parts[count - 1] as Polyline;
      const lastPoint = last.end.point;
      const firstPoint = (parts[0] as Polyline).head.point;
      if (
        count > 1 &&
        GMath.isEqualEps(lastPoint.getX(), firstPoint.getX(), eps) &&
        GMath.isEqualEps(lastPoint.getY(), firstPoint.getY(), eps)
      ) {
        // The cut runs across the start: the last part continues into the first.
        last.deleteSegment(last.end);
        const first = parts[0] as Polyline;
        current = first.head;
        for (p = 0; p < first.count; ++p) {
          last.insertSegment(
            new PolySegment(
              current.point,
              current.bulge,
              current.center,
              current.radius,
              current.isCap,
            ),
          );
          current = current.next;
        }
        parts = parts.slice(1);
      } else (parts[0] as Polyline).closed = true;
    }
    const result: Polyline[] = [];
    for (p = 0; p < parts.length; ++p) {
      const part = parts[p] as Polyline;
      if (1 != part.count && 0 != part.count) result.push(part);
    }
    return result;
  }

  /**
   * For an open path: cuts out of `part` what lies inside the circles of
   * radius `offset` around the source intersections (around the path's
   * ends), adding the remaining pieces to `out`.
   */
  _excludeCircleInside(
    part: Polyline,
    partHits: IntersectionPt[],
    sourceHits: IntersectionPt[],
    offset: number,
    out: Polyline[],
  ): void {
    // Function-scoped in the old code and read across iterations: an arc
    // cut can use the line cut point (cutX, cutY) or the arc bulge
    // (firstBulge) of an earlier hit, undefined before there was one.
    // See QUESTIONS.md "Offsetter: the rest of a cut arc starts at an unset
    // cut point". Without an earlier line cut the rest of the arc starts at
    // the second circle hit instead of (undefined, undefined), which put NaN
    // into insets (BUGS-FIXED.md "BUG-012 Offset drops inset parts of an
    // open path that come near the source").
    let cutX: number | undefined;
    let cutY: number | undefined;
    let firstBulge: number | undefined;
    let index = 0;
    let pending: PolySegment | null = this._copyArc(part.head);
    let current = part.head;
    for (let u = 0; u < partHits.length; ++u) {
      const hit = partHits[u] as IntersectionPt;
      const sourceHit = sourceHits[u] as IntersectionPt;
      const piece: Polyline = new PolySegmentContainer();
      for (let a = index; a < hit.segmIdx - 1; ++a) {
        piece.insertSegment(pending as PolySegment);
        current = current.next;
        pending = this._copyArc(current);
      }
      const segment = pending as PolySegment;
      if (segment.bulge) {
        const points: (Point | null)[] = [null, null];
        GMath.circleCircleIntersection(
          current.center.getX(),
          current.center.getY(),
          current.radius,
          sourceHit.x,
          sourceHit.y,
          offset,
          points as Point[],
        );
        if (null != points[0]) {
          firstBulge = this._calculateBulge(
            segment.point.getX(),
            segment.point.getY(),
            points[0].getX(),
            points[0].getY(),
            current.center.getX(),
            current.center.getY(),
            segment.bulge,
          );
          if (
            (firstBulge < 0 && firstBulge > segment.bulge) ||
            (firstBulge > 0 && firstBulge < segment.bulge)
          ) {
            piece.insertSegment(
              new PolySegment(
                segment.point,
                firstBulge,
                current.center,
                current.radius,
                current.isCap,
              ),
            );
            piece.insertSegment(new PolySegment(points[0], 0)).isCap = segment.isCap;
            out.push(piece);
          } else if (piece.count) {
            piece.insertSegment(new PolySegment(segment.point, 0)).isCap = segment.isCap;
            out.push(piece);
          }
        }
        if (null == points[1] || segment.isCap) {
          if (piece.end) {
            pending = new PolySegment(piece.end.point, 0);
            pending.isCap = piece.end.isCap;
          }
        } else {
          const secondBulge = this._calculateBulge(
            segment.point.getX(),
            segment.point.getY(),
            points[1].getX(),
            points[1].getY(),
            current.center.getX(),
            current.center.getY(),
            segment.bulge,
          );
          if (
            (secondBulge < 0 &&
              secondBulge > segment.bulge &&
              secondBulge < (firstBulge as number)) ||
            (secondBulge > 0 && secondBulge < segment.bulge && secondBulge > (firstBulge as number))
          ) {
            const restBulge = (segment.bulge - secondBulge) / (1 + segment.bulge * secondBulge);
            pending = new PolySegment(
              undefined === cutX ? (points[1] as Point) : new Point(cutX, cutY as number),
              restBulge,
              current.center,
              current.radius,
              current.isCap,
            );
          } else if (piece.end) {
            pending = new PolySegment(piece.end.point, 0);
            pending.isCap = piece.end.isCap;
          }
        }
      } else {
        const params: (number | null)[] = [null, null];
        // current.next is null for the last segment of an open path offset
        // by 0 on both sides, which throws here as it did in the old code.
        // See QUESTIONS.md "Offsetter: offset 0 on an open path with both
        // sides throws".
        const dx = current.next.point.getX() - segment.point.getX();
        const dy = current.next.point.getY() - segment.point.getY();
        GMath.circleLineIntersection(
          segment.point.getX(),
          segment.point.getY(),
          dx,
          dy,
          sourceHit.x,
          sourceHit.y,
          offset,
          params as number[],
        );
        // null compares as 0 below, as it did in the old code.
        const param0 = params[0] as number;
        const param1 = params[1] as number;
        if (null != params[0]) {
          if (param0 <= 0) {
            if (piece.count) {
              piece.insertSegment(new PolySegment(segment.point, 0)).isCap = segment.isCap;
              out.push(piece);
            }
          } else if (param0 > 0 && param0 < 1 && !segment.isCap) {
            cutX = segment.point.getX() + dx * param0;
            cutY = segment.point.getY() + dy * param0;
            piece.insertSegment(new PolySegment(segment.point, 0)).isCap = segment.isCap;
            piece.insertSegment(new PolySegment(new Point(cutX, cutY), 0)).isCap = segment.isCap;
            out.push(piece);
          } else {
            piece.insertSegment(new PolySegment(segment.point, 0)).isCap = segment.isCap;
            piece.insertSegment(new PolySegment(current.next.point, 0)).isCap = current.next.isCap;
            out.push(piece);
          }
        }
        const isCap = segment.isCap;
        if (null != params[1] && param1 > param0 && param1 < 1 && !segment.isCap) {
          cutX = segment.point.getX() + dx * param1;
          cutY = segment.point.getY() + dy * param1;
          pending = new PolySegment(new Point(cutX, cutY), 0);
          pending.isCap = isCap;
        } else {
          if (piece.end) {
            pending = new PolySegment(piece.end.point, 0);
            pending.isCap = isCap;
          }
          if (param0 >= 1 || (param0 > 0 && isCap)) current = current.next;
        }
      }
      index = hit.segmIdx;
    }
    let tail: Polyline | null = null;
    for (let a = index; a < part.count; ++a) {
      if (pending) {
        if (!tail) {
          tail = new PolySegmentContainer();
          out.push(tail);
        }
        tail.insertSegment(pending);
        current = current.next;
        pending = current ? this._copyArc(current) : null;
      }
    }
  }

  /**
   * Keeps every part. (The old code also walked the parts and the source
   * without using what it found.)
   */
  _gcppClipping(parts: Polyline[], source: Polyline, offset: number, out: Polyline[]): void {
    void source;
    void offset;
    for (let i = 0; i < parts.length; ++i) out.push(parts[i] as Polyline);
  }

  /**
   * Keeps the parts that stay at least `offset - tolerance` away from
   * the source (cap segments are not checked).
   */
  _gcppFilter(
    parts: Polyline[],
    source: Polyline,
    offset: number,
    tolerance: number,
    out: Polyline[],
  ): void {
    const minSqDist = (offset - tolerance) * (offset - tolerance);
    const maxDist = offset + tolerance;
    const maxSqDist = maxDist * maxDist;
    for (let i = 0; i < parts.length; ++i) {
      const part = parts[i] as Polyline;
      let sourceSegment = source.head;
      let sqDist = maxSqDist;
      for (let p = 0; p < source.count - 1 && sqDist >= minSqDist; ++p) {
        let segment = part.head;
        for (let d = 0; d < part.count - 1 && sqDist >= minSqDist; ++d) {
          if (!segment.isCap)
            sqDist = this._getPlSegmSqrDist(
              sourceSegment,
              sourceSegment.next.point,
              segment,
              segment.next.point,
              maxDist,
            );
          segment = segment.next;
        }
        sourceSegment = sourceSegment.next;
      }
      if (sqDist >= minSqDist) out.push(part);
    }
  }

  /** Squared distance between two segments (lines or arcs), capped at maxDist^2 for arcs. */
  _getPlSegmSqrDist(
    a: PolySegment,
    aEnd: Point,
    b: PolySegment,
    bEnd: Point,
    maxDist: number,
  ): number {
    if (!a.bulge && !b.bulge) return GMath.getSegmToSegmSqrDist(a.point, aEnd, b.point, bEnd);
    if (!b.bulge)
      return this._getSegmToArcSqrDist(
        a.point,
        a.bulge,
        a.center,
        a.radius,
        aEnd,
        b.point,
        bEnd,
        maxDist * maxDist,
      );
    if (!a.bulge)
      return this._getSegmToArcSqrDist(
        b.point,
        b.bulge,
        b.center,
        b.radius,
        bEnd,
        a.point,
        aEnd,
        maxDist * maxDist,
      );
    return this._getArcToArcSqrDist(a, aEnd, b, bEnd, maxDist);
  }

  /** Squared distance between the arc (start, bulge, center, radius, end) and the segment p1-p2. */
  _getSegmToArcSqrDist(
    start: Point,
    bulge: number,
    center: Point,
    radius: number,
    end: Point,
    p1: Point,
    p2: Point,
    maxSqDist: number,
  ): number {
    if (GMath.isEqualEps(p1.getX(), p2.getX()) && GMath.isEqualEps(p1.getY(), p2.getY()))
      return this._getPtToArcSqrDist(start, bulge, center, radius, end, p1);
    let distance: number;
    let result = maxSqDist;
    const params: (number | null)[] = [null, null];
    const dx = p2.getX() - p1.getX();
    const dy = p2.getY() - p1.getY();
    GMath.circleLineIntersection(
      p1.getX(),
      p1.getY(),
      dx,
      dy,
      center.getX(),
      center.getY(),
      radius,
      params as number[],
    );
    if (null != params[0] && null == params[1]) {
      // The line touches the circle. (The old code used dx for y too, see
      // QUESTIONS.md "Offsetter: the tangent point of a line uses dx for y".)
      const touchX = params[0] * dx + p1.getX();
      const touchY = params[0] * dx + p1.getY();
      const touchBulge = this._calculateBulge(
        start.getX(),
        start.getY(),
        touchX,
        touchY,
        center.getX(),
        center.getY(),
        bulge,
      );
      const rx = touchX - p1.getX();
      const ry = touchY - p1.getY();
      if (
        ((rx < 0 && dx <= rx) || (rx >= 0 && dx >= rx)) &&
        ((ry < 0 && dy <= ry) || (ry >= 0 && dy >= ry))
      ) {
        if ((touchBulge < 0 && bulge <= touchBulge) || (touchBulge >= 0 && bulge >= touchBulge))
          result = 0;
        else {
          result = GMath.sqrSegmentDist(
            p1.getX(),
            p1.getY(),
            p2.getX(),
            p2.getY(),
            start.getX(),
            start.getY(),
          );
          if (
            (distance = GMath.sqrSegmentDist(
              p1.getX(),
              p1.getY(),
              p2.getX(),
              p2.getY(),
              end.getX(),
              end.getY(),
            )) < result
          )
            result = distance;
        }
      } else {
        result = this._getPtToArcSqrDist(start, bulge, center, radius, end, p1);
        if ((distance = this._getPtToArcSqrDist(start, bulge, center, radius, end, p2)) < result)
          result = distance;
      }
    } else {
      if (null == params[0]) {
        // No hit: the point of the circle nearest the line, if it's on the arc.
        const closest: (number | null)[] = [null];
        distance = GMath.sqrSegmentDist(
          p1.getX(),
          p1.getY(),
          p2.getX(),
          p2.getY(),
          center.getX(),
          center.getY(),
          closest as number[],
        );
        // The old code compared the array itself with 1, which compares
        // its only element.
        const t = closest[0] as number;
        if (t > 0 && t < 1) {
          const footX = p1.getX() + t * (p2.getX() - p1.getX());
          const footY = p1.getY() + t * (p2.getY() - p1.getY());
          const scale = radius / Math.sqrt(distance);
          const nearX = center.getX() + scale * (footX - center.getX());
          const nearY = center.getY() + scale * (footY - center.getY());
          const nearBulge = this._calculateBulge(
            start.getX(),
            start.getY(),
            nearX,
            nearY,
            center.getX(),
            center.getY(),
            bulge,
          );
          if ((nearBulge < 0 && bulge <= nearBulge) || (nearBulge >= 0 && bulge >= nearBulge))
            result = GMath.sqrSegmentDist(p1.getX(), p1.getY(), p2.getX(), p2.getY(), nearX, nearY);
        }
      }
      if (
        (distance = GMath.sqrSegmentDist(
          p1.getX(),
          p1.getY(),
          p2.getX(),
          p2.getY(),
          start.getX(),
          start.getY(),
        )) < result
      )
        result = distance;
      if (result > 0) {
        if (
          (distance = GMath.sqrSegmentDist(
            p1.getX(),
            p1.getY(),
            p2.getX(),
            p2.getY(),
            end.getX(),
            end.getY(),
          )) < result
        )
          result = distance;
        if (result > 0) {
          if ((distance = this._getPtToArcSqrDist(start, bulge, center, radius, end, p1)) < result)
            result = distance;
          if (
            result > 0 &&
            (distance = this._getPtToArcSqrDist(start, bulge, center, radius, end, p2)) < result
          )
            result = distance;
        }
      }
    }
    return result;
  }

  /** Squared distance of `point` from the arc. */
  _getPtToArcSqrDist(
    start: Point,
    bulge: number,
    center: Point,
    radius: number,
    end: Point,
    point: Point,
  ): number {
    let result: number;
    let sqDist = GMath.ptSqrDist(point.getX(), point.getY(), center.getX(), center.getY());
    if (GMath.isEqualEps(sqDist, 0)) result = radius * radius;
    else {
      const scale = radius / Math.sqrt(sqDist);
      const nearX = center.getX() + scale * (point.getX() - center.getX());
      const nearY = center.getY() + scale * (point.getY() - center.getY());
      const nearBulge = this._calculateBulge(
        start.getX(),
        start.getY(),
        nearX,
        nearY,
        center.getX(),
        center.getY(),
        bulge,
      );
      if ((nearBulge < 0 && bulge <= nearBulge) || (nearBulge >= 0 && bulge >= nearBulge))
        result = GMath.ptSqrDist(point.getX(), point.getY(), nearX, nearY);
      else {
        result = GMath.ptSqrDist(point.getX(), point.getY(), start.getX(), start.getY());
        if ((sqDist = GMath.ptSqrDist(point.getX(), point.getY(), end.getX(), end.getY())) < result)
          result = sqDist;
      }
    }
    return result;
  }

  /** Squared distance between two arcs, or maxDist^2 when they are further apart. */
  _getArcToArcSqrDist(
    a: PolySegment,
    aEnd: Point,
    b: PolySegment,
    bEnd: Point,
    maxDist: number,
  ): number {
    const ax = a.center.getX();
    const ay = a.center.getY();
    const bx = b.center.getX();
    const by = b.center.getY();
    const reach = a.radius + b.radius + maxDist;
    const maxSqDist = maxDist * maxDist;
    if (GMath.ptSqrDist(ax, ay, bx, by) > reach * reach) return maxSqDist;
    let bulge: number;
    let onA: boolean;
    let onB: boolean;
    let result: number | null = null;
    // Candidate points on each arc whose distance to the other arc counts.
    const candidatesA: Point[] = [a.point, aEnd];
    const candidatesB: Point[] = [b.point, bEnd];
    const crossings: (Point | null)[] = [null, null];
    GMath.circleCircleIntersection(ax, ay, a.radius, bx, by, b.radius, crossings as Point[]);
    for (let v = 0; v < 2 && null != crossings[v] && null === result; ++v) {
      const crossing = crossings[v] as Point;
      onA =
        ((bulge = this._calculateBulge(
          a.point.getX(),
          a.point.getY(),
          crossing.getX(),
          crossing.getY(),
          a.center.getX(),
          a.center.getY(),
          a.bulge,
        )) < 0 &&
          a.bulge <= bulge) ||
        (bulge >= 0 && a.bulge >= bulge);
      onB =
        ((bulge = this._calculateBulge(
          b.point.getX(),
          b.point.getY(),
          crossing.getX(),
          crossing.getY(),
          b.center.getX(),
          b.center.getY(),
          b.bulge,
        )) < 0 &&
          b.bulge <= bulge) ||
        (bulge >= 0 && b.bulge >= bulge);
      if (onA && onB) result = 0;
      else if (onA) candidatesA.push(crossing);
      else if (onB) candidatesB.push(crossing);
    }
    if (!(crossings[0] || (GMath.isEqualEps(ax, bx) && GMath.isEqualEps(ay, by)))) {
      // The points of each circle on the line between the centers.
      let x: number;
      let y: number;
      let dx = bx - ax;
      let dy = by - ay;
      let params: (number | null)[] = [null, null];
      GMath.circleLineIntersection(ax, ay, dx, dy, bx, by, b.radius, params as number[]);
      for (let v = 0; v < 2 && null != params[v]; ++v) {
        x = ax + dx * (params[v] as number);
        y = ay + dy * (params[v] as number);
        onB =
          ((bulge = this._calculateBulge(
            b.point.getX(),
            b.point.getY(),
            x,
            y,
            b.center.getX(),
            b.center.getY(),
            b.bulge,
          )) < 0 &&
            b.bulge <= bulge) ||
          (bulge >= 0 && b.bulge >= bulge);
        if (onB) candidatesB.push(new Point(x, y));
      }
      dx = -dx;
      dy = -dy;
      params = [null, null];
      GMath.circleLineIntersection(bx, by, dx, dy, ax, ay, a.radius, params as number[]);
      for (let v = 0; v < 2 && null != params[v]; ++v) {
        x = bx + dx * (params[v] as number);
        y = by + dy * (params[v] as number);
        onA =
          ((bulge = this._calculateBulge(
            a.point.getX(),
            a.point.getY(),
            x,
            y,
            a.center.getX(),
            a.center.getY(),
            a.bulge,
          )) < 0 &&
            a.bulge <= bulge) ||
          (bulge >= 0 && a.bulge >= bulge);
        if (onA) candidatesA.push(new Point(x, y));
      }
    }
    if (0 !== result) {
      let distance: number;
      let min = maxSqDist;
      for (let v = 0; v < candidatesA.length && min > 0; ++v) {
        if (
          (distance = this._getPtToArcSqrDist(
            b.point,
            b.bulge,
            b.center,
            b.radius,
            bEnd,
            candidatesA[v] as Point,
          )) < min
        )
          min = distance;
      }
      for (let v = 0; v < candidatesB.length && min > 0; ++v) {
        if (
          (distance = this._getPtToArcSqrDist(
            a.point,
            a.bulge,
            a.center,
            a.radius,
            aEnd,
            candidatesB[v] as Point,
          )) < min
        )
          min = distance;
      }
      result = min;
    }
    return result;
  }

  /** Rounds an output coordinate to the tolerance's decimal places. */
  _roundOut(value: number): number {
    return Math.round(value * this._tolRange) / this._tolRange;
  }

  /**
   * Builds the cap of an open path at `at` (the path's first or last
   * point) between the two offset ends, and links it in front of
   * (`atStart`) or after `target`. `neighbour` is the next point along
   * the path, used to orient a square cap.
   */
  _genCap(
    insetEnd: Point | null | undefined,
    outsetEnd: Point | null | undefined,
    at: Point,
    neighbour: Point | null,
    atStart: boolean,
    offset: number,
    target: OffsetPolyline,
    cap: string | null | undefined,
    tolerance: number,
  ): OffsetPolyline {
    void tolerance;
    const capSegments: OffsetPolyline = new PolySegmentContainer();
    neighbour = neighbour || at;
    const from = insetEnd || at.add(new Point(0, atStart ? -offset : offset));
    const to = outsetEnd || at.add(new Point(0, atStart ? offset : -offset));
    if (cap === LineCap.Square) {
      let towardsTo: Point;
      let towardsFrom: Point;
      const dirFrom = GMath.normalizePoint(from.subtract(at));
      const dirNeighbour = GMath.normalizePoint(neighbour.subtract(at));
      const left = new Point(dirFrom.getY(), -dirFrom.getX());
      const right = new Point(-dirFrom.getY(), dirFrom.getX());
      if (dirNeighbour.dot(left) > dirNeighbour.dot(right)) {
        towardsTo = new Point(-1, 1);
        towardsFrom = new Point(1, -1);
      } else {
        towardsTo = new Point(1, -1);
        towardsFrom = new Point(-1, 1);
      }
      let cornerFrom = at.subtract(from);
      cornerFrom = new Point(cornerFrom.getY(), cornerFrom.getX()).multiply(towardsFrom).add(from);
      let cornerTo = at.subtract(to);
      cornerTo = new Point(cornerTo.getY(), cornerTo.getX()).multiply(towardsTo).add(to);
      capSegments.insertSegment(new PolyOffsetSegment(at, from, cornerFrom, 0));
      capSegments.insertSegment(new PolyOffsetSegment(at, cornerFrom, cornerTo, 0));
      capSegments.insertSegment(new PolyOffsetSegment(at, cornerTo, to, 0));
    } else if (cap === LineCap.Butt) {
      capSegments.insertSegment(new PolyOffsetSegment(at, from, to, 0)).isCap = true;
    } else {
      // Round, also when no cap is given.
      capSegments.insertSegment(new PolyOffsetSegment(at, from, to, -1, at, offset));
    }
    if (atStart) target.prependContainer(capSegments);
    else target.appendContainer(capSegments);
    return capSegments;
  }

  /** Turns polylines into pieces of rounded Line and Curve2 vertices. */
  _genCurves(polylines: Polyline[], pieces: Piece[], tolerance: number): void {
    for (let o = 0; o < polylines.length; ++o) {
      const polyline = polylines[o] as Polyline;
      if (polyline.count > 0) {
        let segment = polyline.head;
        const vertices: Piece["vrt"] = [];
        const start = new Point(
          this._roundOut(segment.point.getX()),
          this._roundOut(segment.point.getY()),
        );
        let end = start;
        for (let c = 0; c < polyline.count - 1; ++c) {
          if (segment.bulge) {
            this._genBeziers(
              segment.point,
              segment.next.point,
              segment.bulge,
              segment.center,
              segment.radius,
              tolerance,
              vertices,
            );
            if (c == polyline.count - 2) {
              const last = vertices[vertices.length - 3] as Piece["vrt"][number];
              end = new Point(last.x, last.y);
            }
          } else {
            vertices.push({
              c: Vertex.Command.Line,
              x: this._roundOut(segment.next.point.getX()),
              y: this._roundOut(segment.next.point.getY()),
            });
            if (c == polyline.count - 2)
              end = new Point(
                this._roundOut(segment.next.point.getX()),
                this._roundOut(segment.next.point.getY()),
              );
          }
          segment = segment.next;
        }
        pieces.push({ stPt: start, endPt: end, vrt: vertices });
      }
    }
  }

  /**
   * Approximates the arc from `start` with `bulge` around `center` by
   * cubic curves, splitting it until each piece is within `tolerance`
   * (or into at most 64 pieces).
   */
  _genBeziers(
    start: Point,
    end: Point,
    bulge: number,
    center: Point,
    radius: number,
    tolerance: number,
    out: Piece["vrt"],
  ): void {
    void end;
    let angle = Math.abs(4 * Math.atan(bulge));
    let count = Math.ceil((2 * angle) / Math.PI);
    for (angle /= count; count <= 32 && this._getCubicBezierArcError(angle, radius) > tolerance;) {
      angle /= 2;
      count *= 2;
    }
    if (bulge > 0) angle = -angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tanSq = (1 - cos) / (1 + cos);
    const handle = (radius * sin * (Math.sqrt(4 + 3 * tanSq) - 1)) / 3;
    let ux = (start.getX() - center.getX()) / radius;
    let uy = (start.getY() - center.getY()) / radius;
    let x = start.getX();
    let y = start.getY();
    for (let i = 0; i < count; ++i) {
      const previousUx = ux;
      const previousUy = uy;
      ux = previousUx * cos - previousUy * sin;
      uy = previousUy * cos + previousUx * sin;
      const control1X = x - handle * previousUy;
      const control1Y = y + handle * previousUx;
      x = center.getX() + radius * ux;
      const control2X = x + handle * uy;
      y = center.getY() + radius * uy;
      const control2Y = y - handle * ux;
      out.push({ c: Vertex.Command.Curve2, x: this._roundOut(x), y: this._roundOut(y) });
      out.push({
        c: Vertex.Command.Curve2,
        x: this._roundOut(control1X),
        y: this._roundOut(control1Y),
      });
      out.push({
        c: Vertex.Command.Curve2,
        x: this._roundOut(control2X),
        y: this._roundOut(control2Y),
      });
    }
  }

  /** Estimated error of a cubic approximating an arc of `angle` (fitted constants). */
  _getCubicBezierArcError(angle: number, radius: number): number {
    const scale = 5.15347174 * radius;
    const cos = Math.cos(angle);
    const cosSq = cos * cos;
    const cos2 = 2 * cosSq - 1;
    const cos3 = (4 * cosSq - 3) * cos;
    const c0 = 22979e-8 * cos - 19.65763511 + 42715e-8 * cos2 + 0.00103256 * cos3;
    const c1 = 9.92683097 + 45907e-8 * cos + 0.00174813 * cos2 - 34153e-8 * cos3;
    return scale * Math.exp(c0 + c1 * angle);
  }

  _rewindVertices(): void {
    const pieces = this._pieces as VertexContainer[];
    for (let i = 0; i < pieces.length; ++i) (pieces[i] as VertexContainer).rewindVertices(0);
  }

  /** Reads from the current piece, moving on to the next one once. */
  _readVertex(vertex: Vertex): boolean {
    const pieces = this._pieces as VertexContainer[];
    if (pieces[this._pieceIdx] && (pieces[this._pieceIdx] as VertexContainer).readVertex(vertex))
      return true;
    ++this._pieceIdx;
    const next = pieces[this._pieceIdx];
    return !!next && next.readVertex(vertex);
  }

  override toString(): string {
    return "[Object GVertexOffsetter]";
  }
}
