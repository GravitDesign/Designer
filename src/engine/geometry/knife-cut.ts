// Old: chunk.vendor.js module 1079 (no G name; the knife tool's cutter).
import { GMath } from "../math/math.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import type { VertexReader } from "./vertex-source.ts";

/**
 * A path the knife works on. The old code read the vertex count of a
 * GPath's own vertex list (`_vertices`) to check that breaking it apart
 * lost no vertices.
 */
export interface KnifeCutPath extends VertexReader {
  _vertices: { getCount(): number };
}

/** An anchor point inserted at an intersection (a GPathBase.AnchorPoint). */
export interface KnifeCutAnchor {
  getProperty(name: "x" | "y"): unknown;
}

/** A linked list of intersection positions. */
interface IsectNode {
  x: number;
  y: number;
  next: IsectNode | null;
}

interface PointLike {
  x: number;
  y: number;
}

/** A path being assembled for one side, with its current ends. */
interface FitEntry {
  startPoint: Vertex;
  endPoint: Vertex;
  path: VertexContainer;
}

/** Same position within 0.05, or the same object. */
function samePoint(a: PointLike, b: PointLike): boolean {
  return a === b || !(!GMath.isEqualEps(a.x, b.x, 0.05) || !GMath.isEqualEps(a.y, b.y, 0.05));
}

/** The end point of the last segment (the end vertex of a trailing curve). */
function lastPoint(container: VertexContainer): Vertex {
  const count = container.getCount();
  const vertex = new Vertex();
  container.rewindVertices(count - 1);
  container.readVertex(vertex);
  if (vertex.command === Vertex.Command.Curve) {
    container.rewindVertices(count - 2);
    container.readVertex(vertex);
  } else if (vertex.command === Vertex.Command.Curve2) {
    container.rewindVertices(count - 3);
    container.readVertex(vertex);
  }
  return vertex;
}

function firstPoint(container: VertexContainer): Vertex {
  const vertex = new Vertex();
  container.rewindVertices(0);
  container.readVertex(vertex);
  return vertex;
}

/**
 * Cuts paths along a cutter path (the knife tool): breaks both apart at
 * their intersection points, then sorts the pieces into the two sides of
 * the cutter (and a third group for pieces on neither side), closing the
 * pieces of closed paths with parts of the cutter.
 */
export class KnifeCut {
  /** performCut's result when nothing was cut. */
  static UNCHANGED = 1 as const;
  /** Closed paths may be cut at an odd number of points. */
  static ALLOW_ODD_CLOSED = true;

  cutterSource: KnifeCutPath;
  isectsCutter: IsectNode | null = null;
  isectsCut: IsectNode | null = null;
  isClosed = false;

  constructor(cutterSource: KnifeCutPath) {
    this.cutterSource = cutterSource;
  }

