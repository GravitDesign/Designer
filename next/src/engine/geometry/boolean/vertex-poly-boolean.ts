// Old: chunk.vendor.js module 264 (GVertexPolyBoolean).
import { GMath } from "../../math/math.ts";
import { Vertex } from "../vertex.ts";
import { VertexContainer } from "../vertex-container.ts";
import type { VertexReader } from "../vertex-source.ts";
import type { IntersectionPoint } from "./intersection-point.ts";
import {
  AUTO,
  AUTO_MAX_PASSTHROUGH,
  INSIDE,
  OUTSIDE,
  PIP_CHECK_ODDEVEN,
  PIP_CHECK_WINDING,
  PolyLineExtended,
  type ExtendedIntersection,
} from "./poly-line-extended.ts";
import { PolyIntersector, type PolyLine } from "./poly-segments.ts";

/**
 * A node of the containment tree _mergeNonIntersecting builds over the
 * sub-paths of both polygons: each sub-path's parents are the smallest
 * sub-paths that contain it, the root holds the rest.
 */
export interface ContainmentNode {
  parents: ContainmentNode[];
  item: PolyLineExtended | null;
  isHole?: boolean | undefined;
  fromSource?: number | undefined;
  children: ContainmentNode[] | null;
  visited?: boolean;
  isIntersecting?: number[] | null | undefined;
  isRoot?: boolean;
  parent?: null;
}

/** The containment tree's root, with the helpers clip() walks it with. */
export interface ContainmentRoot extends ContainmentNode {
  traverse: ContainmentTraverse;
  unvisit: () => void;
}

/**
 * Depth-first walk that calls `visit` on the children before the node
 * and removes the first node `visit` accepts (its children move up to
 * its parents); true once one was removed.
 */
export type ContainmentTraverse = (
  node: ContainmentNode,
  visit: (node: ContainmentNode) => unknown,
  depth?: number,
) => boolean;

/**
 * Boolean operations (union, intersection, difference, xor) of two
 * vertex sources. Curves stay curves: the intersector splits them at the
 * intersections, and the result walks the two rings switching at each
 * intersection, keeping or dropping the sub-paths that don't intersect
 * by their containment.
 */
export class VertexPolyBoolean {
  static PolyLineExtended = PolyLineExtended;

  // The op numbers are saved: compound shape children store them as `bool`.
  static OR = 1;
  static XOR = 2;
  static AND = 3;
  static SUB = 4;
  static PIP_CHECK_ODDEVEN = PIP_CHECK_ODDEVEN;
  static PIP_CHECK_WINDING = PIP_CHECK_WINDING;
  static AUTO_MAX_PASSTHROUGH = AUTO_MAX_PASSTHROUGH;
  static AUTO = AUTO;
  static OUTSIDE = OUTSIDE;
  static INSIDE = INSIDE;

  pip_check_policy: number;
  common_segments_policy: number;
  _intersector: PolyIntersector;
  _lastUnprocessed: PolyLineExtended | null = null;
  _firstIntersect: PolyLineExtended | null = null;
  _initialized = false;
  sourceHead: PolyLineExtended | null = null;
  clipHead: PolyLineExtended | null = null;
  originalSource: VertexReader | null = null;
  didNotClip = false;
  _useIntersector: boolean | undefined;
  _blockIntersector: boolean | undefined;
  _numIntersections: number | boolean = false;
  _intersectsArray: (number[] | undefined)[] = [];
  hassHoles = false;

  /**
   * The first argument is ignored: the old constructor always set the
   * odd-even policy, so winding compound shapes clip odd-even too
   * (QUESTIONS.md). `useIntersector` computes curve intersections on the
   * curves (finer flattening); `blockIntersector` never does.
   */
  constructor(
    pipCheckPolicy?: number,
    commonSegmentsPolicy?: number,
    useIntersector?: boolean,
    blockIntersector?: boolean,
  ) {
    void pipCheckPolicy;
    this.pip_check_policy = VertexPolyBoolean.PIP_CHECK_ODDEVEN;
    this.common_segments_policy = commonSegmentsPolicy || VertexPolyBoolean.AUTO;
    this._intersector = new PolyIntersector(
      true,
      true,
      useIntersector,
      useIntersector ? 0.125 : 4,
      blockIntersector,
    );
    this._useIntersector = useIntersector;
    this._blockIntersector = blockIntersector;
  }

