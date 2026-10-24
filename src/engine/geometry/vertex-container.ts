// Old: chunk.vendor.js module 54 (GVertexContainer).
import type { Transform } from "../math/transform.ts";
import { Vertex } from "./vertex.ts";
import { VertexSourceMixin, type VertexReader } from "./vertex-source.ts";
import { VertexTargetMixin } from "./vertex-target.ts";
import { VertexTransformer } from "./vertex-transformer.ts";

/**
 * The old code had a global DEBUG flag in mind for its diagnostics
 * (`DEBUG && console.log(...)`), but the app never defines it, so reaching
 * one of those lines throws a ReferenceError instead of returning null.
 * The port keeps that; see QUESTIONS.md "Kept crashes in the vertex
 * helpers (getPathLength, GVertexContainer.clone, QuadTree.clear)".
 */
function debugFlagMissing(): never {
  throw new ReferenceError("DEBUG is not defined");
}

/**
 * A vertex source backed by an array: the general-purpose vertex list.
 *
 * The old class mixed GVertexSource and GVertexTarget into a plain
 * function, so it is neither a GObject (no hasMixin method, no type id)
 * nor an instance of VertexSource.
 */
export class VertexContainer extends VertexTargetMixin(VertexSourceMixin(Object)) {
  /** The vertices of `source` as a flat [command, x, y, ...] list. */
  static serialize(source: VertexReader): number[] {
    const out: number[] = [];
    if (source.rewindVertices(0)) {
      const vertex = new Vertex();
      while (source.readVertex(vertex)) out.push(vertex.command, vertex.x, vertex.y);
    }
    return out;
  }

  static deserialize(data: readonly number[]): VertexContainer {
    const container = new VertexContainer();
    for (let i = 0; i < data.length; i += 3) {
      container.addVertex(data[i] as number, data[i + 1] as number, data[i + 2] as number);
    }
    return container;
  }

  /**
   * Splits a source into one container per Move. Vertices before the
   * first Move are dropped. A source with a single sub-path is returned
   * as it is (in a one-element list), unless a transform is given.
   */
  static splitVertexSource(
    source: VertexReader,
    transform?: Transform | null,
  ): (VertexReader | VertexContainer)[] {
    let current: VertexContainer | undefined;
    let parts: (VertexReader | VertexContainer)[] = [];
    const vertex = new Vertex();
    if (transform) source = new VertexTransformer(source, transform);
    source.rewindVertices(0);
    while (source.readVertex(vertex)) {
      if (vertex.command === Vertex.Command.Move) parts.push((current = new VertexContainer()));
      if (current) current.addVertex(vertex.command, vertex.x, vertex.y);
    }
    if (parts.length === 1 && !transform) parts = [source];
    return parts;
  }

  /**
   * One container with the vertices of all `sources`, each mapped through
   * `transform` when given. Anything that isn't an array is returned as
   * it is.
   */
  static mergeVertexSources(
    sources: readonly (VertexReader | null)[],
    transform?: Transform | null,
  ): VertexContainer;
  static mergeVertexSources<T>(sources: T, transform?: Transform | null): T | VertexContainer;
  static mergeVertexSources<T>(sources: T, transform?: Transform | null): T | VertexContainer {
    if (!(sources instanceof Array)) return sources;
    const list = sources as VertexReader[];
    const count = list.length;
    const merged = new VertexContainer();
    if (transform) {
      for (let i = 0; i < count; i++) {
        merged.appendVertices(new VertexTransformer(list[i] as VertexReader, transform));
      }
    } else {
      for (let i = 0; i < count; i++) merged.appendVertices(list[i] as VertexReader);
    }
    return merged;
  }

  /**
   * Reverses every sub-path that isn't clockwise (every sub-path with
   * `force`) and merges the result into one container.
   */
  static makeClockWise(source: VertexReader, force?: boolean): VertexContainer {
    const parts = VertexContainer.splitVertexSource(source);
    const result: (VertexReader | VertexContainer | null)[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as VertexReader & { isClockWise(): boolean };
      if (force || !part.isClockWise()) result.push(VertexContainer.clone(part, true));
      else result.push(part);
    }
    return VertexContainer.mergeVertexSources(result) as VertexContainer;
  }