  /**
   * Cuts `paths` (null entries are skipped) at `cutAnchors` with the
   * cutter, whose intersection anchors are `cutterAnchors`. Returns the
   * pieces per side ([side 0, side 1, neither]), UNCHANGED, or null when
   * the cut fails. `fit` (default: `isClosed`) closes the pieces with
   * cutter parts; `alternateParts` makes closing use every other cutter
   * part (the old even-odd handling).
   */
  performCut(
    paths: (KnifeCutPath | null)[],
    cutAnchors: (KnifeCutAnchor | null | undefined)[],
    cutterAnchors: (KnifeCutAnchor | null | undefined)[],
    isClosed: boolean,
    cutterSource?: KnifeCutPath | null,
    fit?: boolean,
    alternateParts?: boolean,
  ): VertexContainer[][] | typeof KnifeCut.UNCHANGED | null {
    let cutterList: IsectNode | null = null;
    let cutList: IsectNode | null = null;
    if (cutterSource) this.cutterSource = cutterSource;
    if (
      (isClosed &&
        ((KnifeCut.ALLOW_ODD_CLOSED && 0 === cutAnchors.length) ||
          (!KnifeCut.ALLOW_ODD_CLOSED && cutAnchors.length % 2 != 0))) ||
      0 == cutterAnchors.length ||
      (!isClosed && (0 === cutAnchors.length || 0 === cutterAnchors.length))
    )
      return KnifeCut.UNCHANGED;
    // Only as many cut anchors as cutter anchors are used.
    for (let i = 0; i < cutterAnchors.length; i++) {
      let anchor = cutterAnchors[i];
      if (!anchor) return null;
      cutterList = {
        x: anchor.getProperty("x") as number,
        y: anchor.getProperty("y") as number,
        next: cutterList,
      };
      if ((anchor = cutAnchors[i]))
        cutList = {
          x: anchor.getProperty("x") as number,
          y: anchor.getProperty("y") as number,
          next: cutList,
        };
    }
    this.isectsCutter = cutterList;
    this.isectsCut = cutList;
    this.isClosed = isClosed;
    const cutterParts: VertexContainer[] = [];
    const cutterWasCut = this._breakApart(this.cutterSource, isClosed, cutterParts);
    let total = 0;
    let count = cutterParts.length;
    if (0 === count || !cutterWasCut) return null;
    for (let i = 0; i < count; i++) total += (cutterParts[i] as VertexContainer).getCount();
    // Every part but the first starts with an added Move.
    if (total - (count - 1) != this.cutterSource._vertices.getCount()) return null;
    let pieces: VertexContainer[] = [];
    const closeDelta = isClosed ? -1 : 0;
    let anyCut = false;
    for (let i = paths.length - 1; i >= 0; i--) {
      const path = paths[i];
      if (path) {
        const parts: VertexContainer[] = [];
        anyCut = this._breakApart(path, false, parts) || anyCut;
        pieces = pieces.concat(parts);
        count = parts.length;
        total = 0;
        for (let j = 0; j < count; j++) total += (parts[j] as VertexContainer).getCount();
        if (total - (count - 1) != path._vertices.getCount() + closeDelta) return null;
      }
    }
    if (1 == pieces.length && !anyCut) return KnifeCut.UNCHANGED;
    if (void 0 === fit) fit = isClosed;
    const sides = pieces as (VertexContainer | null)[];
    if (fit) {
      if (!this._fitVertices(sides, cutterParts, alternateParts)) return null;
    } else if (!this._distributeSides(sides, cutterParts)) return null;
    // Both replaced the pieces with the three side lists.
    return sides as unknown as VertexContainer[][];
  }

  /**
   * Which side of the cutter `uncut` (a path it didn't cross) lies on,
   * judged against the line from the cutter's first point to its last:
   * 0 or 1, or 2 when it can't be told.
   */
  checkSideOfUncut(cutter: VertexReader, uncut: VertexReader): number {
    let startX: number | null = null;
    let startY: number | null = null;
    let endX: number | null = null;
    let endY: number | null = null;
    if (cutter.rewindVertices(0)) {
      for (const vertex = new Vertex(); cutter.readVertex(vertex);) {
        switch (vertex.command) {
          case Vertex.Command.Move:
            startX = vertex.x;
            startY = vertex.y;
            break;
          case Vertex.Command.Line:
            endX = vertex.x;
            endY = vertex.y;
            break;
          case Vertex.Command.Curve:
            endX = vertex.x;
            endY = vertex.y;
            cutter.readVertex(vertex);
            break;
          case Vertex.Command.Curve2:
            endX = vertex.x;
            endY = vertex.y;
            if (cutter.readVertex(vertex)) cutter.readVertex(vertex);
            break;
          case Vertex.Command.Close:
            break;
          default:
            throw new Error("Unknown vertex command: " + vertex.command.toString());
        }
      }
    }
    let side = 2;
    if (null !== startX && null !== endX) {
      const line = new VertexContainer();
      line.addVertex(Vertex.Command.Move, startX, startY as number);
      line.addVertex(Vertex.Command.Line, endX, endY as number);
      side = this._getSide(line, uncut, null, 0);
    }
    return side;
  }