  /**
   * Joins sources into one container, inserting a Line back to the
   * sub-path start at each Close between sources. Kept from the old
   * code, which never returned the container and read an undefined
   * variable on the second Move (so that throws a ReferenceError).
   */
  static joinVertices(sources: VertexReader[]): void {
    const vertex = new Vertex();
    let target: VertexContainer | null = null;
    let first: Vertex | null = null;
    let last: Vertex | null = null;
    for (let n = 0; n < sources.length; n++) {
      const source = sources[n] as VertexReader;
      for (source.rewindVertices(0); source.readVertex(vertex);) {
        switch (vertex.command) {
          case Vertex.Command.Move:
            if (first) throw new ReferenceError("i is not defined");
            (first = new Vertex()).x = vertex.x;
            first.y = vertex.y;
            (target = new VertexContainer()).addVertex(Vertex.Command.Move, vertex.x, vertex.y);
            break;
          case Vertex.Command.Line:
            (last = new Vertex()).x = vertex.x;
            last.y = vertex.y;
            (target as VertexContainer).addVertex(Vertex.Command.Line, vertex.x, vertex.y);
            break;
          case Vertex.Command.Curve:
            (last = new Vertex()).x = vertex.x;
            last.y = vertex.y;
            (target as VertexContainer).addVertex(Vertex.Command.Curve, vertex.x, vertex.y);
            source.readVertex(vertex);
            (target as VertexContainer).addVertex(Vertex.Command.Curve, vertex.x, vertex.y);
            break;
          case Vertex.Command.Curve2:
            (last = new Vertex()).x = vertex.x;
            last.y = vertex.y;
            (target as VertexContainer).addVertex(Vertex.Command.Curve2, vertex.x, vertex.y);
            source.readVertex(vertex);
            (target as VertexContainer).addVertex(Vertex.Command.Curve2, vertex.x, vertex.y);
            source.readVertex(vertex);
            (target as VertexContainer).addVertex(Vertex.Command.Curve2, vertex.x, vertex.y);
            break;
          case Vertex.Command.Close:
            if (
              n < sources.length - 1 &&
              (last as Vertex).x !== (first as Vertex).x &&
              (last as Vertex).y !== (first as Vertex).y
            )
              (target as VertexContainer).addVertex(
                Vertex.Command.Line,
                (first as Vertex).x,
                (first as Vertex).y,
              );
        }
      }
    }
  }

  /**
   * Intersects the two sources and builds the rings to clip. False when
   * the rings come out broken (then clip() can't be used).
   */
  initializeSources(source: VertexReader, clip: VertexReader): boolean {
    const intersections = this._intersector.intersect(
      source,
      clip,
    ) as IntersectionPoint<PolyLine>[];
    this.originalSource = source;
    const firstPoly = this._intersector.getFirstPoly() as PolyLine;
    const secondPoly = this._intersector.getSecondPoly() as PolyLine;
    const nextIndex = firstPoly.markIndices();
    secondPoly.markIndices(nextIndex);
    intersections.sort((a, b) => a.pt.getX() - b.pt.getX() || a.pt.getY() - b.pt.getY());
    for (let a = intersections.length - 1; a > 0; a--) {
      const point = (intersections[a] as IntersectionPoint<PolyLine>).pt;
      const previous = (intersections[a - 1] as IntersectionPoint<PolyLine>).pt;
      if (
        point === previous ||
        (GMath.isEqualEps(point.getX(), previous.getX(), 1e-10) &&
          GMath.isEqualEps(point.getY(), previous.getY(), 1e-10))
      ) {
        const index0 = (intersections[a] as IntersectionPoint<PolyLine>).polySeg0.index;
        const index1 = (intersections[a] as IntersectionPoint<PolyLine>).polySeg1.index;
        const previousIndex0 = (intersections[a - 1] as IntersectionPoint<PolyLine>).polySeg0.index;
        const previousIndex1 = (intersections[a - 1] as IntersectionPoint<PolyLine>).polySeg1.index;
        if (index0 === previousIndex0 && index1 === previousIndex1) intersections.splice(a, 1);
      }
    }
    this._intersector.addIntersectionsToPolygon(intersections);
    const mixed = intersections as IntersectionPoint<PolyLine | PolyLineExtended>[];
    this.sourceHead = PolyLineExtended.fromPolyLine(firstPoly, mixed, 0);
    this.clipHead = PolyLineExtended.fromPolyLine(secondPoly, mixed, 1);
    if (!this.sourceHead || !this.clipHead) return false;
    this.sourceHead = PolyLineExtended.generatePrevCurveCurrCurve(this.sourceHead);
    this.clipHead = PolyLineExtended.generatePrevCurveCurrCurve(this.clipHead);
    if (!this.sourceHead || !this.clipHead) return false;
    // Every intersection points at extended nodes now (fromPolyLine
    // returned null otherwise).
    const extended = intersections as unknown as ExtendedIntersection[];
    this.sourceHead._fixCycles(this.clipHead);
    this.clipHead._fixCycles(this.sourceHead);
    PolyLineExtended.generateCorresponding(extended);
    if (!this.checkSanity(this.sourceHead)) return false;
    if (!this.checkSanity(this.clipHead)) return false;
    if (!this.checkSanity(null, extended)) return false;
    if (
      PolyLineExtended.disableBadIntersections(
        extended,
        this.common_segments_policy,
        this.pip_check_policy,
        0,
        1,
      )
    ) {
      this._numIntersections = 0;
      for (let a = 0; a < extended.length; a++)
        if ((extended[a] as ExtendedIntersection).polySeg0.isIsect) this._numIntersections++;
    }
    if (!this.clipHead || !this.sourceHead) return false;
    this._intersectsArray = this.getIntersectionArray(this.sourceHead, this.clipHead);
    this._initialized = true;
    return true;
  }