  /**
   * Copies a source into a new container, optionally reversed. Reversing
   * moves each segment's command to the segment that now ends at its old
   * start point, swaps curve control points and keeps each sub-path
   * closed or open. Returns null where the old code logged a broken path
   * (see debugFlagMissing: in practice those cases throw).
   */
  static clone(source: VertexReader, reverse?: boolean): VertexContainer | null {
    let vertex = new Vertex();
    let previous: Vertex | null = null;
    source.rewindVertices(0);
    const list: Vertex[] = [];
    let inserted: Vertex;
    // Shared with the loops below, as the old function-scoped variable was.
    let i: number;
    while (source.readVertex(vertex)) {
      if (reverse) {
        if (vertex.command === Vertex.Command.Move) {
          if (previous && previous.command === Vertex.Command.Close) {
            // The sub-path before this Move was closed: put a Close right
            // after its Move, so it ends up at the end once reversed.
            for (i = list.length - 1; i >= 0; i--) {
              if ((list[i] as Vertex).command === Vertex.Command.Move) {
                list.splice(i + 1, 0, (inserted = new Vertex()));
                inserted.command = Vertex.Command.Close;
                break;
              }
            }
            if (i < 0) {
              list.unshift((inserted = new Vertex()));
              inserted.command = Vertex.Command.Close;
            }
            const last = list[list.length - 1] as Vertex;
            if (last.command === Vertex.Command.Close) last.command = Vertex.Command.Move;
          }
        } else if (previous) {
          list.push((inserted = new Vertex()));
          inserted.command = vertex.command;
          inserted.x = previous.x;
          inserted.y = previous.y;
        } else if (vertex.command !== Vertex.Command.Move) {
          throw new Error("Path doesn't start with moveTo!");
        }
      } else {
        list.push((inserted = new Vertex()));
        inserted.command = vertex.command;
        inserted.x = vertex.x;
        inserted.y = vertex.y;
      }
      previous = vertex;
      vertex = new Vertex();
    }
    if (reverse) {
      if (previous) {
        let last: Vertex;
        if (previous.command === Vertex.Command.Close) {
          for (i = list.length - 1; i >= 0; i--) {
            if ((list[i] as Vertex).command === Vertex.Command.Move) {
              list.splice(i + 1, 0, (inserted = new Vertex()));
              inserted.command = Vertex.Command.Close;
              break;
            }
          }
          if (i < 0) {
            list.unshift((inserted = new Vertex()));
            inserted.command = Vertex.Command.Close;
          }
          last = list[list.length - 1] as Vertex;
        } else {
          list.push((last = new Vertex()));
          last.x = previous.x;
          last.y = previous.y;
        }
        last.command = Vertex.Command.Move;
      }
      list.reverse();
    }
    const result = new VertexContainer();
    if (reverse) {
      // Throws on an empty source, as the old code did.
      let entry = list[0] as Vertex;
      if (entry.command !== Vertex.Command.Move) debugFlagMissing();
      result.addVertex(entry.command, entry.x, entry.y);
      for (i = 0; i < list.length - 1; i++) {
        // The vertex already written for list[i]: curves were written as
        // end point first, so step back over their control points.
        entry = list[i] as Vertex;
        entry = (
          entry.command == Vertex.Command.Curve2
            ? result._vertices[i - 2]
            : entry.command == Vertex.Command.Curve
              ? result._vertices[i - 1]
              : result._vertices[i]
        ) as Vertex;
        const startX = entry.x;
        const startY = entry.y;
        const next = i < list.length - 1 ? list[i + 1] : null;
        if (next && next.command == Vertex.Command.Curve2) {
          const control1 = list[i + 1];
          const control2 = list[i + 2];
          const end = list[i + 3];
          if (!(control1 && control2 && end)) debugFlagMissing();
          entry.x = control2.x;
          entry.y = control2.y;
          result.addVertex(next.command, end.x, end.y);
          result.addVertex(next.command, startX, startY);
          result.addVertex(next.command, control1.x, control1.y);
          i += 2;
        } else if (next && next.command == Vertex.Command.Curve) {
          const control = list[i + 1];
          const end = list[i + 2];
          if (!control || !end) debugFlagMissing();
          entry.x = control.x;
          entry.y = control.y;
          result.addVertex(next.command, end.x, end.y);
          result.addVertex(next.command, startX, startY);
          i += 1;
        } else if (next) {
          result.addVertex(next.command, next.x, next.y);
        }
      }
    } else {
      for (i = 0; i < list.length; i++) {
        const entry = list[i] as Vertex;
        result.addVertex(entry.command, entry.x, entry.y);
      }
    }
    if (result.getCount() !== list.length) debugFlagMissing();
    return result;
  }

  // Fields are declared and initialised in the constructor: the old
  // constructor filled the list before anything else ran.
  declare _vertices: Vertex[];
  declare _index: number;

  /** A container with a copy of `source`'s vertices, or an empty one. */
  constructor(source?: VertexReader | null) {
    super();
    this._index = 0;
    this._vertices = [];
    if (source && source.rewindVertices(0)) {
      const vertex = new Vertex();
      while (source.readVertex(vertex)) this.addVertex(vertex.command, vertex.x, vertex.y);
    }
  }

  /**
   * Appends a vertex, mapped through `transform` when given. Moves the
   * read position past the end, so reading needs a rewind first.
   */
  override addVertex(command: number, x: number, y: number, transform?: Transform | null): void {
    const vertex = new Vertex();
    vertex.command = command;
    vertex.x = x;
    vertex.y = y;
    if (transform) VertexTransformer.transformVertex(vertex, transform);
    this._vertices.push(vertex);
    this._index = this._vertices.length + 1;
  }

  /** Empties the list; the read position stays where it was. */
  override clearVertices(): void {
    this._vertices = [];
  }

  getCount(): number {
    return this._vertices.length;
  }

  override rewindVertices(index?: number): boolean {
    index = index || 0;
    if (index >= 0 && index <= this._vertices.length) {
      this._index = index;
      return true;
    }
    return false;
  }

  override readVertex(vertex: Vertex): boolean {
    if (this._index >= 0 && this._index < this._vertices.length) {
      const stored = this._vertices[this._index] as Vertex;
      vertex.command = stored.command;
      vertex.x = stored.x;
      vertex.y = stored.y;
      this._index++;
      return true;
    }
    return false;
  }

  override hasVertexForRead(): boolean {
    return this._index >= 0 && this._index < this._vertices.length;
  }

  override toString(): string {
    return "[Object GVertexContainer]";
  }
}