  /** Whether every entry's paths end at its point. (Unused by the old code.) */
  _checkEnds(
    entries: { path0?: VertexContainer | null; path1?: VertexContainer | null; pt: PointLike }[],
  ): boolean {
    for (let t = entries.length - 1; t >= 0; t--) {
      const entry = entries[t] as (typeof entries)[number];
      if (entry.path0 && !samePoint(lastPoint(entry.path0), entry.pt)) return false;
      if (entry.path1 && !samePoint(firstPoint(entry.path1), entry.pt)) return false;
    }
    return true;
  }

  /** Whether `vertex` is (within 0.05) one of the intersections in `list`. */
  _vertexHasIsect(vertex: PointLike, list: IsectNode | null): boolean {
    if (!list) return false;
    let node: IsectNode | null = list;
    do {
      if (
        (vertex.x === node.x || GMath.isEqualEps(vertex.x, node.x, 0.05)) &&
        (vertex.y === node.y || GMath.isEqualEps(vertex.y, node.y, 0.05))
      )
        return true;
    } while ((node = node.next));
    return false;
  }

  /**
   * The coordinates of the first segment (`which` 0) or the last one
   * (`which` 1) of the first sub-path: 4, 6 or 8 numbers for a line, a
   * quadratic or a cubic curve.
   */
  _getSegment(source: VertexReader, which: number): number[] {
    let coords: number[] = [];
    let vertex = new Vertex();
    let previous: Vertex | null = null;
    let reading = true;
    for (source.rewindVertices(0); reading && source.readVertex(vertex);) {
      if (1 === which) coords = [];
      switch (vertex.command) {
        case Vertex.Command.Move:
          previous = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Line:
          if (previous) {
            coords.push(previous.x, previous.y);
            coords.push(vertex.x, vertex.y);
          }
          previous = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Curve:
          if (previous) {
            const control = new Vertex();
            if (source.readVertex(control)) {
              coords.push(previous.x, previous.y);
              coords.push(control.x, control.y);
              coords.push(vertex.x, vertex.y);
            }
          }
          previous = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Curve2:
          if (previous) {
            const control1 = new Vertex();
            const control2 = new Vertex();
            if (source.readVertex(control1) && source.readVertex(control2)) {
              coords.push(previous.x, previous.y);
              coords.push(control1.x, control1.y);
              coords.push(control2.x, control2.y);
              coords.push(vertex.x, vertex.y);
            }
          }
          previous = vertex;
          vertex = new Vertex();
          break;
        case Vertex.Command.Close:
          reading = false;
      }
      if (0 === which && coords.length) break;
    }
    return coords;
  }

  /**
   * Which side of a segment of `a` a point of `b` lies on: 0 (right), 1
   * (left) or 2 (on it, or no segment). `mode` bit 1 picks the last
   * segment of `a` (else the first), bit 0 the start point of the last
   * segment of `b` (else the end of the first). `reverse` flips `a`'s
   * segment.
   */
  _getSide(
    a: VertexReader,
    b: VertexReader,
    unused: unknown,
    mode: number,
    reverse?: boolean,
  ): number {
    void unused;
    let line: number[] | undefined;
    let point: number[] | undefined;
    const fromEndA = mode >> 1;
    const fromEndB = 1 & mode;
    const segA = this._getSegment(a, mode >> 1);
    const segB = this._getSegment(b, 1 & mode);
    if (0 == segA.length || 0 == segB.length) return 2;
    const at = (list: number[], i: number): number => list[i] as number;
    if (1 == fromEndA) {
      // The last segment's final chord.
      if (4 == segA.length) line = [at(segA, 0), at(segA, 1), at(segA, 2), at(segA, 3)];
      else if (6 == segA.length) line = [at(segA, 2), at(segA, 3), at(segA, 4), at(segA, 5)];
      else if (8 == segA.length) line = [at(segA, 4), at(segA, 5), at(segA, 6), at(segA, 7)];
    } else line = [at(segA, 0), at(segA, 1), at(segA, 2), at(segA, 3)];
    if (0 == fromEndB) {
      if (4 == segB.length || 6 == segB.length || 8 == segB.length)
        point = [at(segB, 2), at(segB, 3)];
    } else if (4 == segB.length) point = [at(segB, 0), at(segB, 1)];
    else if (6 == segB.length) point = [at(segB, 2), at(segB, 3)];
    else if (8 == segB.length) point = [at(segB, 4), at(segB, 5)];
    // Throws when a segment had an unexpected size, as the old code did.
    const l = line as number[];
    const p = point as number[];
    const side = reverse
      ? GMath.segmentSide(at(l, 2), at(l, 3), at(l, 0), at(l, 1), at(p, 0), at(p, 1))
      : GMath.segmentSide(at(l, 0), at(l, 1), at(l, 2), at(l, 3), at(p, 0), at(p, 1));
    return 0 == side ? 2 : 1 == side ? 0 : 1;
  }