  numIntersections(): number | boolean {
    return this._numIntersections;
  }

  /**
   * Checks a ring's links (and curve data), or the intersections' nodes.
   * With `countIntersections` the ring must hold one intersection node
   * per entry of `intersections`.
   */
  checkSanity(
    ring: PolyLineExtended | null,
    intersections?: ExtendedIntersection[] | null,
    countIntersections?: boolean,
  ): boolean {
    let sane = true;
    if (intersections) {
      for (let r = 0; r < intersections.length; r++) {
        const isect = intersections[r] as ExtendedIntersection & { isLast?: boolean };
        const seg0: unknown = isect.polySeg0;
        const seg1: unknown = isect.polySeg1;
        if (!(seg0 && seg0 instanceof PolyLineExtended)) {
          sane = false;
          break;
        }
        if (!(seg1 && seg1 instanceof PolyLineExtended)) {
          sane = false;
          break;
        }
        if ((seg1.next as PolyLineExtended).prev !== seg1) {
          sane = false;
          break;
        }
        if ((seg0.next as PolyLineExtended).prev !== seg0) {
          sane = false;
          break;
        }
        if (isect.isLast) {
          sane = false;
          break;
        }
        if (seg0.currCurve && !seg0.nextCurve) {
          sane = false;
          break;
        }
        if (seg1.currCurve && !seg1.nextCurve) {
          sane = false;
          break;
        }
      }
    }
    if (ring) {
      const start = ring;
      let count = 0;
      let curveWalker = (ring.nextCurve || ring.next) as PolyLineExtended;
      let node = ring;
      if (start.currCurve && start.currCurve !== start) sane = false;
      else {
        do {
          const next = node.next as PolyLineExtended;
          const prev = node.prev as PolyLineExtended;
          if (next.prev !== node) {
            sane = false;
            break;
          }
          if (prev.next !== node) {
            sane = false;
            break;
          }
          if (node.nextCurve && (node.nextCurve.next as PolyLineExtended).prev !== node.nextCurve) {
            sane = false;
            break;
          }
          if (
            node.nextCurve &&
            (Number.isNaN(node.cx1) ||
              Number.isNaN(node.cx2) ||
              Number.isNaN(node.cy1) ||
              Number.isNaN(node.cy2))
          ) {
            sane = false;
            break;
          }
          if (Number.isNaN(node.x) || Number.isNaN(node.y)) {
            sane = false;
            break;
          }
          if ((void 0 !== node.cx1 || void 0 !== node.cy1) && !node.nextCurve) {
            sane = false;
            break;
          }
          if ((void 0 === node.cx1 || void 0 === node.cy1) && node.nextCurve) {
            sane = false;
            break;
          }
          if (node.currCurve && (!node.currCurve.nextCurve || !node.currCurve.prevCurve)) {
            sane = false;
            break;
          }
          if (node.nextCurve && (node.nextCurve.prev as PolyLineExtended).next !== node.nextCurve) {
            sane = false;
            break;
          }
          if (node.prevCurve && (node.prevCurve.next as PolyLineExtended).prev !== node.prevCurve) {
            sane = false;
            break;
          }
          if (node.prevCurve && (node.prevCurve.prev as PolyLineExtended).next !== node.prevCurve) {
            sane = false;
            break;
          }
          if (countIntersections && node.isIsect) count++;
          node = next;
          if (curveWalker !== start)
            curveWalker = (curveWalker.nextCurve || curveWalker.next) as PolyLineExtended;
        } while (node !== start);
        if (countIntersections && count !== (intersections as ExtendedIntersection[]).length)
          sane = false;
        if (curveWalker !== start && sane) sane = false;
      }
    }
    return sane;
  }

