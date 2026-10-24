// Old: chunk.vendor.js module 87 (GVertexSource).
/**
 * Something vertices can be read from: rewind to an index, then read one
 * vertex at a time. The old GVertexSource was a plain class (not a
 * GObject) used both as a base class (GVertexTransformer) and as a mixin
 * (GVertexContainer, GPath, ...), so both exist here with the same
 * members:
 *
 *     class VertexTransformer extends VertexSource { ... }
 *     class VertexContainer extends VertexSourceMixin(Object) { ... }
 */
import { defineMixin, registerClass, type AnyConstructor } from "../core/object.ts";
import { GMath } from "../math/math.ts";
import { Vertex } from "./vertex.ts";

/** The reading side of a vertex source; what most consumers need. */
export interface VertexReader {
  rewindVertices(index?: number): boolean;
  readVertex(vertex: Vertex): boolean;
  hasVertexForRead(): boolean;
}

function vertexSourceMembers<TBase extends AnyConstructor>(Base: TBase) {
  abstract class VertexSourceMembers extends Base implements VertexReader {
    /** Moves the read position to `index`; false if that's not possible. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature, overridden by every real source
    rewindVertices(index?: number): boolean {
      return false;
    }

    /** Reads the next vertex into `vertex`; false at the end. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature, overridden by every real source
    readVertex(vertex: Vertex): boolean {
      return false;
    }

    hasVertexForRead(): boolean {
      return false;
    }

    /**
     * Whether the first sub-path runs clockwise (in screen coordinates,
     * y down). Sums the turning angles between consecutive points,
     * control points included; a sum <= 0 counts as clockwise, so a
     * source with fewer than three points is clockwise.
     */
    isClockWise(): boolean {
      this.rewindVertices(0);
      let turn = 0;
      let vertex = new Vertex();
      const points: Vertex[] = [];
      read: while (this.readVertex(vertex)) {
        switch (vertex.command) {
          case Vertex.Command.Move:
            if (points.length > 0) break read;
            points.push(vertex);
            break;
          case Vertex.Command.Line:
            points.push(vertex);
            break;
          case Vertex.Command.Curve: {
            const control = new Vertex();
            this.readVertex(control);
            points.push(control);
            points.push(vertex);
            break;
          }
          case Vertex.Command.Curve2: {
            const control1 = new Vertex();
            this.readVertex(control1);
            const control2 = new Vertex();
            this.readVertex(control2);
            points.push(control1);
            points.push(control2);
            points.push(vertex);
            break;
          }
          case Vertex.Command.Close:
            // Throws on a source that starts with Close, as the old code did.
            vertex.x = (points[0] as Vertex).x;
            vertex.y = (points[0] as Vertex).y;
            points.push(vertex);
            break read;
        }
        vertex = new Vertex();
      }
      let current = points[0] as Vertex;
      let next = points[1] as Vertex;
      for (let i = 2; i < points.length; i++) {
        const previous = current;
        current = next;
        next = points[i] as Vertex;
        let angle =
          Math.atan2(current.y - previous.y, current.x - previous.x) -
          Math.atan2(next.y - current.y, next.x - current.x);
        if (angle <= -Math.PI) angle = GMath.PI2 + angle;
        else if (angle > Math.PI) angle = -GMath.PI2 + angle;
        turn += angle;
      }
      return turn <= 0;
    }

    /**
     * The vertices as SVG path data (" M x y L x y Q ... C ... Z ").
     * `round` is applied to every coordinate that is a number. Vertices
     * with NaN coordinates are left out; a curve missing its control
     * points ends the output.
     */
    toSVGPath(round?: (value: number) => number): string {
      let out = "";
      const vertex = new Vertex();
      let truncated = false;
      this.rewindVertices(0);
      const valid = (v: Vertex): boolean => v && !isNaN(v.x) && !isNaN(v.y);
      const apply = (v: Vertex): Vertex => {
        if (valid(v) && round) {
          v.x = round(v.x);
          v.y = round(v.y);
        }
        return v;
      };
      while (!truncated && this.readVertex(vertex)) {
        apply(vertex);
        switch (vertex.command) {
          case Vertex.Command.Move:
            if (valid(vertex)) out += " M " + vertex.x + " " + vertex.y;
            break;
          case Vertex.Command.Line:
            if (valid(vertex)) out += " L " + vertex.x + " " + vertex.y;
            break;
          case Vertex.Command.Curve: {
            const control = new Vertex();
            if (this.readVertex(control)) {
              if (valid(vertex) && valid(control)) {
                apply(control);
                out += " Q " + control.x + " " + control.y + " " + vertex.x + " " + vertex.y;
              }
            } else {
              truncated = true;
            }
            break;
          }
          case Vertex.Command.Curve2: {
            const control1 = new Vertex();
            const control2 = new Vertex();
            if (this.readVertex(control1) && this.readVertex(control2)) {
              if (valid(vertex) && valid(control1) && valid(control2)) {
                apply(control1);
                apply(control2);
                out +=
                  " C " +
                  control1.x +
                  " " +
                  control1.y +
                  " " +
                  control2.x +
                  " " +
                  control2.y +
                  " " +
                  vertex.x +
                  " " +
                  vertex.y;
              }
            } else {
              truncated = true;
            }
            break;
          }
          case Vertex.Command.Close:
            out += " Z ";
        }
      }
      return out;
    }
  }
  return VertexSourceMembers;
}

export class VertexSource extends vertexSourceMembers(Object) {
  static {
    registerClass(this, "GVertexSource");
  }

  // Only the class has it: the old mixing skipped toString, so classes
  // that mix the members in keep their own.
  override toString(): string {
    return "[Object GVertexSource]";
  }
}

/** GVertexSource as a mixin: `class X extends VertexSourceMixin(Base)`. */
export const VertexSourceMixin = defineMixin(VertexSource, vertexSourceMembers);

/** Any object with the vertex source members (class or mixin). */
export type VertexSourceLike = InstanceType<ReturnType<typeof vertexSourceMembers>>;