  /** Adds a Close unless the container already ends with one. */
  _closePath(container: VertexContainer): VertexContainer {
    if (0 === container.getCount()) return container;
    container.rewindVertices(container.getCount() - 1);
    const vertex = new Vertex();
    container.readVertex(vertex);
    if (vertex.command !== Vertex.Command.Close) container.addVertex(Vertex.Command.Close, 0, 0);
    return container;
  }

  /** Appends `other` without its first vertex (its Move) to `target`. */
  _appendVertices(target: VertexContainer, other: VertexContainer): void {
    const joined = new VertexContainer();
    joined.appendVertices(target);
    joined.appendVertices(other, 1);
    target.clearVertices();
    target.appendVertices(joined);
  }

  /** Puts `other` in front of `target`, dropping `target`'s Move. */
  _prependVertices(target: VertexContainer, other: VertexContainer): void {
    const joined = new VertexContainer();
    joined.appendVertices(other);
    joined.appendVertices(target, 1);
    target.clearVertices();
    target.appendVertices(joined);
  }

  /** Drops Moves to the point the previous vertex ended at. */
  _correctMoveTo(container: VertexContainer): void {
    let vertex = new Vertex();
    let previous: Vertex | null = null;
    container.rewindVertices(0);
    const result = new VertexContainer();
    while (container.readVertex(vertex)) {
      if (!(
        vertex.command === Vertex.Command.Move &&
        previous &&
        GMath.isEqualEps(vertex.x, previous.x) &&
        GMath.isEqualEps(vertex.y, previous.y)
      ))
        result.addVertex(vertex.command, vertex.x, vertex.y);
      previous = vertex;
      vertex = new Vertex();
    }
    container.clearVertices();
    container.appendVertices(result);
  }

  _cloneV(vertex: Vertex): Vertex {
    const copy = new Vertex();
    copy.x = vertex.x;
    copy.y = vertex.y;
    copy.command = vertex.command;
    return copy;
  }