  /** For each sub-path index, the indices of the sub-paths it intersects. */
  getIntersectionArray(source: PolyLineExtended, clip: PolyLineExtended): (number[] | undefined)[] {
    const out: (number[] | undefined)[] = [];
    const nextIndex = source.markIndices();
    clip.markIndices(nextIndex);
    let node = source;
    do {
      if (node.isIsect) {
        const other = node.corresponding as PolyLineExtended;
        const index = node.currCurve ? node.currCurve.index : node.index;
        const otherIndex = other.currCurve ? other.currCurve.index : other.index;
        let list = out[index];
        if (!list) list = out[index] = [];
        let otherList = out[otherIndex];
        if (!otherList) otherList = out[otherIndex] = [];
        if (list.indexOf(otherIndex) < 0) list.push(otherIndex);
        if (otherList.indexOf(index) < 0) otherList.push(index);
      }
      node = node.next as PolyLineExtended;
    } while (node !== source);
    return out;
  }

  getFirstIntersect(ring: PolyLineExtended): PolyLineExtended {
    let node = this._firstIntersect || ring;
    do {
      if (node.isIsect && !node.visited) break;
      node = node.next as PolyLineExtended;
    } while (node !== ring);
    this._firstIntersect = node;
    return node;
  }

  hasUnprocessed(ring: PolyLineExtended): boolean {
    let node = this._lastUnprocessed || ring;
    do {
      if (node.isIsect && !node.visited) {
        this._lastUnprocessed = node;
        return true;
      }
      node = node.next as PolyLineExtended;
    } while (node !== ring);
    this._lastUnprocessed = null;
    return false;
  }

  unvisit(ring: PolyLineExtended): void {
    let node = ring;
    do {
      if (node.isIsect && node.visited) {
        node.visited = false;
        if (node.corresponding) node.corresponding.visited = false;
      }
      node = node.next as PolyLineExtended;
    } while (node !== ring);
    this._lastUnprocessed = null;
  }

  union(): VertexContainer[] | null {
    return this.clip(false, false);
  }

  intersection(): VertexContainer[] | null {
    return this.clip(true, true);
  }

  diff(): VertexContainer[] | null {
    return this.clip(false, true);
  }

  /** Union minus intersection, through a second boolean. */
  xor(): (VertexContainer | VertexReader)[] | null {
    const united = this.union();
    if (!united) return null;
    this.unvisit(this.sourceHead as PolyLineExtended);
    this.unvisit(this.clipHead as PolyLineExtended);
    const common = this.intersection();
    if (!common) return null;
    const second = new VertexPolyBoolean(
      this.pip_check_policy,
      this.common_segments_policy,
      this._useIntersector,
      this._blockIntersector,
    );
    const unitedSource = united.length > 1 ? VertexContainer.mergeVertexSources(united) : united[0];
    const commonSource =
      common.length > 1 ? VertexContainer.mergeVertexSources(common, null) : common[0];
    return unitedSource
      ? commonSource
        ? second.initializeSources(unitedSource, commonSource)
          ? second.diff()
          : null
        : [unitedSource]
      : [];
  }

  /** Runs op (OR, XOR, AND or SUB); any other op gives the source back. */
  clipOp(op: number): (VertexContainer | VertexReader | null)[] | null {
    switch (op) {
      case VertexPolyBoolean.AND:
        return this.intersection();
      case VertexPolyBoolean.XOR:
        return this.xor();
      case VertexPolyBoolean.OR:
        return this.union();
      case VertexPolyBoolean.SUB:
        return this.diff();
    }
    return [this.originalSource];
  }

  /**
   * Whether the sub-path at `start` lies inside `other`, judged at its
   * first point that is neither an intersection nor on `other`
   * (`useIntersections` falls back to the first intersection's
   * prevInside). -1 when undecided; found[0] gets the point used.
   */
  determineInside(
    start: PolyLineExtended,
    other: PolyLineExtended,
    found: PolyLineExtended[],
    unused: unknown,
    useIntersections?: boolean,
  ): number {
    void unused;
    let node = start;
    const first = start;
    do {
      if (!node.corresponding && !other.hasPoint(node)) {
        found[0] = node;
        return other.isInside(node, this.pip_check_policy) > 0 ? 1 : 0;
      }
      node = (node.nextCurve || node.next) as PolyLineExtended;
    } while (node !== first);
    if (useIntersections) {
      do {
        if (node.corresponding) {
          found[0] = node;
          return node.prevInside ? 1 : 0;
        }
        node = (node.nextCurve || node.next) as PolyLineExtended;
      } while (node !== first);
    }
    found[0] = first;
    return -1;
  }

  /**
   * The boolean of the two rings. `insidePrev`/`insideNext` pick which
   * stretches to follow: (false, false) union, (true, true)
   * intersection, (false, true) difference. Returns one merged source
   * (or a single one), plus the sub-paths that don't intersect and
   * survive the containment rules.
   */
  clip(insidePrev: boolean, insideNext: boolean): VertexContainer[] | null {
    if (!this._initialized) return null;
    const source = this.sourceHead as PolyLineExtended;
    const clipRing = this.clipHead as PolyLineExtended;
    const isDiff = !insidePrev && insideNext;
    const isUnion = !insidePrev && !insideNext;
    const sourceLines = source.getSimplePolyLines();
    const clipLines = clipRing.getSimplePolyLines();
    const tree = this._mergeNonIntersecting(sourceLines, clipLines, isUnion, isDiff);
    const kept: number[] = [];
    const dropped: number[] = [];
    tree.children?.forEach((child) => {
      if (!child.visited)
        tree.traverse(child, (node) => {
          kept.push((node.item as PolyLineExtended).index);
          return false;
        });
    });
    for (let p = sourceLines.length + clipLines.length, u = 0; u < p; u++)
      if (kept.indexOf(u) < 0) dropped.push(u);
    this._lastUnprocessed = null;
    this._firstIntersect = null;
    this.didNotClip = false;
    let cx1: number | undefined;
    let cy1: number | undefined;
    let cx2: number | undefined;
    let cy2: number | undefined;
    let x: number;
    let y: number;
    let forward: boolean | undefined;
    const results: PolyLineExtended[] = [];
    const used: number[] = [];
    let onSource = true;
    while (this.hasUnprocessed(source)) {
      let node = this.getFirstIntersect(source);
      const ring = new PolyLineExtended();
      do {
        node.visit();
        if (node.isIsect)
          forward = onSource
            ? insidePrev
              ? !node.prevInside
              : !node.nextInside
            : insideNext
              ? !node.prevInside
              : !node.nextInside;
        if (forward) {
          do {
            if (node.nextCurve) {
              cx1 = node.cx1;
              cx2 = node.cx2;
              cy1 = node.cy1;
              cy2 = node.cy2;
            } else cx1 = cx2 = cy1 = cy2 = void 0;
            if (dropped.indexOf(node.index) < 0)
              ring.appendPoint(node.x, node.y, cx1, cy1, cx2, cy2);
            if (used.indexOf(node.index) < 0) used.push(node.index);
            if (node.isLast) {
              // (The old code warned "loop had no intersections???".)
              if (node.visited) break;
              node.visited = true;
              node = node._firstInLoop();
            } else node = (node.nextCurve || node.next) as PolyLineExtended;
          } while (!node.isIsect);
        } else {
          do {
            const prev = node.prev as PolyLineExtended;
            if (prev.currCurve) {
              x = node.x;
              y = node.y;
              cx1 = (node = prev.currCurve).cx1;
              cx2 = node.cx2;
              cy1 = node.cy1;
              cy2 = node.cy2;
            } else {
              x = node.x;
              y = node.y;
              cx1 = cx2 = cy1 = cy2 = void 0;
              if (prev.isLast) {
                // (The old code warned "Loop had no intersections???".)
                if ((node = node._lastInLoop()).visited) break;
                node.visited = true;
              } else node = prev;
            }
            // Walking backwards, so the control points swap.
            if (dropped.indexOf(node.index) < 0) ring.appendPoint(x, y, cx2, cy2, cx1, cy1);
            if (used.indexOf(node.index) < 0) used.push(node.index);
          } while (!node.isIsect);
        }
        onSource = !onSource;
        const corresponding = node.corresponding;
        if (!corresponding) break;
        node = corresponding;
      } while (!node.visited);
      results.push(ring);
    }
    if (0 === results.length) this.didNotClip = true;
    this.hassHoles = sourceLines.concat(clipLines).some((line) => line.isHole);
    let out = results
      .concat(
        sourceLines.filter(
          (line) => used.indexOf(line.index) < 0 && dropped.indexOf(line.index) < 0,
        ),
      )
      .concat(
        clipLines.filter((line) => used.indexOf(line.index) < 0 && dropped.indexOf(line.index) < 0),
      )
      .map((line) => line.getPoints(false));
    if (out.length > 1) out = [VertexContainer.mergeVertexSources(out)];
    return out;
  }