  /**
   * Splits the first sub-path of `source` into `out` at the vertices
   * that are intersections (cut intersections, and with `isCutter` the
   * cutter's). Returns whether it was split. A closed cut path's last
   * part is joined with its first.
   */
  _breakApart(source: VertexReader, isCutter: boolean, out: VertexContainer[]): boolean {
    let onCut: boolean;
    // Stays undefined for a path that isn't the cutter.
    let onCutter: boolean | undefined;
    const vertex = new Vertex();
    const control2 = new Vertex();
    let reading = true;
    let part = new VertexContainer();
    out.length = 0;
    out.push(part);
    let split = false;
    for (source.rewindVertices(0); reading && source.readVertex(vertex);) {
      switch (vertex.command) {
        case Vertex.Command.Move:
          onCut = this._vertexHasIsect(vertex, this.isectsCut);
          if (isCutter) onCutter = this._vertexHasIsect(vertex, this.isectsCutter);
          if (part.getCount() || onCut || onCutter) {
            // Without an intersection this pushes the same part again.
            if (onCut || onCutter) part = new VertexContainer();
            out.push(part);
            split = true;
          }
          part.addVertex(vertex.command, vertex.x, vertex.y);
          break;
        case Vertex.Command.Line:
          part.addVertex(vertex.command, vertex.x, vertex.y);
          onCut = this._vertexHasIsect(vertex, this.isectsCut);
          if (isCutter) onCutter = this._vertexHasIsect(vertex, this.isectsCutter);
          if (onCut || onCutter) {
            (part = new VertexContainer()).addVertex(Vertex.Command.Move, vertex.x, vertex.y);
            out.push(part);
            split = true;
          }
          break;
        case Vertex.Command.Curve: {
          const end = { command: vertex.command, x: vertex.x, y: vertex.y };
          if (source.readVertex(vertex)) {
            part.addVertex(end.command, end.x, end.y);
            part.addVertex(vertex.command, vertex.x, vertex.y);
            onCut = this._vertexHasIsect(end, this.isectsCut);
            if (isCutter) onCutter = this._vertexHasIsect(end, this.isectsCutter);
            if (onCut || onCutter) {
              part = new VertexContainer();
              out.push(part);
              part.addVertex(Vertex.Command.Move, end.x, end.y);
              split = true;
            }
          }
          break;
        }
        case Vertex.Command.Curve2: {
          const end = { command: vertex.command, x: vertex.x, y: vertex.y };
          if (source.readVertex(vertex) && source.readVertex(control2)) {
            part.addVertex(end.command, end.x, end.y);
            part.addVertex(vertex.command, vertex.x, vertex.y);
            part.addVertex(control2.command, control2.x, control2.y);
            onCut = this._vertexHasIsect(end, this.isectsCut);
            if (isCutter) onCutter = this._vertexHasIsect(end, this.isectsCutter);
            if (onCut || onCutter) {
              part = new VertexContainer();
              out.push(part);
              part.addVertex(Vertex.Command.Move, end.x, end.y);
              split = true;
            }
          }
          break;
        }
        case Vertex.Command.Close:
          reading = false;
          break;
        default:
          throw new Error("Unknown vertex command: " + vertex.command.toString());
      }
    }
    if (!(out[0] as VertexContainer).getCount()) out.shift();
    if (this.isClosed && !isCutter && out.length > 1) {
      this._appendVertices(out[out.length - 1] as VertexContainer, out[0] as VertexContainer);
      out.shift();
    }
    return split;
  }

  /** Sorts the pieces by the side of the cutter part they touch (no closing). */
  _distributeSides(pieces: (VertexContainer | null)[], cutterParts: VertexContainer[]): boolean {
    const sides: VertexContainer[][] = [[], [], []];
    const pieceCount = pieces.length;
    const partCount = cutterParts.length;
    const push = (side: number, piece: VertexContainer | null): void => {
      (sides[side] as (VertexContainer | null)[]).push(piece);
    };
    for (let i = pieceCount - 1; i >= 0; i--) {
      const piece = pieces[i] as VertexContainer;
      const pieceStart = firstPoint(piece);
      const pieceEnd = lastPoint(piece);
      let found = false;
      for (let d = partCount - 1; d >= 0; d--) {
        const part = cutterParts[d] as VertexContainer;
        if (part.getCount()) {
          const partStart = firstPoint(part);
          const partEnd = lastPoint(part);
          const isLast = d === partCount - 1;
          const isFirst = 0 === d;
          if (samePoint(partEnd, pieceStart)) {
            push(this._getSide(part, piece, null, 2), piece);
            found = true;
            break;
          }
          if (samePoint(partStart, pieceEnd)) {
            push(this._getSide(part, piece, null, 1), piece);
            found = true;
            break;
          }
          if (isLast && samePoint(partEnd, pieceEnd)) {
            push(this._getSide(part, piece, null, 3), VertexContainer.clone(piece, true));
            found = true;
            break;
          }
          if (isFirst && samePoint(partStart, pieceStart)) {
            push(this._getSide(part, piece, null, 0), VertexContainer.clone(piece, true));
            found = true;
            break;
          }
        }
      }
      if (!found) return false;
    }
    pieces.splice(0, pieces.length);
    (pieces as unknown[]).push(sides[0], sides[1], sides[2]);
    return true;
  }