  /**
   * Builds the containment tree of the sub-paths of both polygons and
   * removes (with the op's rule) the sub-paths that don't intersect and
   * don't belong in the result. `isUnion`/`isDiff` pick the rule; the
   * intersection rule otherwise.
   */
  _mergeNonIntersecting(
    sourceLines: PolyLineExtended[],
    clipLines: PolyLineExtended[],
    isUnion: boolean,
    isDiff: boolean,
  ): ContainmentRoot {
    const sourceContainment = this._getContainment(sourceLines);
    const clipContainment = this._getContainment(clipLines);
    // A sub-path is a hole when an odd number of others contain it.
    const isHole = (containment: PolyLineExtended[][], line: PolyLineExtended): boolean => {
      let hole = false;
      for (let r = 0; r < containment.length; r++)
        if ((containment[r] as PolyLineExtended[]).indexOf(line) >= 0) hole = !hole;
      return hole;
    };
    const intersects = this._intersectsArray;
    sourceLines.forEach((line) => {
      line.fromSource = 1;
      line.isHole = isHole(sourceContainment, line);
      line.isIntersecting = intersects[line.index] || null;
    });
    clipLines.forEach((line) => {
      line.fromSource = 0;
      line.isHole = isHole(clipContainment, line);
      line.isIntersecting = intersects[line.index] || null;
      if (isDiff) line.isHole = !line.isHole;
    });
    const all = sourceLines.concat(clipLines);
    // Containment within one polygon is known already; across them it's tested.
    const known: (boolean | undefined)[][] = new Array(all.length);
    for (let A = 0; A < all.length; A++) {
      const row: (boolean | undefined)[] = (known[A] = new Array(all.length));
      for (let c = 0; c < all.length; c++) {
        if (A < sourceLines.length && c < sourceLines.length)
          row[c] =
            (
              sourceContainment[(sourceLines[c] as PolyLineExtended).tmpIdx] as PolyLineExtended[]
            ).indexOf(sourceLines[A] as PolyLineExtended) >= 0;
        else if (A >= sourceLines.length && c >= sourceLines.length)
          row[c] =
            (
              clipContainment[
                (clipLines[c - sourceLines.length] as PolyLineExtended).tmpIdx
              ] as PolyLineExtended[]
            ).indexOf(clipLines[A - sourceLines.length] as PolyLineExtended) >= 0;
        else row[c] = void 0;
      }
    }
    const containment = this._getContainment(all, known);
    const root = {
      children: [] as ContainmentNode[],
      parents: [] as ContainmentNode[],
      item: null,
      traverse: null as ContainmentTraverse | null,
      unvisit: null as (() => void) | null,
      isRoot: true,
    } as ContainmentNode & {
      traverse: ContainmentTraverse | null;
      unvisit: (() => void) | null;
    };
    const lines = all.slice();
    const nodes: ContainmentNode[] = [];
    lines.forEach((line) => {
      nodes.push({
        parents: [],
        item: line,
        isHole: line.isHole,
        fromSource: line.fromSource,
        children: [],
        visited: false,
        isIntersecting: line.isIntersecting,
      });
    });
    nodes.forEach((node) => {
      // The smallest containers: the ones holding the fewest sub-paths.
      const containers = ((line: PolyLineExtended): PolyLineExtended[] | number[] => {
        let indices: number[] = [];
        let fewest = Number.POSITIVE_INFINITY;
        for (let n = 0; n < containment.length; n++) {
          const inside = containment[n] as PolyLineExtended[];
          if (inside.indexOf(line) >= 0) {
            if (fewest > inside.length) {
              fewest = inside.length;
              indices = [n];
            } else if (fewest === inside.length) indices.push(n);
          }
        }
        if (0 === indices.length) return indices;
        const found: PolyLineExtended[] = [];
        for (let n = 0; n < all.length; n++)
          if (indices.indexOf((all[n] as PolyLineExtended).tmpIdx) >= 0)
            found.push(all[n] as PolyLineExtended);
        return found;
      })(node.item as PolyLineExtended);
      const parents = (containers as PolyLineExtended[]).map((line) => {
        let parent: ContainmentNode | undefined;
        nodes.some((candidate) => candidate.item === line && ((parent = candidate), true));
        return parent as ContainmentNode;
      });
      if (parents.length) node.parents = parents;
      else {
        node.parents = [root];
        (root.children as ContainmentNode[]).push(node);
      }
    });
    nodes.forEach((node) => {
      nodes.forEach((other) => {
        if (other !== node && other.parents.indexOf(node) >= 0)
          (node.children as ContainmentNode[]).push(other);
      });
    });
    // Moves a node's children to its parents and takes it out of the tree.
    const remove = (node: ContainmentNode): void => {
      const parents = node.parents;
      if (parents.length)
        parents.forEach((parent) => {
          const children = parent.children as ContainmentNode[];
          children.splice(children.indexOf(node), 1);
        });
      (node.children as ContainmentNode[]).forEach((child) => {
        child.parents.splice(child.parents.indexOf(node), 1);
        parents.forEach((parent) => {
          if (child.parents.indexOf(parent) < 0) child.parents.push(parent);
          (parent.children as ContainmentNode[]).push(child);
        });
      });
      node.children = null;
      node.parent = null;
    };
    const traverse: ContainmentTraverse = (node, visit, depth) => {
      if (depth) {
        if (depth > 512) return false;
      } else depth = 1;
      if (!node.children) node.children = [];
      for (let n = 0; n < node.children.length; n++) {
        const child = node.children[n] as ContainmentNode;
        if (!child.visited && traverse(child, visit, ++depth)) return true;
      }
      node.visited = true;
      if (!node.item || !visit(node)) return false;
      remove(node);
      return true;
    };
    const unvisitAll = (): void => {
      nodes.forEach((node) => {
        node.visited = false;
      });
    };
    const children = (node: ContainmentNode): ContainmentNode[] =>
      node.children as ContainmentNode[];
    let rule: (node: ContainmentNode) => boolean | undefined;
    if (isUnion) {
      rule = (node) => {
        if ((node.fromSource as number) < 0) return false;
        if (null !== node.isIntersecting) return false;
        if (node.isHole)
          for (let t = 0; t < children(node).length; t++)
            if ((children(node)[t] as ContainmentNode).isHole) {
              (children(node)[t] as ContainmentNode).fromSource = -1;
              return true;
            }
        return (
          (!node.isHole && node.parents.some((parent) => parent.item && !parent.isHole)) ||
          (!!node.isHole &&
            node.parents.some(
              (parent) => parent.item && !parent.isHole && node.fromSource !== parent.fromSource,
            )) ||
          (!!node.isHole && node.parents.some((parent) => !parent.item))
        );
      };
    } else if (isDiff) {
      rule = (node) => {
        if ((node.fromSource as number) < 0) return false;
        if (null !== node.isIntersecting) return false;
        let holeSource: number | undefined;
        if (
          node.parents.some(
            (parent) =>
              !(!parent.isHole || node.fromSource === parent.fromSource) &&
              ((holeSource = parent.fromSource), true),
          )
        ) {
          for (let i = 0; i < children(node).length; i++)
            if ((children(node)[i] as ContainmentNode).fromSource === holeSource)
              (children(node)[i] as ContainmentNode).fromSource = -1;
          return true;
        }
        return !!node.isHole && node.parents.some((parent) => !parent.item);
      };
    } else {
      rule = (node) => {
        if (!((node.fromSource as number) < 0)) {
          if (null !== node.isIntersecting) return false;
          if (!node.isHole)
            for (let t = 0; t < children(node).length; t++) {
              const child = children(node)[t] as ContainmentNode;
              if (!child.isHole && child.fromSource !== node.fromSource) {
                child.fromSource = -1;
                return true;
              }
            }
          return (
            !!node.parents.some(
              (parent) => parent.isRoot || (parent.isHole && node.fromSource !== parent.fromSource),
            ) ||
            (!!node.isHole && node.parents.some((parent) => !parent.item))
          );
        }
        return undefined;
      };
    }
    while (traverse(root, rule)) unvisitAll();
    unvisitAll();
    root.unvisit = unvisitAll;
    root.traverse = traverse;
    return root as ContainmentRoot;
  }