  /**
   * Closes the pieces of a closed path with the cutter parts on each
   * side, joins what fits together and replaces `pieces` with the three
   * side lists of closed containers.
   */
  _fitVertices(
    pieces: (VertexContainer | null)[],
    cutterParts: VertexContainer[],
    alternateParts?: boolean,
  ): boolean {
    const sides: (FitEntry | null | undefined)[][] = [[], [], []];
    const pieceCount = pieces.length;
    let parts = cutterParts;
    let partCount = parts.length;
    let step = alternateParts ? 1 : 2;
    // Function-scoped in the old code; the fill-in loop below reads the
    // values the main loops left behind.
    let part: VertexContainer = null as unknown as VertexContainer;
    let partStart: Vertex = null as unknown as Vertex;
    let partEnd: Vertex = null as unknown as Vertex;
    let entry: FitEntry | null | undefined;
    let u: number;
    if (1 == step && partCount > 3) {
      // Join the inner cutter parts into one and add every other one again.
      const joined = VertexContainer.clone(cutterParts[1] as VertexContainer) as VertexContainer;
      for (u = 2; u < partCount - 1; u += 1) {
        part = VertexContainer.clone(cutterParts[u] as VertexContainer) as VertexContainer;
        this._appendVertices(joined, part);
      }
      parts = [joined];
      for (u = 2; u < partCount - 1; u += 2)
        parts.push(VertexContainer.clone(cutterParts[u] as VertexContainer) as VertexContainer);
    } else step = 2;
    partCount = parts.length;
    const first = 1 == step ? 0 : 1;
    for (let side = 0; side < 2; ++side) {
      for (u = first; u < partCount; u += step) {
        part = parts[u] as VertexContainer;
        partStart = firstPoint(part);
        partEnd = lastPoint(part);
        for (let b = pieceCount - 1; b >= 0; b--) {
          const piece = pieces[b];
          if (piece) {
            const pieceStart = firstPoint(piece);
            const pieceEnd = lastPoint(piece);
            let used = false;
            let path: VertexContainer;
            let copy: VertexContainer;
            const row = sides[side] as (FitEntry | null | undefined)[];
            if (samePoint(partStart, pieceStart) && this._getSide(part, piece, null, 0) == side) {
              used = true;
              copy = VertexContainer.clone(piece, true) as VertexContainer;
              if ((entry = row[u])) {
                path = entry.path;
                if (!samePoint(firstPoint(path), partStart)) {
                  console.log("second source to same path?");
                  return false;
                }
              } else path = VertexContainer.clone(part) as VertexContainer;
              this._prependVertices(path, copy);
              partStart = pieceEnd;
              row[u] = { startPoint: pieceEnd, endPoint: lastPoint(path), path };
            } else if (
              samePoint(partStart, pieceEnd) &&
              this._getSide(part, piece, null, 1) == side
            ) {
              used = true;
              copy = VertexContainer.clone(piece) as VertexContainer;
              if ((entry = row[u])) {
                path = entry.path;
                if (!samePoint(firstPoint(path), partStart)) {
                  console.log("second source to same path?");
                  return false;
                }
              } else path = VertexContainer.clone(part) as VertexContainer;
              this._prependVertices(path, copy);
              partStart = pieceStart;
              row[u] = { startPoint: pieceStart, endPoint: lastPoint(path), path };
            } else if (
              samePoint(partEnd, pieceStart) &&
              this._getSide(part, piece, null, 2) == side
            ) {
              used = true;
              copy = VertexContainer.clone(piece) as VertexContainer;
              if ((entry = row[u])) {
                path = entry.path;
                if (!samePoint(lastPoint(path), partEnd)) {
                  console.log("second source to same path?");
                  return false;
                }
              } else path = VertexContainer.clone(part) as VertexContainer;
              this._appendVertices(path, copy);
              partEnd = pieceEnd;
              row[u] = { startPoint: firstPoint(path), endPoint: pieceEnd, path };
            } else if (
              samePoint(partEnd, pieceEnd) &&
              this._getSide(part, piece, null, 3) == side
            ) {
              used = true;
              copy = VertexContainer.clone(piece, true) as VertexContainer;
              if ((entry = row[u])) {
                path = entry.path;
                if (!samePoint(lastPoint(path), partEnd)) {
                  console.log("second source to same path?");
                  return false;
                }
              } else path = VertexContainer.clone(part) as VertexContainer;
              this._appendVertices(path, copy);
              partEnd = pieceStart;
              row[u] = { startPoint: firstPoint(path), endPoint: pieceStart, path };
            }
            if (used) pieces[b] = null;
          }
        }
      }
    }
    // Cutter parts that closed nothing on either side go to both, unless
    // they are in the third group. (The ends and the path come from the
    // last part the loops above looked at, not from part u.)
    for (u = 1; u < partCount; u += 2) {
      if (!(sides[2] as (FitEntry | null | undefined)[])[u]) {
        const row0 = sides[0] as (FitEntry | null | undefined)[];
        const row1 = sides[1] as (FitEntry | null | undefined)[];
        if (!row0[u])
          row0[u] = {
            startPoint: partStart,
            endPoint: partEnd,
            path: VertexContainer.clone(part) as VertexContainer,
          };
        if (!row1[u])
          row1[u] = {
            startPoint: partStart,
            endPoint: partEnd,
            path: VertexContainer.clone(part) as VertexContainer,
          };
      }
    }
    // Join the paths of a side whose ends meet.
    for (let side = 0; side < 3; side++) {
      const row = sides[side] as (FitEntry | null | undefined)[];
      const length = row.length;
      for (let b = 0; b < length; b++) {
        if (!row[b]) continue;
        for (let t = b + 1; t < length; t++) {
          const current = row[b];
          const other = row[t];
          if (!other || !current) continue;
          let reversed: VertexContainer | null;
          if (current.path === other.path) continue;
          if (samePoint(current.startPoint, other.startPoint)) {
            if (!(reversed = VertexContainer.clone(other.path, true))) return false;
            this._prependVertices(current.path, reversed);
            current.startPoint = other.endPoint;
            row[t] = null;
          } else if (samePoint(current.endPoint, other.endPoint)) {
            if (!(reversed = VertexContainer.clone(other.path, true))) return false;
            this._appendVertices(current.path, reversed);
            current.endPoint = other.startPoint;
            row[t] = null;
          } else if (samePoint(current.startPoint, other.endPoint)) {
            if (!(reversed = VertexContainer.clone(other.path, false))) return false;
            this._prependVertices(current.path, reversed);
            current.startPoint = other.startPoint;
            row[t] = null;
          } else if (samePoint(current.endPoint, other.startPoint)) {
            if (!(reversed = VertexContainer.clone(other.path, false))) return false;
            this._appendVertices(current.path, reversed);
            current.endPoint = other.endPoint;
            row[t] = null;
          }
        }
      }
    }
    pieces.splice(0, pieces.length);
    const result = pieces as unknown as VertexContainer[][];
    for (let side = 0; side < 3; side++) {
      const row = sides[side] as (FitEntry | null | undefined)[];
      const closed: VertexContainer[] = [];
      for (let b = 0; b < row.length; b++) {
        const fitted = row[b];
        if (fitted && fitted.path && fitted.path.getCount() > 2)
          closed.push(this._closePath(fitted.path));
      }
      result.push(closed);
    }
    for (u = result.length - 1; u >= 0; u--) {
      const side = result[u] as VertexContainer[];
      for (let b = side.length - 1; b >= 0; b--) this._correctMoveTo(side[b] as VertexContainer);
    }
    return true;
  }
}