  /**
   * For each line, the lines inside it (by the index the line gets in
   * tmpIdx). Pairs that intersect are skipped; `known` gives containment
   * already known (undefined: test it). Sorts `lines` in place by how
   * many lines each contains.
   */
  _getContainment(
    lines: PolyLineExtended[],
    known?: (boolean | undefined)[][],
  ): PolyLineExtended[][] {
    // Whether `line` contains `other`. A point on an intersection of
    // `other` decides by its inside flags when they agree.
    const contains = (line: PolyLineExtended, other: PolyLineExtended): number => {
      let decider = other;
      if (!other.corresponding) {
        let node = other;
        const start = other;
        const coordsEqual = (
          point: PolyLineExtended,
          a: "x" | "y" | "cx1" | "cx2",
          b: "x" | "y" | "cx1" | "cx2",
          c: "x" | "y" | "cy1" | "cy2",
          d: "x" | "y" | "cy1" | "cy2",
        ): boolean =>
          GMath.isEqualEps(point[a] as number, point[b] as number, 1e-10) &&
          GMath.isEqualEps(point[c] as number, point[d] as number, 1e-10);
        // Same position, with control points (if any) on it.
        const samePoint = (a: PolyLineExtended, b: PolyLineExtended): boolean =>
          !!(
            GMath.isEqualEps(a.x, b.x, 1e-10) &&
            GMath.isEqualEps(a.y, b.y, 1e-10) &&
            ((void 0 === a.cx1 && void 0 === a.cy1) || coordsEqual(a, "x", "cx1", "y", "cy1")) &&
            ((void 0 === a.cx2 && void 0 === a.cy2) || coordsEqual(a, "x", "cx2", "y", "cy2"))
          ) &&
          (!b.corresponding || !!b);
        let previous = node;
        do {
          if (!samePoint(previous, (node = node.next as PolyLineExtended))) break;
          if (node.corresponding) {
            decider = node;
            break;
          }
          previous = node;
        } while (node && node !== start);
        if (!decider.corresponding) {
          previous = node = other;
          do {
            if (!samePoint((node = node.prev as PolyLineExtended), previous)) break;
            if (node.corresponding) {
              decider = node;
              break;
            }
            previous = node;
          } while (node && node !== start);
        }
      }
      return decider.corresponding
        ? decider.prevInside !== decider.nextInside
          ? line.isInsideBezier(other)
          : decider.prevInside
        : line.isInsideBezier(other);
    };
    const inside: PolyLineExtended[][] = Array(lines.length) as PolyLineExtended[][];
    for (let r = 0; r < lines.length; r++) {
      inside[r] = [];
      (lines[r] as PolyLineExtended).tmpIdx = r;
    }
    const list = (i: number): PolyLineExtended[] => inside[i] as PolyLineExtended[];
    if (known) {
      for (let r = 0; r < lines.length; r++) {
        const line = lines[r] as PolyLineExtended;
        for (let a = 0; a < r; a++) {
          const other = lines[a] as PolyLineExtended;
          const crossing = this._intersectsArray[line.index];
          if (crossing && crossing.indexOf(other.index) >= 0) continue;
          let value: boolean | undefined;
          if (
            (void 0 === (value = (known[a] as (boolean | undefined)[])[r]) &&
              contains(line, other)) ||
            (void 0 !== value && value)
          )
            list(r).push(other);
          if (
            (void 0 === (value = (known[r] as (boolean | undefined)[])[a]) &&
              contains(other, line)) ||
            (void 0 !== value && value)
          )
            list(a).push(line);
        }
      }
    } else {
      for (let r = 0; r < lines.length; r++) {
        const line = lines[r] as PolyLineExtended;
        for (let a = 0; a < r; a++) {
          const other = lines[a] as PolyLineExtended;
          const crossing = this._intersectsArray[line.index];
          if (!(crossing && crossing.indexOf(other.index) >= 0)) {
            if (contains(line, other)) list(r).push(other);
            else if (contains(other, line)) list(a).push(line);
          }
        }
      }
    }
    lines.sort((a, b) => list(a.tmpIdx).length - list(b.tmpIdx).length);
    return inside;
  }
}
